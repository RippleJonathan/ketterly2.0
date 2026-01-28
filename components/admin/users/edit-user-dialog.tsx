'use client'

import { useEffect } from 'react'
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
import { useUpdateUser } from '@/lib/hooks/use-users'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { UserWithRelations } from '@/lib/types/users'

const editUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'office', 'sales_manager', 'sales', 'production', 'marketing']),
  // Role-based commission rates
  sales_commission_type: z.enum(['percentage', 'flat_amount']).optional().nullable(),
  sales_commission_rate: z.number().min(0).max(100).optional().nullable(),
  sales_flat_amount: z.number().min(0).optional().nullable(),
  sales_paid_when: z.enum(['when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom']).optional().nullable(),
  marketing_commission_type: z.enum(['percentage', 'flat_amount']).optional().nullable(),
  marketing_commission_rate: z.number().min(0).max(100).optional().nullable(),
  marketing_flat_amount: z.number().min(0).optional().nullable(),
  marketing_paid_when: z.enum(['when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom']).optional().nullable(),
  production_commission_type: z.enum(['percentage', 'flat_amount']).optional().nullable(),
  production_commission_rate: z.number().min(0).max(100).optional().nullable(),
  production_flat_amount: z.number().min(0).optional().nullable(),
  production_paid_when: z.enum(['when_deposit_paid', 'when_job_completed', 'when_final_payment', 'custom']).optional().nullable(),
})

type EditUserFormData = z.infer<typeof editUserSchema>

interface EditUserDialogProps {
  user: UserWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const updateUser = useUpdateUser()
  const { data: currentUserData } = useCurrentUser()
  const currentUser = currentUserData?.data

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      sales_commission_type: user.sales_commission_type || null,
      sales_commission_rate: user.sales_commission_rate || null,
      sales_flat_amount: user.sales_flat_amount || null,
      sales_paid_when: user.sales_paid_when || 'when_final_payment',
      marketing_commission_type: user.marketing_commission_type || null,
      marketing_commission_rate: user.marketing_commission_rate || null,
      marketing_flat_amount: user.marketing_flat_amount || null,
      marketing_paid_when: user.marketing_paid_when || 'when_final_payment',
      production_commission_type: user.production_commission_type || null,
      production_commission_rate: user.production_commission_rate || null,
      production_flat_amount: user.production_flat_amount || null,
      production_paid_when: user.production_paid_when || 'when_final_payment',
    },
  })

  // Update form when user changes
  useEffect(() => {
    form.reset({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      sales_commission_type: user.sales_commission_type || null,
      sales_commission_rate: user.sales_commission_rate || null,
      sales_flat_amount: user.sales_flat_amount || null,
      sales_paid_when: user.sales_paid_when || 'when_final_payment',
      marketing_commission_type: user.marketing_commission_type || null,
      marketing_commission_rate: user.marketing_commission_rate || null,
      marketing_flat_amount: user.marketing_flat_amount || null,
      marketing_paid_when: user.marketing_paid_when || 'when_final_payment',
      production_commission_type: user.production_commission_type || null,
      production_commission_rate: user.production_commission_rate || null,
      production_flat_amount: user.production_flat_amount || null,
      production_paid_when: user.production_paid_when || 'when_final_payment',
    })
  }, [user, form])

  const onSubmit = async (data: EditUserFormData) => {
    const updates: any = {
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone || null,
      sales_commission_type: data.sales_commission_type || null,
      sales_commission_rate: data.sales_commission_rate || null,
      sales_flat_amount: data.sales_flat_amount || null,
      sales_paid_when: data.sales_paid_when || 'when_final_payment',
      marketing_commission_type: data.marketing_commission_type || null,
      marketing_commission_rate: data.marketing_commission_rate || null,
      marketing_flat_amount: data.marketing_flat_amount || null,
      marketing_paid_when: data.marketing_paid_when || 'when_final_payment',
      production_commission_type: data.production_commission_type || null,
      production_commission_rate: data.production_commission_rate || null,
      production_flat_amount: data.production_flat_amount || null,
      production_paid_when: data.production_paid_when || 'when_final_payment',
    }

    await updateUser.mutateAsync({ userId: user.id, updates })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, role, and commission settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role & Permissions */}
            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={currentUser?.id === user?.id}  // Users cannot change their own role
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Admin/super_admin can assign any role */}
                        {currentUser?.role && ['admin', 'super_admin'].includes(currentUser.role) && (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="office">Office Staff</SelectItem>
                          </>
                        )}
                        {/* All authorized users can assign these roles */}
                        <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        <SelectItem value="sales">Sales Rep</SelectItem>
                        <SelectItem value="production">Production/Crew</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    {currentUser?.id === user?.id && (
                      <FormDescription className="text-amber-600">
                        You cannot change your own role
                      </FormDescription>
                    )}
                    {currentUser?.role === 'office' && (
                      <FormDescription className="text-muted-foreground text-sm">
                        Office staff can assign Sales, Production, and Marketing roles only
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}  
              />
            </div>

            {/* Commission Settings */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Commission Settings</h3>
              <p className="text-sm text-muted-foreground">
                Set commission rates for when this user is assigned to different roles on jobs.
              </p>

              {/* Sales Commission */}
              <div className="space-y-3">
                <h4 className="font-medium">Sales Commission</h4>
                <div className="grid grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="sales_commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="flat_amount">Flat Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sales_commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="5.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sales_flat_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="100.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sales_paid_when"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid When</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || 'when_final_payment'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timing" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="when_deposit_paid">First Deposit</SelectItem>
                            <SelectItem value="when_job_completed">Job Completed</SelectItem>
                            <SelectItem value="when_final_payment">Final Payment</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Marketing Commission */}
              <div className="space-y-3">
                <h4 className="font-medium">Marketing Commission</h4>
                <div className="grid grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="marketing_commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="flat_amount">Flat Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketing_commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="3.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketing_flat_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="50.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marketing_paid_when"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid When</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || 'when_final_payment'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timing" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="when_deposit_paid">First Deposit</SelectItem>
                            <SelectItem value="when_job_completed">Job Completed</SelectItem>
                            <SelectItem value="when_final_payment">Final Payment</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Production Commission */}
              <div className="space-y-3">
                <h4 className="font-medium">Production Commission</h4>
                <div className="grid grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="production_commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="flat_amount">Flat Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="production_commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="2.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="production_flat_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="25.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="production_paid_when"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid When</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || 'when_final_payment'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timing" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="when_deposit_paid">First Deposit</SelectItem>
                            <SelectItem value="when_job_completed">Job Completed</SelectItem>
                            <SelectItem value="when_final_payment">Final Payment</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
