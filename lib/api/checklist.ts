import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'

export interface LeadChecklistItem {
  id: string
  company_id: string
  lead_id: string
  stage: string
  item_key: string
  item_label: string
  is_completed: boolean
  completed_at?: string
  completed_by?: string
  display_order: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

/**
 * Get checklist items for a specific lead
 */
export async function getLeadChecklistItems(
  companyId: string,
  leadId: string
): Promise<ApiResponse<LeadChecklistItem[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_checklist_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('stage')
      .order('display_order')

    if (error) {
      console.error('Get checklist items error:', error)
      return createErrorResponse(error)
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Get checklist items exception:', error)
    return createErrorResponse(error)
  }
}

/**
 * Toggle a checklist item's completion status
 */
export async function toggleChecklistItem(
  companyId: string,
  itemId: string,
  isCompleted: boolean,
  userId?: string
): Promise<ApiResponse<LeadChecklistItem>> {
  try {
    const supabase = createClient()
    
    const updates: any = {
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    }

    if (isCompleted) {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = userId
    } else {
      updates.completed_at = null
      updates.completed_by = null
    }

    const { data, error } = await supabase
      .from('lead_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) {
      console.error('Toggle checklist item error:', error)
      return createErrorResponse(error)
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Toggle checklist item exception:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create checklist items for a lead's current stage
 * (Usually auto-created by database trigger, but this can be used manually)
 */
export async function createChecklistItemsForStage(
  companyId: string,
  leadId: string,
  stage: string,
  items: Array<{ key: string; label: string; order: number }>
): Promise<ApiResponse<LeadChecklistItem[]>> {
  try {
    const supabase = createClient()
    
    const itemsToInsert = items.map(item => ({
      company_id: companyId,
      lead_id: leadId,
      stage,
      item_key: item.key,
      item_label: item.label,
      display_order: item.order,
    }))

    const { data, error } = await supabase
      .from('lead_checklist_items')
      .insert(itemsToInsert)
      .select()

    if (error) {
      console.error('Create checklist items error:', error)
      return createErrorResponse(error)
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Create checklist items exception:', error)
    return createErrorResponse(error)
  }
}
