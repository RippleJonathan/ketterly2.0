// Commission Plans API Functions
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  CommissionPlan,
  CommissionPlanInsert,
  CommissionPlanUpdate,
} from '@/lib/types/users'

// =====================================================
// GET COMMISSION PLANS
// =====================================================

export async function getCommissionPlans(
  companyId: string,
  includeInactive = false
): Promise<ApiResponse<CommissionPlan[]>> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('commission_plans')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as CommissionPlan[], error: null, count: count || undefined }
  } catch (error) {
    console.error('Failed to fetch commission plans:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET COMMISSION PLAN BY ID
// =====================================================

export async function getCommissionPlanById(
  planId: string,
  companyId: string
): Promise<ApiResponse<CommissionPlan>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('commission_plans')
      .select('*')
      .eq('id', planId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to fetch commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE COMMISSION PLAN
// =====================================================

export async function createCommissionPlan(
  companyId: string,
  plan: CommissionPlanInsert,
  createdBy?: string
): Promise<ApiResponse<CommissionPlan>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('commission_plans')
      .insert({
        ...plan,
        company_id: companyId,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to create commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE COMMISSION PLAN
// =====================================================

export async function updateCommissionPlan(
  planId: string,
  companyId: string,
  updates: CommissionPlanUpdate
): Promise<ApiResponse<CommissionPlan>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('commission_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to update commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DELETE COMMISSION PLAN (Soft delete)
// =====================================================

export async function deleteCommissionPlan(
  planId: string,
  companyId: string
): Promise<ApiResponse<void>> {
  const supabase = createClient()
  try {
    // Check if any users are using this plan
    const { data: users, error: checkError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('commission_plan_id', planId)
      .is('deleted_at', null)
      .limit(5)

    if (checkError) throw checkError

    if (users && users.length > 0) {
      const userNames = users.map((u: any) => u.full_name).join(', ')
      throw new Error(
        `Cannot delete plan: ${users.length} user(s) are using it (${userNames}${users.length > 5 ? '...' : ''})`
      )
    }

    const { error } = await supabase
      .from('commission_plans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to delete commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DEACTIVATE COMMISSION PLAN
// =====================================================

export async function deactivateCommissionPlan(
  planId: string,
  companyId: string
): Promise<ApiResponse<CommissionPlan>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('commission_plans')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to deactivate commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// REACTIVATE COMMISSION PLAN
// =====================================================

export async function reactivateCommissionPlan(
  planId: string,
  companyId: string
): Promise<ApiResponse<CommissionPlan>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('commission_plans')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to reactivate commission plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET USERS USING PLAN
// =====================================================

export async function getUsersUsingPlan(
  planId: string,
  companyId: string
): Promise<ApiResponse<Array<{ id: string; full_name: string; avatar_url: string | null }>>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('commission_plan_id', planId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to fetch users using plan:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CALCULATE COMMISSION (Helper function)
// =====================================================

export interface CommissionCalculationInput {
  plan: CommissionPlan
  revenue: number
  profit: number
  collected: number
}

export function calculateCommission(input: CommissionCalculationInput): number {
  const { plan, revenue, profit, collected } = input

  // Determine base amount to calculate on
  let baseAmount = 0
  switch (plan.calculate_on) {
    case 'revenue':
      baseAmount = revenue
      break
    case 'profit':
      baseAmount = profit
      break
    case 'collected':
      baseAmount = collected
      break
  }

  // Calculate commission based on type
  let commission = 0

  switch (plan.commission_type) {
    case 'percentage':
      commission = baseAmount * ((plan.commission_rate || 0) / 100)
      break

    case 'flat_per_job':
      commission = plan.flat_amount || 0
      break

    case 'tiered':
      if (plan.tier_structure) {
        // Find applicable tier
        const tier = plan.tier_structure.find(
          t => baseAmount >= t.min && (t.max === null || baseAmount <= t.max)
        )
        if (tier) {
          commission = baseAmount * (tier.rate / 100)
        }
      }
      break

    case 'hourly_plus':
      // This would require hours worked - not calculated here
      // Would be handled separately with time tracking
      commission = 0
      break

    case 'salary_plus':
      // Salary is base pay, commission is on top
      commission = baseAmount * ((plan.commission_rate || 0) / 100)
      break
  }

  return Math.round(commission * 100) / 100 // Round to 2 decimals
}
