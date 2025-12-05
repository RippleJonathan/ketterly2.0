import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  Material,
  MaterialInsert,
  MaterialUpdate,
  MaterialFilters,
  MaterialSearchResult,
  TemplateMaterial,
  TemplateMaterialInsert,
  TemplateMaterialUpdate
} from '@/lib/types/materials'

/**
 * Get all materials for a company
 */
export async function getMaterials(
  companyId: string,
  filters?: MaterialFilters
): Promise<ApiResponse<Material[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.supplier_id) {
      query = query.eq('default_supplier_id', filters.supplier_id)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,manufacturer.ilike.%${filters.search}%,product_line.ilike.%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch materials:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single material by ID
 */
export async function getMaterial(
  companyId: string,
  materialId: string
): Promise<ApiResponse<Material>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch material:', error)
    return createErrorResponse(error)
  }
}

/**
 * Search materials for autocomplete/selector
 */
export async function searchMaterials(
  companyId: string,
  query: string,
  limit: number = 20
): Promise<ApiResponse<MaterialSearchResult[]>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('materials')
      .select('id, name, category, manufacturer, unit, current_cost, default_per_square')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,manufacturer.ilike.%${query}%,product_line.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(limit)

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Failed to search materials:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new material
 */
export async function createMaterial(
  companyId: string,
  material: MaterialInsert
): Promise<ApiResponse<Material>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('materials')
      .insert({ 
        ...material, 
        company_id: companyId,
        last_price_update: material.current_cost ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create material:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update a material
 */
export async function updateMaterial(
  companyId: string,
  materialId: string,
  updates: MaterialUpdate
): Promise<ApiResponse<Material>> {
  try {
    const supabase = createClient()
    // If cost is being updated, update last_price_update timestamp
    const updatesWithTimestamp = updates.current_cost !== undefined
      ? { ...updates, last_price_update: new Date().toISOString() }
      : updates

    const { data, error } = await supabase
      .from('materials')
      .update(updatesWithTimestamp)
      .eq('id', materialId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update material:', error)
    return createErrorResponse(error)
  }
}

/**
 * Soft delete a material
 */
export async function deleteMaterial(
  companyId: string,
  materialId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('materials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', materialId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete material:', error)
    return createErrorResponse(error)
  }
}

/**
 * Deactivate a material (soft disable)
 */
export async function deactivateMaterial(
  companyId: string,
  materialId: string
): Promise<ApiResponse<Material>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('materials')
      .update({ is_active: false })
      .eq('id', materialId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to deactivate material:', error)
    return createErrorResponse(error)
  }
}

// ==============================================
// TEMPLATE MATERIALS (Junction Table Operations)
// ==============================================

/**
 * Get all materials for a template
 */
export async function getTemplateMaterials(
  templateId: string
): Promise<ApiResponse<TemplateMaterial[]>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('template_materials')
      .select(`
        *,
        material:materials(*)
      `)
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Failed to fetch template materials:', error)
    return createErrorResponse(error)
  }
}

/**
 * Add material to template
 */
export async function addMaterialToTemplate(
  templateMaterial: TemplateMaterialInsert
): Promise<ApiResponse<TemplateMaterial>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('template_materials')
      .insert(templateMaterial)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to add material to template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update material assignment in template
 */
export async function updateTemplateMaterial(
  templateMaterialId: string,
  updates: TemplateMaterialUpdate
): Promise<ApiResponse<TemplateMaterial>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('template_materials')
      .update(updates)
      .eq('id', templateMaterialId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update template material:', error)
    return createErrorResponse(error)
  }
}

/**
 * Remove material from template
 */
export async function removeMaterialFromTemplate(
  templateMaterialId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('template_materials')
      .delete()
      .eq('id', templateMaterialId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to remove material from template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Bulk add materials to template
 * Note: Templates inherit measurement_type and per_unit from materials (single source of truth)
 */
export async function bulkAddMaterialsToTemplate(
  templateId: string,
  materials: Array<{ material_id: string; description?: string }>
): Promise<ApiResponse<TemplateMaterial[]>> {
  try {
    const supabase = createClient()
    const itemsToInsert = materials.map((m, index) => ({
      template_id: templateId,
      material_id: m.material_id,
      description: m.description,
      sort_order: index
    }))

    const { data, error } = await supabase
      .from('template_materials')
      .insert(itemsToInsert)
      .select()

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Failed to bulk add materials to template:', error)
    return createErrorResponse(error)
  }
}
