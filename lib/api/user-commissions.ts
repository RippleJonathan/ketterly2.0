// User Commissions API Functions
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  UserCommission,
  UserCommissionInsert,
  UserCommissionUpdate,
  CommissionStatus,
} from '@/lib/types/users'

// =====================================================
// GET USER COMMISSIONS
// =====================================================

export async function getUserCommissions(
  companyId: string,
  userId?: string,
  status?: CommissionStatus
): Promise<ApiResponse<UserCommission[]>> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('user_commissions')
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as UserCommission[], error: null, count: count || undefined }
  } catch (error) {
    console.error('Failed to fetch user commissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET COMMISSION BY ID
// =====================================================

export async function getCommissionById(
  commissionId: string,
  companyId: string
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url, phone, email),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to fetch commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE COMMISSION
// =====================================================

export async function createCommission(
  commissionData: UserCommissionInsert
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .insert(commissionData)
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to create commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE COMMISSION
// =====================================================

export async function updateCommission(
  commissionId: string,
  companyId: string,
  updates: UserCommissionUpdate
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to update commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// APPROVE COMMISSION
// =====================================================

export async function approveCommission(
  commissionId: string,
  companyId: string
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .eq('status', 'pending') // Can only approve pending commissions
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to approve commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// MARK COMMISSION AS PAID
// =====================================================

export async function markCommissionPaid(
  commissionId: string,
  companyId: string,
  paidAmount: number,
  paidDate?: string
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({ 
        status: 'paid',
        paid_amount: paidAmount,
        paid_date: paidDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .eq('status', 'approved') // Can only pay approved commissions
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to mark commission as paid:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// HOLD COMMISSION
// =====================================================

export async function holdCommission(
  commissionId: string,
  companyId: string,
  notes?: string
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({ 
        status: 'held',
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to hold commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// VOID COMMISSION
// =====================================================

export async function voidCommission(
  commissionId: string,
  companyId: string,
  notes?: string
): Promise<ApiResponse<UserCommission>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({ 
        status: 'voided',
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commissionId)
      .eq('company_id', companyId)
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        lead:leads!lead_id(id, lead_number, full_name, address),
        commission_plan:commission_plans(*)
      `)
      .single()

    if (error) throw error
    return { data: data as UserCommission, error: null }
  } catch (error) {
    console.error('Failed to void commission:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET COMMISSION SUMMARY FOR USER
// =====================================================

export interface CommissionSummary {
  total_earned: number
  total_paid: number
  total_pending: number
  total_approved: number
  total_held: number
  total_voided: number
  count_total: number
  count_pending: number
  count_approved: number
  count_paid: number
  count_held: number
  count_voided: number
}

export async function getCommissionSummary(
  companyId: string,
  userId: string
): Promise<ApiResponse<CommissionSummary>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .select('calculated_amount, paid_amount, status')
      .eq('company_id', companyId)
      .eq('user_id', userId)

    if (error) throw error

    const summary: CommissionSummary = {
      total_earned: 0,
      total_paid: 0,
      total_pending: 0,
      total_approved: 0,
      total_held: 0,
      total_voided: 0,
      count_total: data?.length || 0,
      count_pending: 0,
      count_approved: 0,
      count_paid: 0,
      count_held: 0,
      count_voided: 0,
    }

    data?.forEach(commission => {
      summary.total_earned += commission.calculated_amount

      switch (commission.status) {
        case 'pending':
          summary.total_pending += commission.calculated_amount
          summary.count_pending++
          break
        case 'approved':
          summary.total_approved += commission.calculated_amount
          summary.count_approved++
          break
        case 'paid':
          summary.total_paid += commission.paid_amount
          summary.count_paid++
          break
        case 'held':
          summary.total_held += commission.calculated_amount
          summary.count_held++
          break
        case 'voided':
          summary.total_voided += commission.calculated_amount
          summary.count_voided++
          break
      }
    })

    return { data: summary, error: null }
  } catch (error) {
    console.error('Failed to get commission summary:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET COMMISSIONS FOR LEAD
// =====================================================

export async function getCommissionsForLead(
  leadId: string,
  companyId: string
): Promise<ApiResponse<UserCommission[]>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .select(`
        *,
        user:users!user_id(id, full_name, avatar_url),
        commission_plan:commission_plans(*)
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data as UserCommission[], error: null }
  } catch (error) {
    console.error('Failed to fetch commissions for lead:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// BULK APPROVE COMMISSIONS
// =====================================================

export async function bulkApproveCommissions(
  commissionIds: string[],
  companyId: string
): Promise<ApiResponse<number>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_commissions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .in('id', commissionIds)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select('id')

    if (error) throw error
    return { data: data?.length || 0, error: null }
  } catch (error) {
    console.error('Failed to bulk approve commissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// BULK MARK PAID
// =====================================================

export async function bulkMarkPaid(
  commissionIds: string[],
  companyId: string,
  paidDate?: string
): Promise<ApiResponse<number>> {
  const supabase = createClient()
  try {
    // First get all commissions to mark them with their calculated amounts
    const { data: commissions, error: fetchError } = await supabase
      .from('user_commissions')
      .select('id, calculated_amount')
      .in('id', commissionIds)
      .eq('company_id', companyId)
      .eq('status', 'approved')

    if (fetchError) throw fetchError

    // Update each with its own calculated amount as paid amount
    const updates = commissions.map(c =>
      supabase
        .from('user_commissions')
        .update({ 
          status: 'paid',
          paid_amount: c.calculated_amount,
          paid_date: paidDate || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id)
        .eq('company_id', companyId)
    )

    await Promise.all(updates)

    return { data: commissions.length, error: null }
  } catch (error) {
    console.error('Failed to bulk mark commissions as paid:', error)
    return createErrorResponse(error)
  }
}
