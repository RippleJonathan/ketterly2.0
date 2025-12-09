// Material Variants API Functions
// CRUD operations for material variants with company-scoped data access

import { createClient } from '@/lib/supabase/client'
import type {
  MaterialVariant,
  MaterialVariantInsert,
  MaterialVariantUpdate,
  MaterialVariantFilters,
} from '@/lib/types/material-variants'

/**
 * Get all variants for a specific material
 */
export async function getMaterialVariants(
  companyId: string,
  materialId: string,
  filters?: MaterialVariantFilters
) {
  try {
    const supabase = createClient()
    let query = supabase
      .from('material_variants')
      .select('*')
      .eq('company_id', companyId)
      .eq('material_id', materialId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    // Apply filters
    if (filters?.variant_type) {
      query = query.eq('variant_type', filters.variant_type)
    }
    if (filters?.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available)
    }
    if (filters?.is_default !== undefined) {
      query = query.eq('is_default', filters.is_default)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: data as MaterialVariant[], error: null }
  } catch (error) {
    console.error('Error fetching material variants:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all variants for a company (across all materials)
 */
export async function getAllCompanyVariants(
  companyId: string,
  filters?: MaterialVariantFilters
) {
  try {
    const supabase = createClient()
    let query = supabase
      .from('material_variants')
      .select(`
        *,
        materials (
          id,
          name,
          unit,
          current_cost
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('material_id', { ascending: true })
      .order('sort_order', { ascending: true })

    // Apply filters
    if (filters?.material_id) {
      query = query.eq('material_id', filters.material_id)
    }
    if (filters?.variant_type) {
      query = query.eq('variant_type', filters.variant_type)
    }
    if (filters?.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available)
    }

    const { data, error } = await query

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching company variants:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single variant by ID
 */
export async function getMaterialVariant(companyId: string, variantId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_variants')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', variantId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    return { data: data as MaterialVariant, error: null }
  } catch (error) {
    console.error('Error fetching material variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new material variant
 */
export async function createMaterialVariant(
  companyId: string,
  variant: MaterialVariantInsert
) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_variants')
      .insert({
        company_id: companyId,
        ...variant,
      })
      .select()
      .single()

    if (error) throw error

    return { data: data as MaterialVariant, error: null }
  } catch (error) {
    console.error('Error creating material variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update an existing material variant
 */
export async function updateMaterialVariant(
  companyId: string,
  variantId: string,
  updates: MaterialVariantUpdate
) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_variants')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('id', variantId)
      .select()
      .single()

    if (error) throw error

    return { data: data as MaterialVariant, error: null }
  } catch (error) {
    console.error('Error updating material variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Soft delete a material variant
 */
export async function deleteMaterialVariant(
  companyId: string,
  variantId: string
) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_variants')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('id', variantId)
      .select()
      .single()

    if (error) throw error

    return { data: data as MaterialVariant, error: null }
  } catch (error) {
    console.error('Error deleting material variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Set a variant as the default for its material
 * This will unset all other defaults for the same material
 */
export async function setDefaultVariant(
  companyId: string,
  materialId: string,
  variantId: string
) {
  try {
    const supabase = createClient()
    // First, unset all defaults for this material
    await supabase
      .from('material_variants')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('material_id', materialId)

    // Then set the new default
    const { data, error } = await supabase
      .from('material_variants')
      .update({ is_default: true })
      .eq('company_id', companyId)
      .eq('id', variantId)
      .select()
      .single()

    if (error) throw error

    return { data: data as MaterialVariant, error: null }
  } catch (error) {
    console.error('Error setting default variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get the default variant for a material
 */
export async function getDefaultVariant(companyId: string, materialId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_variants')
      .select('*')
      .eq('company_id', companyId)
      .eq('material_id', materialId)
      .eq('is_default', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error

    return { data: data as MaterialVariant | null, error: null }
  } catch (error) {
    console.error('Error fetching default variant:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Bulk create variants for a material
 * Useful for importing color palettes or standard sizes
 */
export async function bulkCreateVariants(
  companyId: string,
  materialId: string,
  variants: Omit<MaterialVariantInsert, 'material_id'>[]
) {
  try {
    const supabase = createClient()
    const variantsToInsert = variants.map((v, index) => ({
      company_id: companyId,
      material_id: materialId,
      ...v,
      sort_order: v.sort_order ?? index,
    }))

    const { data, error } = await supabase
      .from('material_variants')
      .insert(variantsToInsert)
      .select()

    if (error) throw error

    return { data: data as MaterialVariant[], error: null }
  } catch (error) {
    console.error('Error bulk creating variants:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Reorder variants for a material
 */
export async function reorderVariants(
  companyId: string,
  materialId: string,
  variantIds: string[]
) {
  try {
    const supabase = createClient()
    // Update sort_order for each variant based on array position
    const updates = variantIds.map((variantId, index) =>
      supabase
        .from('material_variants')
        .update({ sort_order: index })
        .eq('company_id', companyId)
        .eq('material_id', materialId)
        .eq('id', variantId)
    )

    await Promise.all(updates)

    return { data: true, error: null }
  } catch (error) {
    console.error('Error reordering variants:', error)
    return { data: null, error: error as Error }
  }
}
