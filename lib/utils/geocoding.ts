// Geocoding utility for door knock feature
export interface GeocodeResult {
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  formatted_address: string;
}

/**
 * Reverse geocode coordinates to address using Google Maps API
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `/api/door-knocks/geocode?lat=${latitude}&lng=${longitude}`
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Geocode address to coordinates using Google Maps API
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `/api/door-knocks/geocode?address=${encodeURIComponent(address)}`
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Address geocoding error:', error);
    return null;
  }
}

/**
 * Batch reverse geocode multiple coordinates
 * Debounced to avoid rate limiting
 */
export async function batchReverseGeocode(
  coordinates: Array<{ lat: number; lng: number }>
): Promise<Array<GeocodeResult | null>> {
  const results: Array<GeocodeResult | null> = [];

  // Process in batches to avoid rate limiting
  for (const coord of coordinates) {
    const result = await reverseGeocode(coord.lat, coord.lng);
    results.push(result);
    
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Parse Google Maps Geocoding API result
 */
export function parseGoogleGeocodeResult(result: any): GeocodeResult {
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

  return {
    address: result.formatted_address || '',
    city,
    state,
    zip,
    formatted_address: result.formatted_address || '',
  };
}
