'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateCommissionPlan, useUpdateCommissionPlan } from '@/lib/hooks/use-commission-plans'
import type { CommissionPlan } from '@/lib/types/users'

const tierSchema = z.object({
  min: z.coerce.number().min(0),
  max: z.coerce.number().optional(),
  rate: z.coerce.number().min(0),
})

const baseSchema = z.object({
  plan_name: z.string().min(2, 'Plan name must be at least 2 characters'),
  commission_type: z.enum(['percentage', 'flat_per_job', 'tiered', 'hourly_plus', 'salary_plus']),
  calculate_on: z.enum(['revenue', 'profit', 'collected']),
  paid_when: z.enum(['signed', 'deposit', 'completed', 'collected']),
})

const commissionPlanSchema = z.discriminatedUnion('commission_type', [
  baseSchema.extend({
    commission_type: z.literal('percentage'),
    percentage_rate: z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  }),
  baseSchema.extend({
    commission_type: z.literal('flat_per_job'),
    flat_amount: z.coerce.number().min(0, 'Amount must be positive'),
  }),
  baseSchema.extend({
    commission_type: z.literal('tiered'),
    tiers: z.array(tierSchema).min(1, 'At least one tier is required'),
  }),
  baseSchema.extend({
    commission_type: z.literal('hourly_plus'),
    hourly_rate: z.coerce.number().min(0, 'Hourly rate must be positive'),
    percentage_rate: z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  }),
  baseSchema.extend({
    commission_type: z.literal('salary_plus'),
    salary_amount: z.coerce.number().min(0, 'Salary must be positive'),
    percentage_rate: z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  }),
])

type CommissionPlanFormData = z.infer<typeof commissionPlanSchema>

interface CommissionPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: CommissionPlan
}

export function CommissionPlanDialog({
  open,
  onOpenChange,
  plan,
}: CommissionPlanDialogProps) {
  const createPlan = useCreateCommissionPlan()
  const updatePlan = useUpdateCommissionPlan()

  const [tiers, setTiers] = useState<Array<{ min: number; max?: number; rate: number }>>([
    { min: 0, max: 10000, rate: 5 },
  ])

  const form = useForm<CommissionPlanFormData>({
    resolver: zodResolver(commissionPlanSchema),
    defaultValues: {
      plan_name: '',
      commission_type: 'percentage',
      calculate_on: 'revenue',
      paid_when: 'collected',
      percentage_rate: 10,
    } as any,
  })

  const commissionType = form.watch('commission_type')

  useEffect(() => {
    if (plan) {
      form.reset({
        plan_name: plan.plan_name,
        commission_type: plan.commission_type as any,
        calculate_on: plan.calculate_on,
        paid_when: plan.paid_when,
        percentage_rate: plan.percentage_rate || undefined,
        flat_amount: plan.flat_amount || undefined,
        hourly_rate: plan.hourly_rate || undefined,
        salary_amount: plan.salary_amount || undefined,
        tiers: plan.tiers as any,
      } as any)

      if (plan.tiers && Array.isArray(plan.tiers)) {
        setTiers(plan.tiers as any)
      }
    } else {
      form.reset({
        plan_name: '',
        commission_type: 'percentage',
        calculate_on: 'revenue',
        paid_when: 'collected',
        percentage_rate: 10,
      } as any)
      setTiers([{ min: 0, max: 10000, rate: 5 }])
    }
  }, [plan, form])

  const onSubmit = async (data: CommissionPlanFormData) => {
    const planData: any = {
      name: data.plan_name, // Map to actual DB column
      commission_type: data.commission_type,
      calculate_on: data.calculate_on,
      paid_when: data.paid_when,
      commission_rate: null, // Use actual DB column name
      flat_amount: null,
      hourly_rate: null,
      salary_amount: null,
      tier_structure: null, // Use actual DB column name
    }

    // Set type-specific fields
    if (data.commission_type === 'percentage') {
      planData.commission_rate = data.percentage_rate // Map to database column
    } else if (data.commission_type === 'flat_per_job') {
      planData.flat_amount = data.flat_amount
    } else if (data.commission_type === 'tiered') {
      planData.tier_structure = tiers // Map to database column
    } else if (data.commission_type === 'hourly_plus') {
      planData.hourly_rate = data.hourly_rate
      planData.commission_rate = data.percentage_rate // Map to database column
    } else if (data.commission_type === 'salary_plus') {
      planData.salary_amount = data.salary_amount
      planData.commission_rate = data.percentage_rate // Map to database column
    }

    if (plan) {
      await updatePlan.mutateAsync({ planId: plan.id, updates: planData })
    } else {
      await createPlan.mutateAsync(planData)
    }

    onOpenChange(false)
  }

  const addTier = () => {
    setTiers([...tiers, { min: 0, rate: 5 }])
  }

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: keyof typeof tiers[0], value: any) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setTiers(newTiers)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Commission Plan' : 'Create Commission Plan'}</DialogTitle>
          <DialogDescription>
            {plan
              ? 'Update the commission plan details'
              : 'Create a new commission plan for your team members'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="plan_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard Sales Commission" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat_per_job">Flat Per Job</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                        <SelectItem value="hourly_plus">Hourly + Commission</SelectItem>
                        <SelectItem value="salary_plus">Salary + Commission</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Type-specific fields */}
              {commissionType === 'percentage' && (
                <FormField
                  control={form.control}
                  name="percentage_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage Rate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="10" {...field} />
                      </FormControl>
                      <FormDescription>Percentage of the sale (0-100)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {commissionType === 'flat_per_job' && (
                <FormField
                  control={form.control}
                  name="flat_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flat Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="500" {...field} />
                      </FormControl>
                      <FormDescription>Fixed amount per job</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {commissionType === 'tiered' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Commission Tiers</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addTier}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Tier
                    </Button>
                  </div>
                  {tiers.map((tier, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={tier.min}
                          onChange={(e) => updateTier(index, 'min', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          type="number"
                          placeholder="Max (optional)"
                          value={tier.max || ''}
                          onChange={(e) =>
                            updateTier(index, 'max', e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate %"
                          value={tier.rate}
                          onChange={(e) => updateTier(index, 'rate', parseFloat(e.target.value))}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(index)}
                        disabled={tiers.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <FormDescription>
                    Define commission rates based on sales thresholds
                  </FormDescription>
                </div>
              )}

              {commissionType === 'hourly_plus' && (
                <>
                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="25" {...field} />
                        </FormControl>
                        <FormDescription>Base hourly rate</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="percentage_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Percentage</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5" {...field} />
                        </FormControl>
                        <FormDescription>Additional percentage commission</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {commissionType === 'salary_plus' && (
                <>
                  <FormField
                    control={form.control}
                    name="salary_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Salary</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5000" {...field} />
                        </FormControl>
                        <FormDescription>Base monthly salary</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="percentage_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Percentage</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="2" {...field} />
                        </FormControl>
                        <FormDescription>Additional percentage commission</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="calculate_on"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calculate Commission On</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="revenue">Total Revenue</SelectItem>
                        <SelectItem value="profit">Profit Margin</SelectItem>
                        <SelectItem value="collected">Collected Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What amount should the commission be calculated from?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_when"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Paid When</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="signed">Quote Signed</SelectItem>
                        <SelectItem value="deposit">Deposit Received</SelectItem>
                        <SelectItem value="completed">Job Completed</SelectItem>
                        <SelectItem value="collected">Payment Collected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      When should the commission be paid to the employee?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createPlan.isPending || updatePlan.isPending}
          >
            {createPlan.isPending || updatePlan.isPending
              ? 'Saving...'
              : plan
              ? 'Update Plan'
              : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
