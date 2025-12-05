import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  MaterialTemplate,
  MaterialTemplateInsert,
  MaterialTemplateUpdate,
  MaterialTemplateFilters,
  GeneratedOrderItem,
  GenerateOrderFromTemplateParams,
  TemplateItem
} from '@/lib/types/material-templates'

/**
 * Get all material templates for a company
 */
export async function getTemplates(
  companyId: string,
  filters?: MaterialTemplateFilters
): Promise<ApiResponse<MaterialTemplate[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('material_templates')
      .select(`
        *,
        template_materials_count:template_materials(count)
      `)
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

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error
    
    // Transform the count from the aggregation
    const transformedData = data?.map(template => ({
      ...template,
      template_materials_count: template.template_materials_count?.[0]?.count || 0,
    })) || []

    return { data: transformedData, error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch templates:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(
  companyId: string,
  templateId: string
): Promise<ApiResponse<MaterialTemplate>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_templates')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new material template
 */
export async function createTemplate(
  companyId: string,
  template: MaterialTemplateInsert
): Promise<ApiResponse<MaterialTemplate>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_templates')
      .insert({ ...template, company_id: companyId })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create template:', error)
    return createErrorResponse(error)
  }
}
/**
 * Update a material template
 */
export async function updateTemplate(
  companyId: string,
  templateId: string,
  updates: MaterialTemplateUpdate
): Promise<ApiResponse<MaterialTemplate>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('material_templates')
      .update(updates)
      .eq('id', templateId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Soft delete a template
 */
export async function deleteTemplate(
  companyId: string,
  templateId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('material_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Duplicate a template (for creating variants)
 */
export async function duplicateTemplate(
  companyId: string,
  templateId: string,
  newName: string
): Promise<ApiResponse<MaterialTemplate>> {
  try {
    const supabase = createClient()
    // Fetch original template
    const { data: original, error: fetchError } = await supabase
      .from('material_templates')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .single()

    if (fetchError) throw fetchError

    // Create duplicate with new name
    const { data, error } = await supabase
      .from('material_templates')
      .insert({
        company_id: companyId,
        name: newName,
        description: original.description,
        category: original.category,
        items: original.items,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to duplicate template:', error)
    return createErrorResponse(error)
  }
}

/**
 * Generate material order items from template based on measurements
 * This is the smart part - auto-calculates quantities from squares
 */
export function generateOrderFromTemplate(
  template: MaterialTemplate,
  squares: number,
  estimatedCosts?: Record<string, number>
): GeneratedOrderItem[] {
  const items: GeneratedOrderItem[] = []

  for (const templateItem of template.items) {
    const quantity = Math.ceil(squares * templateItem.per_square * 100) / 100 // Round up to 2 decimals
    const estimated_unit_cost = estimatedCosts?.[templateItem.item] || null

    items.push({
      description: templateItem.description,
      quantity,
      unit: templateItem.unit,
      estimated_unit_cost
    })
  }

  return items
}

/**
 * Helper to validate template items structure
 */
export function validateTemplateItems(items: TemplateItem[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Template must have at least one item')
    return { valid: false, errors }
  }

  items.forEach((item, index) => {
    if (!item.item || item.item.trim() === '') {
      errors.push(`Item ${index + 1}: Name is required`)
    }
    if (!item.unit || item.unit.trim() === '') {
      errors.push(`Item ${index + 1}: Unit is required`)
    }
    if (typeof item.per_square !== 'number' || item.per_square <= 0) {
      errors.push(`Item ${index + 1}: Per square must be a positive number`)
    }
    if (!item.description || item.description.trim() === '') {
      errors.push(`Item ${index + 1}: Description is required`)
    }
  })

  return { valid: errors.length === 0, errors }
}
