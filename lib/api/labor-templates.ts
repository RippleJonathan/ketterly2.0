// Labor Template API functions

import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

const supabase = createClient()
import {
  LaborTemplate,
  LaborTemplateWithItems,
  LaborTemplateInsert,
  LaborTemplateUpdate,
  TemplateLaborItem,
  TemplateLaborItemInsert,
  TemplateLaborItemUpdate,
  LaborTemplateFilters,
} from '@/lib/types/labor-templates'

// =====================================================
// LABOR TEMPLATES
// =====================================================

/**
 * Get all labor templates for a company with optional filtering
 */
export async function getLaborTemplates(
  companyId: string,
  filters?: LaborTemplateFilters
): Promise<ApiResponse<LaborTemplate[]>> {
  try {
    let query = supabase
      .from('labor_templates')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name')

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a single labor template by ID
 */
export async function getLaborTemplate(
  companyId: string,
  templateId: string
): Promise<ApiResponse<LaborTemplate>> {
  try {
    const { data, error } = await supabase
      .from('labor_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', templateId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new labor template
 */
export async function createLaborTemplate(
  template: LaborTemplateInsert
): Promise<ApiResponse<LaborTemplate>> {
  try {
    const { data, error } = await supabase
      .from('labor_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update an existing labor template
 */
export async function updateLaborTemplate(
  companyId: string,
  templateId: string,
  updates: LaborTemplateUpdate
): Promise<ApiResponse<LaborTemplate>> {
  try {
    const { data, error } = await supabase
      .from('labor_templates')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete a labor template (soft delete)
 */
export async function deleteLaborTemplate(
  companyId: string,
  templateId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('labor_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', templateId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =====================================================
// TEMPLATE LABOR ITEMS
// =====================================================

/**
 * Get all labor items for a template
 */
export async function getTemplateLaborItems(
  templateId: string
): Promise<ApiResponse<TemplateLaborItem[]>> {
  try {
    const { data, error } = await supabase
      .from('template_labor_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order')

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Add a single labor item to a template
 */
export async function addLaborItemToTemplate(
  item: TemplateLaborItemInsert
): Promise<ApiResponse<TemplateLaborItem>> {
  try {
    const { data, error } = await supabase
      .from('template_labor_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Add multiple labor items to a template in bulk
 */
export async function bulkAddLaborItemsToTemplate(
  templateId: string,
  items: Omit<TemplateLaborItemInsert, 'template_id'>[]
): Promise<ApiResponse<TemplateLaborItem[]>> {
  try {
    const itemsWithTemplate = items.map((item, index) => ({
      ...item,
      template_id: templateId,
      sort_order: item.sort_order ?? index,
    }))

    const { data, error } = await supabase
      .from('template_labor_items')
      .insert(itemsWithTemplate)
      .select()

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a labor item in a template
 */
export async function updateTemplateLaborItem(
  itemId: string,
  updates: TemplateLaborItemUpdate
): Promise<ApiResponse<TemplateLaborItem>> {
  try {
    const { data, error } = await supabase
      .from('template_labor_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Remove a labor item from a template
 */
export async function removeLaborItemFromTemplate(
  itemId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('template_labor_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a template with all its labor items
 */
export async function getLaborTemplateWithItems(
  companyId: string,
  templateId: string
): Promise<ApiResponse<LaborTemplateWithItems>> {
  try {
    // Get template
    const templateResult = await getLaborTemplate(companyId, templateId)
    if (templateResult.error || !templateResult.data) {
      return createErrorResponse(templateResult.error || new Error('Template not found'))
    }

    // Get items
    const itemsResult = await getTemplateLaborItems(templateId)
    if (itemsResult.error) {
      return createErrorResponse(itemsResult.error)
    }

    const templateWithItems: LaborTemplateWithItems = {
      ...templateResult.data,
      items: itemsResult.data || [],
    }

    return { data: templateWithItems, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
