import { NextRequest, NextResponse } from 'next/server'

/**
 * Geocode API Route
 * Converts an address to latitude/longitude using Google Maps Geocoding API
 * 
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { latitude: number, longitude: number, formattedAddress: string }
 */
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
