import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'
import { Lead, LeadInsert, LeadUpdate, LeadFilters, LeadWithUser } from '@/lib/types'
import { LeadStatus, LeadSubStatus } from '@/lib/types/enums'
import { 
  validateStatusTransition, 
  getTargetSubStatus,
  type StatusTransition 
} from '@/lib/utils/status-transitions'

export async function getLeads(
  companyId: string,
  filters?: LeadFilters
): Promise<ApiResponse<Lead[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.source) {
      if (Array.isArray(filters.source)) {
        query = query.in('source', filters.source)
      } else {
        query = query.eq('source', filters.source)
      }
    }

    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority)
      } else {
        query = query.eq('priority', filters.priority)
      }
    }

    if (filters?.service_type) {
      if (Array.isArray(filters.service_type)) {
        query = query.in('service_type', filters.service_type)
      } else {
        query = query.eq('service_type', filters.service_type)
      }
    }

    if (filters?.assigned_to !== undefined) {
      if (filters.assigned_to === null) {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', filters.assigned_to)
      }
    }

    // Multi-location filtering: If location_id is an array, show leads from all those locations
    if (filters?.location_id) {
      if (Array.isArray(filters.location_id)) {
        query = query.in('location_id', filters.location_id)
      } else {
        query = query.eq('location_id', filters.location_id)
      }
    }

    if (filters?.created_from) {
      query = query.gte('created_at', filters.created_from)
    }

    if (filters?.created_to) {
      query = query.lte('created_at', filters.created_to)
    }

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) throw error
    return createSuccessResponse(data || [], count ?? undefined)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function getLead(
  companyId: string,
  leadId: string
): Promise<ApiResponse<LeadWithUser>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        sales_rep_user:sales_rep_id(id, full_name, email, avatar_url),
        marketing_rep_user:marketing_rep_id(id, full_name, email, avatar_url),
        sales_manager_user:sales_manager_id(id, full_name, email, avatar_url),
        production_manager_user:production_manager_id(id, full_name, email, avatar_url),
        created_user:created_by(id, full_name, email, avatar_url)
      `)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    
    // Add backward compatibility for assigned_to
    const leadData = {
      ...data,
      assigned_to: (data as any).sales_rep_id,
      assigned_user: (data as any).sales_rep_user,
    }
    
    return createSuccessResponse(leadData)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function createLead(
  companyId: string,
  lead: LeadInsert
): Promise<ApiResponse<Lead>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...lead, company_id: companyId } as any)
      .select()
      .single()

    if (error) {
      console.error('Create lead error:', error)
      throw error
    }
    return createSuccessResponse(data)
  } catch (error) {
    console.error('Create lead exception:', error)
    return createErrorResponse(error)
  }
}

export async function updateLead(
  companyId: string,
  leadId: string,
  updates: LeadUpdate
): Promise<ApiResponse<Lead>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('leads')
      .update(updates as any)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      console.error('Update lead error:', error)
      throw error
    }
    return createSuccessResponse(data)
  } catch (error) {
    console.error('Update lead exception:', error)
    return createErrorResponse(error)
  }
}

export async function deleteLead(
  companyId: string,
  leadId: string
): Promise<ApiResponse<Lead>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update lead status with validation and automatic sub-status handling
 * 
 * @param companyId - Company ID for RLS
 * @param leadId - Lead to update
 * @param newStatus - Target main status
 * @param newSubStatus - Target sub-status (optional, will use default if not provided)
 * @param userId - User making the change (for permission checking)
 * @param automated - Whether this is an automated transition (default: false)
 * @param metadata - Additional metadata to store in history
 */
export async function updateLeadStatus(
  companyId: string,
  leadId: string,
  newStatus: LeadStatus,
  newSubStatus?: LeadSubStatus | null,
  userId?: string,
  automated: boolean = false,
  metadata?: Record<string, any>
): Promise<ApiResponse<Lead>> {
  try {
    const supabase = createClient()

    // Get current lead status
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('status, sub_status')
      .eq('company_id', companyId)
      .eq('id', leadId)
      .single()

    if (fetchError) throw fetchError
    if (!currentLead) throw new Error('Lead not found')

    // Determine target sub-status
    const targetSubStatus = getTargetSubStatus(newStatus, newSubStatus)

    // Validate transition
    const validation = validateStatusTransition(
      currentLead.status as LeadStatus,
      currentLead.sub_status as LeadSubStatus | null,
      newStatus,
      targetSubStatus
    )

    if (!validation.valid) {
      return createErrorResponse(new Error(validation.error))
    }

    // TODO: Check user permissions if required
    if (validation.requiresPermission && userId) {
      // For now, we'll skip permission check
      // In production, query user_permissions table
      console.warn(`Permission check needed: ${validation.requiresPermission}`)
    }

    // Update the lead status
    // The database trigger will automatically log this change to lead_status_history
    const { data, error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        sub_status: targetSubStatus,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    console.error('Update lead status exception:', error)
    return createErrorResponse(error)
  }
}

/**
 * Apply an automatic status transition
 * Convenience wrapper for automated transitions
 */
export async function applyStatusTransition(
  companyId: string,
  leadId: string,
  transition: StatusTransition,
  userId?: string
): Promise<ApiResponse<Lead>> {
  return updateLeadStatus(
    companyId,
    leadId,
    transition.to_status,
    transition.to_sub_status,
    userId,
    transition.automated,
    transition.metadata
  )
}