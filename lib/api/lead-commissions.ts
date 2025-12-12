// Lead Commissions API Functions

import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'
import {
  LeadCommission,
  LeadCommissionInsert,
  LeadCommissionUpdate,
  LeadCommissionFilters,
  LeadCommissionWithRelations,
  CommissionSummary,
  CommissionType,
} from '@/lib/types/commissions'

/**
 * Get all commissions for a specific lead
 */
export async function getLeadCommissions(
  leadId: string,
  companyId: string
): Promise<ApiResponse<LeadCommissionWithRelations[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email, avatar_url),
        paid_by_user:users!lead_commissions_paid_by_fkey(id, full_name),
        commission_plan:commission_plans(id, name, commission_type, commission_rate)
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return createSuccessResponse(data || [])
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get all commissions for a specific user across all leads
 */
export async function getUserCommissions(
  userId: string,
  companyId: string,
  filters?: LeadCommissionFilters
): Promise<ApiResponse<LeadCommissionWithRelations[]>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email, avatar_url),
        paid_by_user:users!lead_commissions_paid_by_fkey(id, full_name),
        commission_plan:commission_plans(id, name, commission_type, commission_rate)
      `)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.paid_when) {
      query = query.eq('paid_when', filters.paid_when)
    }

    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    
    return createSuccessResponse(data || [])
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get commissions by status for reporting
 */
export async function getCommissionsByStatus(
  companyId: string,
  status: string
): Promise<ApiResponse<LeadCommissionWithRelations[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .select(`
        *,
        user:users!lead_commissions_user_id_fkey(id, full_name, email, avatar_url),
        paid_by_user:users!lead_commissions_paid_by_fkey(id, full_name)
      `)
      .eq('company_id', companyId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return createSuccessResponse(data || [])
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get commission summary for a lead
 */
export async function getLeadCommissionSummary(
  leadId: string,
  companyId: string
): Promise<ApiResponse<CommissionSummary>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .select('calculated_amount, status')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (error) throw error

    const commissions = data || []
    
    const summary: CommissionSummary = {
      total_owed: commissions.reduce((sum, c) => sum + (c.calculated_amount || 0), 0),
      total_paid: commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.calculated_amount || 0), 0),
      total_pending: commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.calculated_amount || 0), 0),
      total_approved: commissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.calculated_amount || 0), 0),
      total_cancelled: commissions
        .filter(c => c.status === 'cancelled')
        .reduce((sum, c) => sum + (c.calculated_amount || 0), 0),
      count_paid: commissions.filter(c => c.status === 'paid').length,
      count_pending: commissions.filter(c => c.status === 'pending').length,
      count_approved: commissions.filter(c => c.status === 'approved').length,
    }
    
    return createSuccessResponse(summary)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new lead commission
 */
export async function createLeadCommission(
  leadId: string,
  companyId: string,
  commissionData: LeadCommissionInsert
): Promise<ApiResponse<LeadCommission>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .insert({
        ...commissionData,
        company_id: companyId,
        lead_id: leadId,
      })
      .select()
      .single()

    if (error) throw error
    
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a lead commission
 */
export async function updateLeadCommission(
  id: string,
  companyId: string,
  updates: LeadCommissionUpdate
): Promise<ApiResponse<LeadCommission>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete a lead commission (soft delete)
 */
export async function deleteLeadCommission(
  id: string,
  companyId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('lead_commissions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) throw error
    
    return createSuccessResponse(undefined)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Mark commission as paid (handles partial payments)
 */
export async function markCommissionPaid(
  id: string,
  companyId: string,
  paidBy: string,
  paymentAmount?: number,
  paymentNotes?: string
): Promise<ApiResponse<LeadCommission>> {
  try {
    const supabase = createClient()
    
    // First get the current commission to calculate new paid_amount
    const { data: commission, error: fetchError } = await supabase
      .from('lead_commissions')
      .select('calculated_amount, paid_amount')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()
    
    if (fetchError || !commission) throw fetchError || new Error('Commission not found')
    
    const currentPaidAmount = commission.paid_amount || 0
    const calculatedAmount = commission.calculated_amount || 0
    
    // If no payment amount specified, pay the remaining balance
    const paymentToAdd = paymentAmount || (calculatedAmount - currentPaidAmount)
    const newPaidAmount = currentPaidAmount + paymentToAdd
    
    // Determine if fully paid
    const isFullyPaid = newPaidAmount >= calculatedAmount
    
    const { data, error } = await supabase
      .from('lead_commissions')
      .update({
        status: isFullyPaid ? 'paid' : 'pending',
        paid_amount: newPaidAmount,
        paid_at: isFullyPaid ? new Date().toISOString() : null,
        paid_by: isFullyPaid ? paidBy : null,
        payment_notes: paymentNotes || null,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Calculate commission amount based on type and rate
 */
export function calculateCommission(
  commissionType: CommissionType,
  rateOrAmount: number,
  baseAmount: number
): number {
  switch (commissionType) {
    case 'percentage':
      return baseAmount * (rateOrAmount / 100)
    case 'flat_amount':
      return rateOrAmount
    case 'custom':
      return rateOrAmount
    default:
      return 0
  }
}
