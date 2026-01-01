import { createClient } from '@/lib/supabase/client'

/**
 * Get material cost with location override waterfall
 * 1. Check for location-specific pricing
 * 2. Fall back to base material cost
 */
export async function getMaterialCost(
  materialId: string,
  locationId: string | null
): Promise<number> {
  const supabase = createClient()
  
  try {
    // 1. Try location-specific pricing first
    if (locationId) {
      const { data: locationPrice, error: locationError } = await supabase
        .from('location_material_pricing')
        .select('cost')
        .eq('location_id', locationId)
        .eq('material_id', materialId)
        .maybeSingle()
      
      if (!locationError && locationPrice?.cost) {
        return parseFloat(locationPrice.cost.toString())
      }
    }
    
    // 2. Fall back to base material cost
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('current_cost')
      .eq('id', materialId)
      .single()
    
    if (materialError || !material) {
      console.error('Error fetching material cost:', materialError)
      return 0
    }
    
    return parseFloat(material.current_cost?.toString() || '0')
  } catch (error) {
    console.error('Error in getMaterialCost:', error)
    return 0
  }
}

/**
 * Check if material has location-specific pricing
 */
export async function hasLocationPricing(
  materialId: string,
  locationId: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_material_pricing')
      .select('id')
      .eq('location_id', locationId)
      .eq('material_id', materialId)
      .maybeSingle()
    
    return !error && data !== null
  } catch (error) {
    return false
  }
}

/**
 * Get location material pricing with material details
 */
export async function getLocationMaterialPricing(locationId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_material_pricing')
      .select(`
        *,
        materials (
          name,
          description,
          category,
          current_cost,
          unit
        )
      `)
      .eq('location_id', locationId)
      .order('effective_date', { ascending: false })
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching location material pricing:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Set location-specific material pricing
 */
export async function setLocationMaterialPrice(
  locationId: string,
  materialId: string,
  cost: number,
  supplierId?: string,
  notes?: string
) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_material_pricing')
      .upsert({
        location_id: locationId,
        material_id: materialId,
        cost,
        supplier_id: supplierId,
        notes,
        effective_date: new Date().toISOString().split('T')[0],
      }, {
        onConflict: 'location_id,material_id'
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error setting location material price:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Remove location-specific material pricing (revert to base cost)
 */
export async function removeLocationMaterialPrice(
  locationId: string,
  materialId: string
) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('location_material_pricing')
      .delete()
      .eq('location_id', locationId)
      .eq('material_id', materialId)
    
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    console.error('Error removing location material price:', error)
    return { error: error.message }
  }
}

/**
 * Get labor rate for location
 */
export async function getLocationLaborRates(locationId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_labor_rates')
      .select('*')
      .eq('location_id', locationId)
      .order('category', { ascending: true })
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching location labor rates:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Set location-specific labor rate
 */
export async function setLocationLaborRate(
  locationId: string,
  description: string,
  hourlyRate?: number,
  flatRate?: number,
  category?: string,
  templateId?: string,
  notes?: string
) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('location_labor_rates')
      .insert({
        location_id: locationId,
        description,
        hourly_rate: hourlyRate,
        flat_rate: flatRate,
        category,
        template_id: templateId,
        notes,
        effective_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error setting location labor rate:', error)
    return { data: null, error: error.message }
  }
}
