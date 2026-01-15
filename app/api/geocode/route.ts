import { NextRequest, NextResponse } from 'next/server'

/**
 * Geocode API Route
 * Converts an address to latitude/longitude using Google Maps Geocoding API
 * Also supports reverse geocoding (coordinates to address)
 * 
 * POST /api/geocode - Forward geocode (address to coordinates)
 * Body: { address: string }
 * Returns: { latitude: number, longitude: number, formattedAddress: string }
 * 
 * GET /api/geocode?lat=X&lng=Y - Reverse geocode (coordinates to address)
 * Returns: { address: string, city: string, state: string, zip: string, formattedAddress: string }
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      )
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'No address found for these coordinates' },
        { status: 404 }
      )
    }

    const result = data.results[0]
    const addressComponents = result.address_components || []

    let city = null
    let state = null
    let zip = null

    for (const component of addressComponents) {
      const types = component.types

      if (types.includes('locality')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name
      } else if (types.includes('postal_code')) {
        zip = component.long_name
      }
    }

    return NextResponse.json({
      address: result.formatted_address,
      city,
      state,
      zip,
      formattedAddress: result.formatted_address,
    })
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    // Validate input
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      )
    }

    // Call Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()

    // Check for errors
    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status, data.error_message)
      
      if (data.status === 'ZERO_RESULTS') {
        return NextResponse.json(
          { error: 'Address not found. Please verify the address is correct.' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}` },
        { status: 400 }
      )
    }

    // Extract location from first result
    const result = data.results[0]
    const { lat, lng } = result.geometry.location
    const formattedAddress = result.formatted_address

    return NextResponse.json({
      latitude: lat,
      longitude: lng,
      formattedAddress,
    })

  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    )
  }
}
