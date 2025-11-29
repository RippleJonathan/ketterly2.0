import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'
import { Lead, LeadInsert, LeadUpdate, LeadFilters, LeadWithUser } from '@/lib/types'

export async function getLeads(
  companyId: string,
  filters?: LeadFilters
): ApiResponse<Lead[]> {
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

    if (filters?.assigned_to !== undefined) {
      if (filters.assigned_to === null) {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', filters.assigned_to)
      }
    }

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) throw error
    return createSuccessResponse(data || [], count)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function getLead(
  companyId: string,
  leadId: string
): ApiResponse<LeadWithUser> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_user:assigned_to(id, full_name, email, avatar_url),
        created_user:created_by(id, full_name, email, avatar_url)
      `)
      .eq('company_id', companyId)
      .eq('id', leadId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function createLead(
  companyId: string,
  lead: LeadInsert
): ApiResponse<Lead> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...lead, company_id: companyId })
      .select()
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function updateLead(
  companyId: string,
  leadId: string,
  updates: LeadUpdate
): ApiResponse<Lead> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
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

export async function deleteLead(
  companyId: string,
  leadId: string
): ApiResponse<Lead> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
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
