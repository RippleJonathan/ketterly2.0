/**
 * Property Ownership Lookup Utilities
 * 
 * Integrates with property data APIs to retrieve homeowner information
 * based on address. Used for auto-populating lead forms during door knocking.
 */

export interface PropertyOwnerData {
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  mailingAddress?: string;
  propertyType?: string;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  assessedValue?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
}

/**
 * Look up property owner information using Melissa Data Property API
 * 
 * @param address - Street address
 * @param city - City name
 * @param state - State abbreviation (e.g., "TX")
 * @param zip - ZIP code
 * @returns Property owner data or null if not found
 */
export async function lookupPropertyOwner(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<PropertyOwnerData | null> {
  // Check if API key is configured
  const apiKey = process.env.NEXT_PUBLIC_MELISSA_API_KEY || process.env.MELISSA_API_KEY;
  
  if (!apiKey) {
    console.warn('Property lookup API key not configured. Skipping owner lookup.');
    return null;
  }

  try {
    // Melissa Data Property API endpoint
    const baseUrl = 'https://property.melissadata.net/v4/WEB/LookupProperty/doLookup';
    
    const params = new URLSearchParams({
      id: apiKey,
      format: 'json',
      ff: address, // Full address
      city: city,
      state: state,
      zip: zip,
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    
    if (!response.ok) {
      console.error('Property lookup failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Check if result is valid
    if (!data?.Records || data.Records.length === 0) {
      console.log('No property records found for address');
      return null;
    }

    const record = data.Records[0];
    
    // Extract owner information
    const ownerName = record.OwnerName || record.Owner1FullName || '';
    const [firstName, ...lastNameParts] = ownerName.split(' ');
    const lastName = lastNameParts.join(' ');

    return {
      ownerName: ownerName,
      ownerFirstName: firstName || undefined,
      ownerLastName: lastName || undefined,
      mailingAddress: record.MailingAddress || undefined,
      propertyType: record.PropertyType || undefined,
      yearBuilt: record.YearBuilt ? parseInt(record.YearBuilt) : undefined,
      bedrooms: record.Bedrooms ? parseInt(record.Bedrooms) : undefined,
      bathrooms: record.Bathrooms ? parseFloat(record.Bathrooms) : undefined,
      squareFeet: record.BuildingSquareFeet ? parseInt(record.BuildingSquareFeet) : undefined,
      lotSize: record.LotSizeSquareFeet ? parseInt(record.LotSizeSquareFeet) : undefined,
      assessedValue: record.AssessedValue ? parseInt(record.AssessedValue) : undefined,
      lastSaleDate: record.LastSaleDate || undefined,
      lastSalePrice: record.LastSaleAmount ? parseInt(record.LastSaleAmount) : undefined,
    };
  } catch (error) {
    console.error('Error looking up property owner:', error);
    return null;
  }
}

/**
 * Alternative: Look up property owner using Attom Data API
 * Uncomment and configure if using Attom instead of Melissa
 */
/*
export async function lookupPropertyOwnerAttom(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<PropertyOwnerData | null> {
  const apiKey = process.env.ATTOM_API_KEY;
  
  if (!apiKey) {
    console.warn('Attom API key not configured');
    return null;
  }

  try {
    const baseUrl = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail';
    
    const params = new URLSearchParams({
      address1: address,
      address2: `${city}, ${state} ${zip}`,
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Attom property lookup failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    const property = data.property?.[0];
    
    if (!property) {
      return null;
    }

    const owner = property.owner;
    const ownerName = `${owner?.owner1?.firstName || ''} ${owner?.owner1?.lastName || ''}`.trim();

    return {
      ownerName: ownerName || undefined,
      ownerFirstName: owner?.owner1?.firstName || undefined,
      ownerLastName: owner?.owner1?.lastName || undefined,
      mailingAddress: owner?.mailingAddress?.oneLine || undefined,
      propertyType: property.summary?.proptype || undefined,
      yearBuilt: property.summary?.yearbuilt || undefined,
      bedrooms: property.building?.rooms?.beds || undefined,
      bathrooms: property.building?.rooms?.bathstotal || undefined,
      squareFeet: property.building?.size?.universalsize || undefined,
      lotSize: property.lot?.lotsize1 || undefined,
      assessedValue: property.assessment?.assessed?.assdttlvalue || undefined,
      lastSaleDate: property.sale?.saleTransDate || undefined,
      lastSalePrice: property.sale?.amount?.saleamt || undefined,
    };
  } catch (error) {
    console.error('Error looking up property owner (Attom):', error);
    return null;
  }
}
*/
