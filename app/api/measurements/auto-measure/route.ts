import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Google Solar API types
interface GoogleSolarResponse {
  solarPotential?: {
    wholeRoofStats?: {
      areaMeters2?: number
    }
    roofSegmentStats?: Array<{
      pitchDegrees?: number
      stats?: {
        areaMeters2?: number
      }
    }>
  }
  imageryDate?: {
    year?: number
    month?: number
    day?: number
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
 * 
 * Body:
 * {
 *   leadId: string
 *   companyId: string
 *   latitude: number
 *   longitude: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, companyId, latitude, longitude } = body

    // Validate required fields
    if (!leadId || !companyId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, companyId, latitude, longitude' },
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

    // Call Google Solar API
    const googleApiUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=HIGH&key=${apiKey}`
    
    const response = await fetch(googleApiUrl)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Solar API error:', errorText)
      return NextResponse.json(
        { error: 'No satellite data available for this location. Google may not have coverage in this area.' },
        { status: 404 }
      )
    }

    const data: GoogleSolarResponse = await response.json()

    // Check if solar potential data exists
    if (!data.solarPotential || !data.solarPotential.wholeRoofStats) {
      return NextResponse.json(
        { error: 'No roof data available for this location' },
        { status: 404 }
      )
    }

    // Extract area in square meters
    const areaMeters2 = data.solarPotential.wholeRoofStats.areaMeters2
    if (!areaMeters2) {
      return NextResponse.json(
        { error: 'Roof area data not available' },
        { status: 404 }
      )
    }

    // Convert to square feet and then to squares
    const areaSquareFeet = areaMeters2 * 10.764
    const actualSquares = Number((areaSquareFeet / 100).toFixed(2))

    // Extract pitch from largest roof segment
    const segments = data.solarPotential.roofSegmentStats || []
    let primaryPitchDegrees = 0
    
    if (segments.length > 0) {
      // Find segment with largest area
      const largestSegment = segments.reduce((max, segment) => {
        const segmentArea = segment.stats?.areaMeters2 || 0
        const maxArea = max.stats?.areaMeters2 || 0
        return segmentArea > maxArea ? segment : max
      }, segments[0])
      
      primaryPitchDegrees = largestSegment.pitchDegrees || 0
    }

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

    // Return success response
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
      },
      message: `Roof analyzed: ${actualSquares} squares, ${roofPitch} pitch, ${complexity} complexity`,
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
