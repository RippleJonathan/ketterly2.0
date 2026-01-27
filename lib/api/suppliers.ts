import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import { 
  Supplier, 
  SupplierInsert, 
  SupplierUpdate, 
  SupplierFilters 
} from '@/lib/types/suppliers'

/**
 * Get all suppliers for a company
 */
export async function getSuppliers(
  companyId: string,
  filters?: SupplierFilters
): Promise<ApiResponse<Supplier[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('suppliers')
      .select('*, locations(id, name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    // Filter by location: show suppliers assigned to this location OR company-wide (null location_id)
    if (filters?.location_id) {
      query = query.or(`location_id.eq.${filters.location_id},location_id.is.null`)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch suppliers:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(
  companyId: string,
  supplierId: string
): Promise<ApiResponse<Supplier>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, locations(id, name)')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch supplier:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(
  companyId: string,
  supplier: SupplierInsert
): Promise<ApiResponse<Supplier>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...supplier, company_id: companyId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create supplier:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  companyId: string,
  supplierId: string,
  updates: SupplierUpdate
): Promise<ApiResponse<Supplier>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update supplier:', error)
    return createErrorResponse(error)
  }
}

/**
 * Soft delete a supplier
 */
export async function deleteSupplier(
  companyId: string,
  supplierId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', supplierId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete supplier:', error)
    return createErrorResponse(error)
  }
}

/**
 * Deactivate a supplier (soft disable)
 */
export async function deactivateSupplier(
  companyId: string,
  supplierId: string
): Promise<ApiResponse<Supplier>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to deactivate supplier:', error)
    return createErrorResponse(error)
  }
}
