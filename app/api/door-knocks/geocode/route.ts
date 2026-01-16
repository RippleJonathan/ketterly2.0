import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat or lng parameters' },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components || [];
      
      let city = null;
      let state = null;
      let zip = null;

      for (const component of addressComponents) {
        const types = component.types;
        
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        } else if (types.includes('postal_code')) {
          zip = component.long_name;
        }
      }
      
      return NextResponse.json({
        address: result.formatted_address,
        city,
        state,
        zip,
        formatted_address: result.formatted_address,
      });
    } else {
      return NextResponse.json(
        { error: 'No address found for these coordinates' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 500 }
    );
  }
}
