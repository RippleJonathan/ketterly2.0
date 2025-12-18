'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateLeadCommission, useUpdateLeadCommission } from '@/lib/hooks/use-lead-commissions'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { CommissionFormData, CommissionType, CommissionPaidWhen, LeadCommission, LeadCommissionInsert } from '@/lib/types/commissions'
import { calculateCommission } from '@/lib/api/lead-commissions'
import { formatCurrency } from '@/lib/utils/formatting'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CommissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  defaultBaseAmount?: number
  commission?: LeadCommission | null
  mode?: 'create' | 'edit'
}

const commissionTypes: { value: CommissionType; label: string }[] = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat_amount', label: 'Flat Amount' },
  { value: 'custom', label: 'Custom Amount' },
]

const paidWhenOptions: { value: CommissionPaidWhen; label: string }[] = [
  { value: 'when_deposit_paid', label: 'When Deposit Paid' },
  { value: 'when_job_completed', label: 'When Job Completed' },
  { value: 'when_final_payment', label: 'When Final Payment Received' },
  { value: 'custom', label: 'Custom Trigger' },
]

export function CommissionDialog({
  open,
  onOpenChange,
  leadId,
  defaultBaseAmount = 0,
  commission = null,
  mode = 'create',
}: CommissionDialogProps) {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const createCommission = useCreateLeadCommission()
  const updateCommission = useUpdateLeadCommission()

  const [formData, setFormData] = useState<CommissionFormData>({
    user_id: '',
    commission_plan_id: undefined,
    commission_type: 'percentage',
    commission_rate: undefined,
    flat_amount: undefined,
    base_amount: defaultBaseAmount,
    paid_when: 'when_final_payment',
    notes: undefined,
  })

  // Fetch lead data to get assigned user
  const { data: leadData } = useQuery({
    queryKey: ['lead-for-commission', leadId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', leadId)
        .single()
      return data
    },
    enabled: !!leadId && open && mode === 'create',
  })

  // Fetch assigned user's commission plan
  const { data: assignedUserPlan } = useQuery({
    queryKey: ['assigned-user-plan', leadData?.assigned_to],
    queryFn: async () => {
      if (!leadData?.assigned_to) return null
      const supabase = createClient()
      
      // Get user with their commission plan
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, commission_plan_id')
        .eq('id', leadData.assigned_to)
        .single()
      
      if (!userData?.commission_plan_id) return null
      
      // Get the commission plan details
      const { data: planData } = await supabase
        .from('commission_plans')
        .select('*')
        .eq('id', userData.commission_plan_id)
        .single()
      
      return { user: userData, plan: planData }
    },
    enabled: !!leadData?.assigned_to && open && mode === 'create',
  })

  // Update form when editing existing commission
  useEffect(() => {
    if (mode === 'edit' && commission && open) {
      setFormData({
        user_id: commission.user_id || '',
        commission_plan_id: commission.commission_plan_id || undefined,
        commission_type: commission.commission_type || 'percentage',
        commission_rate: commission.commission_rate || undefined,
        flat_amount: commission.flat_amount || undefined,
        base_amount: commission.base_amount || defaultBaseAmount,
        paid_when: commission.paid_when || 'when_final_payment',
        notes: commission.notes || undefined,
      })
    }
  }, [mode, commission, open, defaultBaseAmount])

  // Auto-populate form when creating new commission for assigned user
  useEffect(() => {
    if (mode === 'create' && open && assignedUserPlan?.user && assignedUserPlan?.plan) {
      const { user, plan } = assignedUserPlan
      setFormData({
        user_id: user.id,
        commission_plan_id: plan.id,
        commission_type: plan.commission_type as CommissionType,
        commission_rate: plan.commission_type === 'percentage' ? plan.commission_rate ?? undefined : undefined,
        flat_amount: plan.commission_type === 'flat_amount' ? plan.flat_amount ?? undefined : undefined,
        base_amount: defaultBaseAmount,
        paid_when: plan.paid_when || 'when_final_payment',
        notes: undefined,
      })
    }
  }, [mode, open, assignedUserPlan, defaultBaseAmount])

  // Fetch company users
  const { data: usersData } = useQuery({
    queryKey: ['company-users', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name')
      return data || []
    },
    enabled: !!company?.id && open,
  })

  // Fetch commission plans
  const { data: plansData } = useQuery({
    queryKey: ['commission-plans', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('commission_plans')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')
      return data || []
    },
    enabled: !!company?.id && open,
  })

  // Calculate commission amount live
  const calculatedAmount =
    formData.commission_type === 'percentage'
      ? calculateCommission('percentage', formData.commission_rate ?? 0, formData.base_amount ?? 0)
      : formData.commission_type === 'flat_amount'
      ? formData.flat_amount ?? 0
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!company?.id) {
      toast.error('Company not found')
      return
    }

    const commissionData: LeadCommissionInsert = {
      lead_id: leadId,
      user_id: formData.user_id,
      commission_plan_id: formData.commission_plan_id || null,
      commission_type: formData.commission_type,
      commission_rate: formData.commission_type === 'percentage' ? formData.commission_rate || null : null,
      flat_amount: formData.commission_type === 'flat_amount' ? formData.flat_amount || null : null,
      calculated_amount: calculatedAmount,
      base_amount: formData.base_amount ?? 0,
      paid_when: formData.paid_when,
      notes: formData.notes || null,
      created_by: currentUser?.data?.id || null,
    }

    if (mode === 'create') {
      await createCommission.mutateAsync({ leadId, data: commissionData })
    } else if (commission) {
      await updateCommission.mutateAsync({
        id: commission.id,
        leadId,
        updates: {
          commission_type: commissionData.commission_type,
          commission_rate: commissionData.commission_rate,
          flat_amount: commissionData.flat_amount,
          calculated_amount: commissionData.calculated_amount,
          base_amount: commissionData.base_amount,
          paid_when: commissionData.paid_when,
          notes: commissionData.notes,
        },
      })
    }

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      commission_plan_id: undefined,
      commission_type: 'percentage',
      commission_rate: undefined,
      flat_amount: undefined,
      base_amount: defaultBaseAmount,
      paid_when: 'when_final_payment',
      notes: undefined,
    })
  }

  const handlePlanChange = (planId: string) => {
    if (!planId) {
      setFormData({ ...formData, commission_plan_id: undefined })
      return
    }
    const plan = plansData?.find((p) => p.id === planId)
    if (plan) {
      setFormData({
        ...formData,
        commission_plan_id: planId,
        commission_type: plan.commission_type as CommissionType,
        commission_rate:
          plan.commission_type === 'percentage' ? plan.commission_rate ?? undefined : undefined,
        flat_amount:
          plan.commission_type === 'flat_amount' ? plan.flat_amount ?? undefined : undefined,
      })
    } else {
      setFormData({ ...formData, commission_plan_id: undefined })
    }
  }

  const isLoading = createCommission.isPending || updateCommission.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Commission' : 'Edit Commission'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new commission for this lead. Select a user and commission structure.' 
              : 'Update the commission details for this lead.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selector */}
          <div>
            <Label>User / Sales Rep *</Label>
            <Select
              value={formData.user_id}
              onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {usersData?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Plan (Optional) */}
          <div>
            <Label>Commission Plan (Optional)</Label>
            <Select value={formData.commission_plan_id || ''} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan or enter custom (leave blank for custom)" />
              </SelectTrigger>
              <SelectContent>
                {plansData?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} ({plan.commission_type} - {plan.commission_rate}
                    {plan.commission_type === 'percentage' ? '%' : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Type */}
          <div>
            <Label>Commission Type *</Label>
            <Select
              value={formData.commission_type}
              onValueChange={(value: CommissionType) =>
                setFormData({ ...formData, commission_type: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commissionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Rate (if percentage) */}
          {formData.commission_type === 'percentage' && (
            <div>
              <Label>Commission Rate (%) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission_rate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })
                }
                placeholder="e.g., 10"
                required
              />
            </div>
          )}

          {/* Flat Amount (if flat_amount) */}
          {formData.commission_type === 'flat_amount' && (
            <div>
              <Label>Flat Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.flat_amount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, flat_amount: parseFloat(e.target.value) })
                }
                placeholder="e.g., 500.00"
                required
              />
            </div>
          )}

          {/* Base Amount */}
          <div>
            <Label>Base Amount (what to calculate on) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.base_amount}
              onChange={(e) =>
                setFormData({ ...formData, base_amount: parseFloat(e.target.value) })
              }
              placeholder="e.g., quote total, job revenue"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Usually the quote/job total. This is what commission is calculated on.
            </p>
          </div>

          {/* Calculated Amount Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label className="text-blue-900">Calculated Commission</Label>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(calculatedAmount)}
            </p>
          </div>

          {/* Paid When */}
          <div>
            <Label>Commission Paid When *</Label>
            <Select
              value={formData.paid_when}
              onValueChange={(value: CommissionPaidWhen) =>
                setFormData({ ...formData, paid_when: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paidWhenOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this commission"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Commission' : 'Update Commission'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
