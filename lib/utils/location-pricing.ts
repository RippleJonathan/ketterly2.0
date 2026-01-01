/**
 * Location Pricing Utilities
 * 
 * Functions to get location-specific material pricing with fallback to global base cost.
 * Priority: Location + Supplier > Location Default > Material Base Cost
 */

import { createClient } from '@/lib/supabase/client'

export interface PricingResult {
  price: number
  source: 'supplier' | 'location' | 'base'
  supplierId?: string | null
}

/**
 * Get the best price for a material at a location
 * 
 * @param materialId - Material ID
 * @param locationId - Location ID (optional)
 * @param supplierId - Preferred supplier ID (optional)
 * @returns Promise<PricingResult>
 * 
 * Priority:
 * 1. Location + Supplier specific price (if supplierId provided)
 * 2. Lowest supplier price at location (if no supplierId provided)
 * 3. Location default price
 * 4. Material base cost
 */
export async function getMaterialPriceForLocation(
  materialId: string,
  locationId: string | null | undefined,
  supplierId?: string | null
): Promise<PricingResult> {
  const supabase = createClient()
  
  // No location = use base cost
  if (!locationId) {
    const { data } = await supabase
      .from('materials')
      .select('current_cost')
      .eq('id', materialId)
      .single()
    
    return {
      price: data?.current_cost || 0,
      source: 'base'
    }
  }
  
  // Try location + supplier price first (most specific)
  if (supplierId) {
    const { data: supplierPrice } = await supabase
      .from('supplier_material_pricing')
      .select('cost')
      .eq('location_id', locationId)
      .eq('supplier_id', supplierId)
      .eq('material_id', materialId)
      .is('deleted_at', null)
      .maybeSingle()
    
    if (supplierPrice) {
      return {
        price: supplierPrice.cost,
        source: 'supplier',
        supplierId
      }
    }
  }
  
  // Try to find lowest supplier price at this location
  const { data: supplierPrices } = await supabase
    .from('supplier_material_pricing')
    .select('cost, supplier_id')
    .eq('location_id', locationId)
    .eq('material_id', materialId)
    .is('deleted_at', null)
  
  if (supplierPrices && supplierPrices.length > 0) {
    const lowestPrice = supplierPrices.reduce((min, p) => 
      p.cost < min.cost ? p : min
    )
    
    return {
      price: lowestPrice.cost,
      source: 'supplier',
      supplierId: lowestPrice.supplier_id
    }
  }
  
  // Try location default price
  const { data: locationPrice } = await supabase
    .from('location_material_pricing')
    .select('cost')
    .eq('location_id', locationId)
    .eq('material_id', materialId)
    .maybeSingle()
  
  if (locationPrice) {
    return {
      price: locationPrice.cost,
      source: 'location'
    }
  }
  
  // Fall back to base material cost
  const { data } = await supabase
    .from('materials')
    .select('current_cost')
    .eq('id', materialId)
    .single()
  
  return {
    price: data?.current_cost || 0,
    source: 'base'
  }
}

/**
 * Get prices for multiple materials at once (batch operation)
 * 
 * @param materialIds - Array of material IDs
 * @param locationId - Location ID (optional)
 * @returns Promise<Map<materialId, PricingResult>>
 */
export async function getBatchMaterialPricesForLocation(
  materialIds: string[],
  locationId: string | null | undefined
): Promise<Map<string, PricingResult>> {
  const supabase = createClient()
  const results = new Map<string, PricingResult>()
  
  // Fetch all base costs
  const { data: materials } = await supabase
    .from('materials')
    .select('id, current_cost')
    .in('id', materialIds)
  
  const baseCosts = new Map(
    materials?.map(m => [m.id, m.current_cost || 0]) || []
  )
  
  // If no location, return base costs
  if (!locationId) {
    materialIds.forEach(id => {
      results.set(id, {
        price: baseCosts.get(id) || 0,
        source: 'base'
      })
    })
    return results
  }
  
  // Fetch all supplier prices for this location
  const { data: supplierPrices } = await supabase
    .from('supplier_material_pricing')
    .select('material_id, cost, supplier_id')
    .eq('location_id', locationId)
    .in('material_id', materialIds)
    .is('deleted_at', null)
  
  // Group by material and find lowest price
  const supplierPriceMap = new Map<string, { cost: number; supplier_id: string }>()
  supplierPrices?.forEach(sp => {
    const existing = supplierPriceMap.get(sp.material_id)
    if (!existing || sp.cost < existing.cost) {
      supplierPriceMap.set(sp.material_id, {
        cost: sp.cost,
        supplier_id: sp.supplier_id
      })
    }
  })
  
  // Fetch all location default prices
  const { data: locationPrices } = await supabase
    .from('location_material_pricing')
    .select('material_id, cost')
    .eq('location_id', locationId)
    .in('material_id', materialIds)
    .is('deleted_at', null)
  
  const locationPriceMap = new Map(
    locationPrices?.map(lp => [lp.material_id, lp.cost]) || []
  )
  
  // Build results with priority: supplier > location > base
  materialIds.forEach(materialId => {
    const supplierPrice = supplierPriceMap.get(materialId)
    if (supplierPrice) {
      results.set(materialId, {
        price: supplierPrice.cost,
        source: 'supplier',
        supplierId: supplierPrice.supplier_id
      })
      return
    }
    
    const locationPrice = locationPriceMap.get(materialId)
    if (locationPrice) {
      results.set(materialId, {
        price: locationPrice,
        source: 'location'
      })
      return
    }
    
    results.set(materialId, {
      price: baseCosts.get(materialId) || 0,
      source: 'base'
    })
  })
  
  return results
}
