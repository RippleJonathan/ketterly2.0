import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Google Solar API types
interface GoogleSolarResponse {
  solarPotential?: {
    wholeRoofStats?: {
      areaMeters2?: number
      groundAreaMeters2?: number
    }
    buildingStats?: {
      areaMeters2?: number
      groundAreaMeters2?: number
    }
    roofSegmentStats?: Array<{
      pitchDegrees?: number
      azimuthDegrees?: number
      center?: {
        latitude?: number
        longitude?: number
      }
      boundingBox?: {
        sw?: { latitude?: number; longitude?: number }
        ne?: { latitude?: number; longitude?: number }
      }
      stats?: {
        areaMeters2?: number
        groundAreaMeters2?: number
      }
    }>
  }
  imageryDate?: {
    year?: number
    month?: number
    day?: number
  }
  boundingBox?: {
    sw?: { latitude?: number; longitude?: number }
    ne?: { latitude?: number; longitude?: number }
  }
}

interface RoofMeasurement {
  actual_squares: number
  roof_pitch: string
  roof_pitch_degrees: number
  roof_complexity: 'simple' | 'moderate' | 'complex'
  roof_data_raw: GoogleSolarResponse
  satellite_data_date: string | null
  measurement_source: 'google_solar'
}

/**
 * POST /api/measurements/auto-measure
 * 
 * Fetches roof data from Google Solar API and saves measurements
 * Automatically geocodes address if coordinates not provided
 * 
 * Body:
 * {
 *   leadId: string
 *   companyId: string
 *   address?: string (required if latitude/longitude not provided)
 *   latitude?: number
 *   longitude?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { leadId, companyId, latitude, longitude, address } = body

    // Validate required fields
    if (!leadId || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, companyId' },
        { status: 400 }
      )
    }

    // If coordinates not provided, geocode the address
    if ((latitude === undefined || longitude === undefined) && address) {
      console.log('Geocoding address:', address)
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Google Maps API key not configured' },
          { status: 500 }
        )
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      const geocodeResponse = await fetch(geocodeUrl)
      const geocodeData = await geocodeResponse.json()

      if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
        return NextResponse.json(
          { error: 'Could not geocode address. Please verify the address is correct.' },
          { status: 400 }
        )
      }

      const location = geocodeData.results[0].geometry.location
      latitude = location.lat
      longitude = location.lng
      console.log('Geocoded to:', { latitude, longitude })
      
      // Update the lead with geocoded coordinates
      const supabaseForGeocode = createAdminClient()
      const { error: updateError } = await supabaseForGeocode
        .from('leads')
        .update({
          latitude,
          longitude,
        })
        .eq('id', leadId)
        .eq('company_id', companyId)
      
      if (updateError) {
        console.warn('Failed to update lead coordinates:', updateError)
        // Don't fail the request, just log the warning
      } else {
        console.log('Updated lead coordinates in database')
      }
    }

    // Ensure we have coordinates at this point
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Either address or coordinates (latitude/longitude) must be provided' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Check for Google Maps API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Try Google Solar API with different quality levels
    let data: GoogleSolarResponse | null = null
    let usedQuality = ''
    
    // Try HIGH quality first, then MEDIUM, then LOW
    for (const quality of ['HIGH', 'MEDIUM', 'LOW']) {
      const googleApiUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=${quality}&key=${apiKey}`
      
      const response = await fetch(googleApiUrl)
      
      if (response.ok) {
        data = await response.json()
        usedQuality = quality
        console.log(`Solar API success with ${quality} quality`)
        break
      } else if (quality === 'LOW') {
        // Last attempt failed
        const errorText = await response.text()
        console.error('Google Solar API error (all quality levels tried):', errorText)
        
        return NextResponse.json(
          { 
            error: 'Google Solar API does not have satellite coverage for this location yet.',
            details: 'Google Solar API coverage is limited to certain areas. Try manual measurements or use EagleView for this property.',
            geocoded: { latitude, longitude }
          },
          { status: 404 }
        )
      }
    }
    
    // Fetch high-resolution satellite imagery from dataLayers
    let rgbImageUrl: string | null = null
    try {
      const dataLayersUrl = `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${latitude}&location.longitude=${longitude}&radiusMeters=50&view=FULL_LAYERS&requiredQuality=${usedQuality}&pixelSizeMeters=0.1&key=${apiKey}`
      console.log('Fetching dataLayers for RGB imagery...')
      
      const dataLayersResponse = await fetch(dataLayersUrl)
      if (dataLayersResponse.ok) {
        const dataLayersData = await dataLayersResponse.json()
        rgbImageUrl = dataLayersData.rgbUrl ? `${dataLayersData.rgbUrl}&key=${apiKey}` : null
        console.log('RGB imagery URL obtained:', rgbImageUrl ? 'Yes' : 'No')
      } else {
        console.warn('DataLayers API call failed, continuing without RGB imagery')
      }
    } catch (error) {
      console.warn('Error fetching dataLayers:', error)
      // Continue without RGB imagery
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to retrieve satellite data' },
        { status: 500 }
      )
    }

    // Check if solar potential data exists
    if (!data.solarPotential) {
      return NextResponse.json(
        { error: 'No roof data available for this location' },
        { status: 404 }
      )
    }

    // Extract roof segments and calculate total sloped area
    const segments = data.solarPotential.roofSegmentStats || []
    
    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'No roof segment data available' },
        { status: 404 }
      )
    }

    console.log('=== ROOF MEASUREMENT CALCULATION ===')
    console.log(`Total segments detected: ${segments.length}`)
    
    // Log all available area data for comparison
    const wholeRoofStats = data.solarPotential.wholeRoofStats
    const buildingStats = data.solarPotential.buildingStats
    
    if (wholeRoofStats) {
      console.log(`\nWholeRoofStats (assigned to segments):`)  
      console.log(`  Roof area: ${wholeRoofStats.areaMeters2?.toFixed(2)} m² (${((wholeRoofStats.areaMeters2 || 0) * 10.764 / 100).toFixed(2)} squares)`)
      console.log(`  Ground area: ${wholeRoofStats.groundAreaMeters2?.toFixed(2)} m²`)
    }
    
    if (buildingStats) {
      console.log(`\nBuildingStats (entire building):`)  
      console.log(`  Roof area: ${buildingStats.areaMeters2?.toFixed(2)} m² (${((buildingStats.areaMeters2 || 0) * 10.764 / 100).toFixed(2)} squares)`)
      console.log(`  Ground area: ${buildingStats.groundAreaMeters2?.toFixed(2)} m²`)
    }
    
    // If buildingStats has more area, we may be missing segments
    if (buildingStats && wholeRoofStats && buildingStats.areaMeters2 && wholeRoofStats.areaMeters2) {
      const difference = buildingStats.areaMeters2 - wholeRoofStats.areaMeters2
      const percentDiff = (difference / buildingStats.areaMeters2) * 100
      console.log(`\n⚠️  Missing area: ${difference.toFixed(2)} m² (${percentDiff.toFixed(1)}% of total building)`)
    }
    
    console.log(`\nSegment Details:`)

    // Calculate total sloped area by applying pitch multiplier to each segment
    let totalSlopedAreaMeters2 = 0
    let largestSegment = segments[0]
    let largestSegmentArea = 0

    segments.forEach((segment, index) => {
      const flatArea = segment.stats?.areaMeters2 || 0
      const pitchDegrees = segment.pitchDegrees || 0
      const azimuthDegrees = segment.azimuthDegrees || 0
      
      // Pitch multiplier: sloped area = flat area / cos(pitch in radians)
      const pitchRadians = (pitchDegrees * Math.PI) / 180
      const pitchMultiplier = 1 / Math.cos(pitchRadians)
      const slopedArea = flatArea * pitchMultiplier
      
      // Convert azimuth to cardinal direction
      let direction = 'N'
      if (azimuthDegrees >= 337.5 || azimuthDegrees < 22.5) direction = 'N'
      else if (azimuthDegrees >= 22.5 && azimuthDegrees < 67.5) direction = 'NE'
      else if (azimuthDegrees >= 67.5 && azimuthDegrees < 112.5) direction = 'E'
      else if (azimuthDegrees >= 112.5 && azimuthDegrees < 157.5) direction = 'SE'
      else if (azimuthDegrees >= 157.5 && azimuthDegrees < 202.5) direction = 'S'
      else if (azimuthDegrees >= 202.5 && azimuthDegrees < 247.5) direction = 'SW'
      else if (azimuthDegrees >= 247.5 && azimuthDegrees < 292.5) direction = 'W'
      else if (azimuthDegrees >= 292.5 && azimuthDegrees < 337.5) direction = 'NW'
      
      console.log(`  ${index + 1}. ${flatArea.toFixed(2)} m² facing ${direction} (${azimuthDegrees.toFixed(0)}°), pitch ${pitchDegrees.toFixed(1)}° → ${slopedArea.toFixed(2)} m² sloped (${pitchMultiplier.toFixed(3)}x)`)
      
      totalSlopedAreaMeters2 += slopedArea
      
      // Track largest segment for determining primary pitch
      if (flatArea > largestSegmentArea) {
        largestSegmentArea = flatArea
        largestSegment = segment
      }
    })

    console.log(`\nTotal sloped area from segments: ${totalSlopedAreaMeters2.toFixed(2)} m²`)
    
    // Use buildingStats if available for more complete area
    // NOTE: Google's areaMeters2 already accounts for tilt/pitch!
    let finalAreaMeters2 = totalSlopedAreaMeters2
    let usedBuildingStats = false
    
    if (buildingStats?.areaMeters2 && wholeRoofStats?.areaMeters2) {
      console.log(`\nChecking buildingStats vs wholeRoofStats:`)
      console.log(`  WholeRoofStats: ${wholeRoofStats.areaMeters2.toFixed(2)} m² (sloped, assigned to segments)`)
      console.log(`  BuildingStats: ${buildingStats.areaMeters2.toFixed(2)} m² (sloped, entire building)`)
      
      // If buildingStats is significantly larger, it includes areas not assigned to segments
      // Use it directly since Google already accounts for pitch/tilt
      if (buildingStats.areaMeters2 > wholeRoofStats.areaMeters2 * 1.02) { // 2% threshold
        finalAreaMeters2 = buildingStats.areaMeters2
        usedBuildingStats = true
        const difference = buildingStats.areaMeters2 - wholeRoofStats.areaMeters2
        const percentMore = (difference / wholeRoofStats.areaMeters2) * 100
        console.log(`  ✓ Using buildingStats (${percentMore.toFixed(1)}% more area than segments)`)
      } else {
        console.log(`  ✓ Using segment-calculated sloped area (buildingStats similar to segments)`)
      }
    }
    
    // Convert total sloped area to square feet and then to squares
    const areaSquareFeet = finalAreaMeters2 * 10.764
    let satelliteSquares = Number((areaSquareFeet / 100).toFixed(2))
    let actualSquares = satelliteSquares
    
    // Only add overhang allowance if we didn't use buildingStats
    // buildingStats already includes the full building footprint
    if (!usedBuildingStats) {
      // Add overhang allowance for more accurate roofing estimates
      // Standard residential overhang is 12-18 inches on all sides
      const overhangAllowance = 0.07 // 7% default allowance
      actualSquares = Number((satelliteSquares * (1 + overhangAllowance)).toFixed(2))
      
      console.log(`\nFinal Calculation:`)
      console.log(`  Satellite measurement: ${satelliteSquares} squares`)
      console.log(`  With 7% overhang allowance: ${actualSquares} squares`)
    } else {
      console.log(`\nFinal Calculation:`)
      console.log(`  Total (buildingStats includes overhangs): ${actualSquares} squares`)
    }
    
    console.log(`  Total: ${areaSquareFeet.toFixed(2)} sq ft = ${actualSquares} squares`)
    console.log('=== END CALCULATION ===')

    // Get primary pitch from largest segment
    const primaryPitchDegrees = largestSegment.pitchDegrees || 0
    
    // Convert degrees to rise/run (e.g., "6/12")
    // Formula: rise = 12 * tan(degrees)
    const riseOverRun = Math.round(12 * Math.tan((primaryPitchDegrees * Math.PI) / 180))
    const roofPitch = `${riseOverRun}/12`

    // Calculate complexity based on number of segments
    const segmentCount = segments.length
    let complexity: 'simple' | 'moderate' | 'complex'
    if (segmentCount < 6) {
      complexity = 'simple'
    } else if (segmentCount <= 12) {
      complexity = 'moderate'
    } else {
      complexity = 'complex'
    }

    // Format satellite data date
    let satelliteDate: string | null = null
    if (data.imageryDate) {
      const { year, month, day } = data.imageryDate
      if (year && month && day) {
        satelliteDate = new Date(year, month - 1, day).toISOString()
      }
    }

    // Prepare measurement data
    const measurementData: RoofMeasurement = {
      actual_squares: actualSquares,
      roof_pitch: roofPitch,
      roof_pitch_degrees: Number(primaryPitchDegrees.toFixed(2)),
      roof_complexity: complexity,
      roof_data_raw: data,
      satellite_data_date: satelliteDate,
      measurement_source: 'google_solar',
    }

    // Save to database using admin client
    const supabase = createAdminClient()

    // Check if measurement already exists for this lead
    const { data: existingMeasurement } = await supabase
      .from('lead_measurements')
      .select('id')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    let savedMeasurement

    if (existingMeasurement) {
      // Update existing measurement
      const { data, error } = await supabase
        .from('lead_measurements')
        .update({
          ...measurementData,
          waste_percentage: 10, // Default waste percentage
        })
        .eq('id', existingMeasurement.id)
        .select()
        .single()

      if (error) throw error
      savedMeasurement = data
    } else {
      // Create new measurement
      const { data, error } = await supabase
        .from('lead_measurements')
        .insert({
          company_id: companyId,
          lead_id: leadId,
          ...measurementData,
          waste_percentage: 10, // Default waste percentage
        })
        .select()
        .single()

      if (error) throw error
      savedMeasurement = data
    }

    // Prepare visualization data
    const visualizationData = {
      latitude,
      longitude,
      boundingBox: data.boundingBox,
      segments: segments.map((seg, i) => ({
        area: seg.stats?.areaMeters2 || 0,
        pitch: seg.pitchDegrees || 0,
        azimuth: seg.azimuthDegrees || 0,
        direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
          Math.round(((seg.azimuthDegrees || 0) % 360) / 45) % 8
        ],
        center: seg.center,
        boundingBox: seg.boundingBox,
      })),
      wholeRoofArea: wholeRoofStats?.areaMeters2,
      buildingArea: buildingStats?.areaMeters2,
      actualSquares,
      usedBuildingStats,
      rgbImageUrl, // High-resolution satellite imagery from dataLayers
    }

    // Return success response
    const message = usedBuildingStats 
      ? `Roof analyzed: ${actualSquares} squares (full building coverage), ${roofPitch} pitch, ${complexity} complexity`
      : `Roof analyzed: ${actualSquares} squares (${satelliteSquares} satellite + 7% overhang), ${roofPitch} pitch, ${complexity} complexity`
    
    return NextResponse.json({
      success: true,
      data: {
        id: savedMeasurement.id,
        actual_squares: actualSquares,
        total_squares: savedMeasurement.total_squares,
        roof_pitch: roofPitch,
        roof_pitch_degrees: primaryPitchDegrees,
        roof_complexity: complexity,
        segment_count: segmentCount,
        satellite_date: satelliteDate,
        data_quality: usedQuality,
        satellite_squares: satelliteSquares,
        used_building_stats: usedBuildingStats,
        visualization: visualizationData,
        latitude,  // Return coordinates so UI can use them
        longitude,
      },
      message,
    })

  } catch (error) {
    console.error('Auto-measure error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze roof data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
