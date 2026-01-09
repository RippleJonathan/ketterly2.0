// Lead Commission Types

import { User } from './users'

export type CommissionType = 'percentage' | 'flat_amount' | 'custom'
export type CommissionPaidWhen = 'when_deposit_paid' | 'when_job_completed' | 'when_final_payment' | 'custom'
export type CommissionStatus = 'pending' | 'eligible' | 'approved' | 'paid' | 'cancelled'

export interface LeadCommission {
  id: string
  company_id: string
  lead_id: string
  user_id: string
  commission_plan_id: string | null
  
  // Commission structure
  commission_type: CommissionType
  commission_rate: number | null // percentage if type is percentage
  flat_amount: number | null // dollar amount if type is flat
  calculated_amount: number // final commission owed
  base_amount: number // what commission is calculated on (quote total, revenue, etc.)
  paid_amount: number // total amount already paid (for handling partial payments)
  balance_owed: number // new amount - already paid (can be negative for chargebacks)
  
  // Payment trigger
  paid_when: CommissionPaidWhen
  triggered_by_payment_id: string | null // payment that triggered eligibility
  
  // Approval tracking
  approved_by_user_id: string | null
  approved_at: string | null
  
  // Payment tracking
  paid_date: string | null
  payment_reference: string | null
  
  // Status tracking
  status: CommissionStatus
  paid_at: string | null // DEPRECATED: use paid_date instead
  paid_by: string | null // DEPRECATED: use approved_by_user_id instead
  payment_notes: string | null
  notes: string | null
  
  // Metadata
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations (optional)
  user?: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>
  paid_by_user?: Pick<User, 'id' | 'full_name'>
  approved_by_user?: Pick<User, 'id' | 'full_name'>
  triggered_by_payment?: {
    id: string
    amount: number
    payment_date: string
    payment_method: string
  }
  commission_plan?: {
    id: string
    name: string
    commission_type: string
    commission_rate: number
  }
}

export interface LeadCommissionInsert {
  lead_id: string
  user_id: string
  commission_plan_id?: string | null
  commission_type: CommissionType
  commission_rate?: number | null
  flat_amount?: number | null
  calculated_amount: number
  base_amount: number
  paid_when: CommissionPaidWhen
  notes?: string | null
  created_by?: string | null
}

export interface LeadCommissionUpdate {
  commission_plan_id?: string | null
  commission_type?: CommissionType
  commission_rate?: number | null
  flat_amount?: number | null
  calculated_amount?: number
  base_amount?: number
  balance_owed?: number
  paid_when?: CommissionPaidWhen
  status?: CommissionStatus
  notes?: string | null
}

export interface LeadCommissionFilters {
  user_id?: string
  lead_id?: string
  status?: CommissionStatus | CommissionStatus[]
  paid_when?: CommissionPaidWhen
}

export interface LeadCommissionWithRelations extends LeadCommission {
  user: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>
  paid_by_user?: Pick<User, 'id' | 'full_name'>
  approved_by_user?: Pick<User, 'id' | 'full_name'>
  lead?: {
    id: string
    full_name: string
    address: string
  }
}

export interface CommissionSummary {
  total_owed: number
  total_paid: number
  total_pending: number
  total_approved: number
  total_cancelled: number
  count_paid: number
  count_pending: number
  count_approved: number
}

// Helper type for form data
export interface CommissionFormData {
  user_id: string
  commission_plan_id?: string
  commission_type: CommissionType
  commission_rate?: number
  flat_amount?: number
  base_amount: number
  paid_when: CommissionPaidWhen
  notes?: string
}
