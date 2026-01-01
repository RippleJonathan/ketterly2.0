import { createClient } from '@/lib/supabase/client'
import type { ApiResponse } from '@/lib/types/api'

// Location types
export interface Location {
  id: string
  company_id: string
  name: string
  location_code: string | null
  is_primary: boolean
  is_active: boolean
  
  // Contact
  address: string
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  
  // Business
  license_number: string | null
  tax_rate: number | null
  
  // Branding
  logo_url: string | null
  primary_color: string | null
  
  // Contract/warranty
  contract_terms: string | null
  replacement_warranty_years: number | null
  repair_warranty_years: number | null
  
  // Financing
  financing_option_1_name: string | null
  financing_option_1_months: number | null
  financing_option_1_apr: number | null
  financing_option_1_enabled: boolean
  financing_option_2_name: string | null
  financing_option_2_months: number | null
  financing_option_2_apr: number | null
  financing_option_2_enabled: boolean
  financing_option_3_name: string | null
  financing_option_3_months: number | null
  financing_option_3_apr: number | null
  financing_option_3_enabled: boolean
  
  // Metadata
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Supplier Material Pricing types
export interface SupplierMaterialPrice {
  id: string
  location_id: string
  supplier_id: string
  material_id: string
  cost: number
  effective_date: string | null
  supplier_sku: string | null
  lead_time_days: number | null
  minimum_order_qty: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Joined data (when populated)
  materials?: any
  suppliers?: any
}

export interface SupplierMaterialPriceInsert {
  location_id: string
  supplier_id: string
  material_id: string
  cost: number
  effective_date?: string
  supplier_sku?: string
  lead_time_days?: number
  minimum_order_qty?: number
  notes?: string
}

export interface LocationInsert {
  company_id: string
  name: string
  location_code?: string
  is_primary?: boolean
  is_active?: boolean
  address: string
  city: string
  state: string
  zip: string
  phone?: string
  email?: string
  license_number?: string
  tax_rate?: number
  logo_url?: string
  primary_color?: string
  contract_terms?: string
  replacement_warranty_years?: number
  repair_warranty_years?: number
  notes?: string
}

export interface LocationUpdate extends Partial<LocationInsert> {
  id: string
}

// Get all locations for a company
export async function getLocations(
  companyId: string,
  activeOnly: boolean = false
): Promise<ApiResponse<Location[]>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('locations')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true })
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching locations:', error)
    return { data: null, error: error.message || 'Failed to fetch locations' }
  }
}

// Get single location
export async function getLocation(locationId: string): Promise<ApiResponse<Location>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .is('deleted_at', null)
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error fetching location:', error)
    return { data: null, error: error.message || 'Failed to fetch location' }
  }
}

// Get primary location for a company
export async function getPrimaryLocation(companyId: string): Promise<ApiResponse<Location>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_primary', true)
      .is('deleted_at', null)
      .maybeSingle()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error fetching primary location:', error)
    return { data: null, error: error.message || 'Failed to fetch primary location' }
  }
}

// Create location
export async function createLocation(location: LocationInsert): Promise<ApiResponse<Location>> {
  try {
    const supabase = createClient()
    
    // If this is set as primary, unset other primary locations first
    if (location.is_primary) {
      // Check if there are any existing primary locations
      const { data: existingPrimary } = await supabase
        .from('locations')
        .select('id')
        .eq('company_id', location.company_id)
        .eq('is_primary', true)
        .is('deleted_at', null)
        .maybeSingle()
      
      // Only update if there's an existing primary location
      if (existingPrimary) {
        const { error: updateError } = await supabase
          .from('locations')
          .update({ is_primary: false })
          .eq('company_id', location.company_id)
          .eq('is_primary', true)
        
        if (updateError) throw updateError
      }
    }
    
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error creating location:', error)
    return { data: null, error: error.message || 'Failed to create location' }
  }
}

// Update location
export async function updateLocation(location: LocationUpdate): Promise<ApiResponse<Location>> {
  try {
    const supabase = createClient()
    
    const { id, ...updateData } = location
    
    // If setting as primary, unset other primary locations
    if (updateData.is_primary) {
      const { data: currentLocation } = await supabase
        .from('locations')
        .select('company_id')
        .eq('id', id)
        .single()
      
      if (currentLocation) {
        await supabase
          .from('locations')
          .update({ is_primary: false })
          .eq('company_id', currentLocation.company_id)
          .eq('is_primary', true)
          .neq('id', id)
      }
    }
    
    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error updating location:', error)
    return { data: null, error: error.message || 'Failed to update location' }
  }
}

// Delete location (soft delete)
export async function deleteLocation(locationId: string): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', locationId)
    
    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Error deleting location:', error)
    return { data: null, error: error.message || 'Failed to delete location' }
  }
}

// Set primary location
export async function setPrimaryLocation(
  locationId: string,
  companyId: string
): Promise<ApiResponse<Location>> {
  try {
    const supabase = createClient()
    
    // Unset all primary locations for this company
    await supabase
      .from('locations')
      .update({ is_primary: false })
      .eq('company_id', companyId)
      .eq('is_primary', true)
    
    // Set new primary
    const { data, error} = await supabase
      .from('locations')
      .update({ is_primary: true })
      .eq('id', locationId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error setting primary location:', error)
    return { data: null, error: error.message || 'Failed to set primary location' }
  }
}

// =============================================
// Supplier Material Pricing Functions
// =============================================

// Get all supplier pricing for a location
export async function getLocationSupplierPricing(
  locationId: string,
  supplierId?: string
): Promise<ApiResponse<SupplierMaterialPrice[]>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('supplier_material_pricing')
      .select(`
        *,
        materials (
          id,
          name,
          item_type,
          unit,
          current_cost
        ),
        suppliers (
          id,
          name,
          type
        )
      `)
      .eq('location_id', locationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return { data: data as SupplierMaterialPrice[], error: null }
  } catch (error: any) {
    console.error('Error fetching supplier pricing:', error)
    return { data: null, error: error.message || 'Failed to fetch supplier pricing' }
  }
}

// Set/update supplier material price for a location
export async function setLocationSupplierPrice(
  data: SupplierMaterialPriceInsert
): Promise<ApiResponse<SupplierMaterialPrice>> {
  try {
    const supabase = createClient()
    
    // Upsert: update if exists, insert if not
    const { data: result, error } = await supabase
      .from('supplier_material_pricing')
      .upsert(
        {
          location_id: data.location_id,
          supplier_id: data.supplier_id,
          material_id: data.material_id,
          cost: data.cost,
          effective_date: data.effective_date,
          supplier_sku: data.supplier_sku,
          lead_time_days: data.lead_time_days,
          minimum_order_qty: data.minimum_order_qty,
          notes: data.notes,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'location_id,supplier_id,material_id'
        }
      )
      .select()
      .single()
    
    if (error) throw error
    return { data: result as SupplierMaterialPrice, error: null }
  } catch (error: any) {
    console.error('Error setting supplier price:', error)
    return { data: null, error: error.message || 'Failed to set supplier price' }
  }
}

// Remove supplier material price (soft delete)
export async function removeLocationSupplierPrice(
  priceId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('supplier_material_pricing')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', priceId)
    
    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Error removing supplier price:', error)
    return { data: null, error: error.message || 'Failed to remove supplier price' }
  }
}

// Get effective material price (with waterfall logic)
export async function getMaterialEffectivePrice(
  materialId: string,
  locationId: string,
  supplierId?: string
): Promise<ApiResponse<{ price: number; source: string }>> {
  try {
    const supabase = createClient()
    
    // 1. Check for location + supplier price (most specific)
    if (supplierId) {
      const { data: supplierPrice } = await supabase
        .from('supplier_material_pricing')
        .select('cost')
        .eq('location_id', locationId)
        .eq('supplier_id', supplierId)
        .eq('material_id', materialId)
        .is('deleted_at', null)
        .maybeSingle()
      
      if (supplierPrice?.cost) {
        return { 
          data: { price: supplierPrice.cost, source: 'supplier' }, 
          error: null 
        }
      }
    }
    
    // 2. Check for location default price
    const { data: locationPrice } = await supabase
      .from('location_material_pricing')
      .select('cost')
      .eq('location_id', locationId)
      .eq('material_id', materialId)
      .maybeSingle()
    
    if (locationPrice?.cost) {
      return { 
        data: { price: locationPrice.cost, source: 'location' }, 
        error: null 
      }
    }
    
    // 3. Fallback to base material price
    const { data: material, error } = await supabase
      .from('materials')
      .select('unit_price')
      .eq('id', materialId)
      .single()
    
    if (error) throw error
    
    return { 
      data: { price: material.unit_price, source: 'base' }, 
      error: null 
    }
  } catch (error: any) {
    console.error('Error getting effective price:', error)
    return { data: null, error: error.message || 'Failed to get effective price' }
  }
}
