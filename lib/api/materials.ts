/**
 * API functions for materials library
 */

import { createClient } from '@/lib/supabase/client'

export interface Material {
  id: string
  company_id: string
  name: string
  category: string
  subcategory: string | null
  unit_price: number | null
  unit_type: string
  manufacturer: string | null
  model_number: string | null
  color: string | null
  description: string | null
  sku: string | null
  current_stock: number | null
  reorder_point: number | null
  is_active: boolean
  is_taxable: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialFormData {
  name: string
  category: string
  subcategory?: string | null
  unit_price?: number | null
  unit_type?: string
  manufacturer?: string | null
  model_number?: string | null
  color?: string | null
  description?: string | null
  sku?: string | null
  is_active?: boolean
  is_taxable?: boolean
}

/**
 * Search materials by name (for autocomplete)
 */
export async function searchMaterials(companyId: string, query: string, category?: string) {
  const supabase = createClient()

  try {
    let queryBuilder = supabase
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)

    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error searching materials:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error searching materials:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get all materials for a company
 */
export async function getMaterials(companyId: string, category?: string) {
  const supabase = createClient()

  try {
    let queryBuilder = supabase
      .from('materials')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('category')
      .order('name')

    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error fetching materials:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching materials:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new material
 */
export async function createMaterial(companyId: string, material: MaterialFormData) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('materials')
      .insert({
        company_id: companyId,
        ...material,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating material:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error creating material:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a material
 */
export async function updateMaterial(materialId: string, updates: Partial<MaterialFormData>) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', materialId)
      .select()
      .single()

    if (error) {
      console.error('Error updating material:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error updating material:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete a material (soft delete)
 */
export async function deleteMaterial(materialId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('materials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', materialId)

    if (error) {
      console.error('Error deleting material:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Error deleting material:', error)
    return { error: error as Error }
  }
}
