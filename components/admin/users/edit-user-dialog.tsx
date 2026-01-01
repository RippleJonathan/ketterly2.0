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
import { useCommissionPlans } from '@/lib/hooks/use-commission-plans'
import { UserWithRelations } from '@/lib/types/users'

const editUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'office', 'sales_manager', 'sales', 'production', 'marketing']),
  commission_plan_id: z.string().optional(),
})

type EditUserFormData = z.infer<typeof editUserSchema>

interface EditUserDialogProps {
  user: UserWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const updateUser = useUpdateUser()
  const { data: plansResponse } = useCommissionPlans()
  const { data: currentUserData } = useCurrentUser()
  const currentUser = currentUserData?.data

  const plans = plansResponse?.data || []

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      commission_plan_id: user.commission_plan_id || '',
    },
  })

  // Update form when user changes
  useEffect(() => {
    form.reset({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      commission_plan_id: user.commission_plan_id || 'none',
    })
  }, [user, form])

  const onSubmit = async (data: EditUserFormData) => {
    const updates: any = {
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone || null,
      commission_plan_id: data.commission_plan_id === 'none' ? null : data.commission_plan_id,
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
            Update user information, role, and commission plan
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

              <FormField
                control={form.control}
                name="commission_plan_id"
                render={({ field}) => (
                  <FormItem>
                    <FormLabel>Commission Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a commission plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
