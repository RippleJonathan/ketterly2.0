'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, DollarSign, Percent, TrendingUp } from 'lucide-react'
import { useCommissionPlans, useDeactivateCommissionPlan, useDeleteCommissionPlan } from '@/lib/hooks/use-commission-plans'
import { useReactivateCommissionPlan } from '@/lib/hooks/use-commission-plans'
import { CommissionPlanDialog } from './commission-plan-dialog'
import type { CommissionPlan } from '@/lib/types/users'

export function CommissionPlansList() {
  const { data: response } = useCommissionPlans()
  const reactivatePlan = useReactivateCommissionPlan()
  const deactivatePlan = useDeactivateCommissionPlan()
  const deletePlan = useDeleteCommissionPlan()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CommissionPlan | undefined>()

  const plans = response?.data || []

  const handleEdit = (plan: CommissionPlan) => {
    setEditingPlan(plan)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingPlan(undefined)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingPlan(undefined)
  }

  const handleActivate = async (planId: string) => {
    await reactivatePlan.mutateAsync(planId)
  }

  const handleDeactivate = async (planId: string) => {
    if (confirm('Are you sure you want to deactivate this commission plan? Users with this plan will not earn commissions.')) {
      await deactivatePlan.mutateAsync(planId)
    }
  }

  const handleDelete = async (planId: string) => {
    if (confirm('Are you sure you want to delete this commission plan? This action cannot be undone.')) {
      await deletePlan.mutateAsync(planId)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />
      case 'flat_per_job':
        return <DollarSign className="h-4 w-4" />
      case 'tiered':
        return <TrendingUp className="h-4 w-4" />
      case 'hourly_plus':
        return <DollarSign className="h-4 w-4" />
      case 'salary_plus':
        return <DollarSign className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'Percentage'
      case 'flat_per_job':
        return 'Flat Per Job'
      case 'tiered':
        return 'Tiered'
      case 'hourly_plus':
        return 'Hourly + Commission'
      case 'salary_plus':
        return 'Salary + Commission'
      default:
        return type
    }
  }

  const getCalculationLabel = (calculateOn: string) => {
    switch (calculateOn) {
      case 'revenue':
        return 'Revenue'
      case 'profit':
        return 'Profit'
      case 'collected':
        return 'Collected'
      default:
        return calculateOn
    }
  }

  const getPaidWhenLabel = (paidWhen: string) => {
    switch (paidWhen) {
      case 'signed':
        return 'When Signed'
      case 'deposit':
        return 'When Deposit Paid'
      case 'completed':
        return 'When Completed'
      case 'collected':
        return 'When Collected'
      default:
        return paidWhen
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Commission Plan
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rate/Amount</TableHead>
              <TableHead>Calculate On</TableHead>
              <TableHead>Paid When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No commission plans yet. Create your first plan to get started.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.plan_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(plan.commission_type)}
                      <span className="text-sm">{getTypeLabel(plan.commission_type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.commission_type === 'percentage' && `${plan.percentage_rate}%`}
                    {plan.commission_type === 'flat_per_job' && `$${plan.flat_amount}`}
                    {plan.commission_type === 'tiered' && 'Tiered Structure'}
                    {plan.commission_type === 'hourly_plus' && `$${plan.hourly_rate}/hr + ${plan.percentage_rate}%`}
                    {plan.commission_type === 'salary_plus' && `$${plan.salary_amount}/mo + ${plan.percentage_rate}%`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getCalculationLabel(plan.calculate_on)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getPaidWhenLabel(plan.paid_when)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {plan.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(plan)}>
                          Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {plan.is_active ? (
                          <DropdownMenuItem onClick={() => handleDeactivate(plan.id)}>
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleActivate(plan.id)}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(plan.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CommissionPlanDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        plan={editingPlan}
      />
    </div>
  )
}
