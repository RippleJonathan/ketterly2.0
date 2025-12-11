'use client'

import { useState } from 'react'
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
import { useCreateUser } from '@/lib/hooks/use-users'
import { useCommissionPlans } from '@/lib/hooks/use-commission-plans'
import { useRoleTemplates } from '@/lib/hooks/use-role-templates'
import { UserRole } from '@/lib/types/users'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'office', 'sales_manager', 'sales', 'production', 'marketing']),
  phone: z.string().optional(),
  commission_plan_id: z.string().optional(),
  role_template_id: z.string().optional(),
})

type CreateUserFormData = z.infer<typeof createUserSchema>

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser()
  const { data: plansResponse } = useCommissionPlans()
  const { data: templatesResponse } = useRoleTemplates()

  const plans = plansResponse?.data || []
  const templates = templatesResponse?.data || []

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      phone: '',
      role: 'sales',
      commission_plan_id: 'none',
      role_template_id: 'none',
    },
  })

  const onSubmit = async (data: CreateUserFormData) => {
    // Convert "none" values to null for optional fields
    const submitData = {
      ...data,
      role_template_id: data.role_template_id === 'none' ? undefined : data.role_template_id,
      commission_plan_id: data.commission_plan_id === 'none' ? undefined : data.commission_plan_id,
    }
    await createUser.mutateAsync(submitData as any)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign roles and permissions
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 8 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="office">Office Staff</SelectItem>
                        <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        <SelectItem value="sales">Sales Rep</SelectItem>
                        <SelectItem value="production">Production/Crew</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Admin: Full system access | Office: Operations | Sales: Customer-facing | Production: Field work
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Template (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Apply a pre-configured set of permissions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Commission Plan */}
            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="commission_plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Plan (Optional)</FormLabel>
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
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
