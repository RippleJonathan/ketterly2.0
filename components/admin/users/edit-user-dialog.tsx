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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useUpdateUser } from '@/lib/hooks/use-users'
import { useCommissionPlans } from '@/lib/hooks/use-commission-plans'
import { UserWithRelations } from '@/lib/types/users'

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['super_admin', 'admin', 'manager', 'user']),
  phone: z.string().optional(),
  commission_plan_id: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.string().optional(), // Comma-separated
  certifications: z.string().optional(), // Comma-separated
  assigned_territories: z.string().optional(), // Comma-separated
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

  const plans = plansResponse?.data || []

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      commission_plan_id: user.commission_plan_id || '',
      bio: user.bio || '',
      specialties: user.specialties?.join(', ') || '',
      certifications: user.certifications?.join(', ') || '',
      assigned_territories: user.assigned_territories?.join(', ') || '',
    },
  })

  // Update form when user changes
  useEffect(() => {
    form.reset({
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      commission_plan_id: user.commission_plan_id || '',
      bio: user.bio || '',
      specialties: user.specialties?.join(', ') || '',
      certifications: user.certifications?.join(', ') || '',
      assigned_territories: user.assigned_territories?.join(', ') || '',
    })
  }, [user, form])

  const onSubmit = async (data: EditUserFormData) => {
    const updates: any = {
      full_name: data.full_name,
      role: data.role,
      phone: data.phone || null,
      commission_plan_id: data.commission_plan_id || null,
      bio: data.bio || null,
      specialties: data.specialties
        ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      certifications: data.certifications
        ? data.certifications.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      assigned_territories: data.assigned_territories
        ? data.assigned_territories.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
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

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description about this user..."
                        className="resize-none"
                        {...field}
                      />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="">None</SelectItem>
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

            {/* Professional Info */}
            <div className="space-y-4 border-t pt-4">
              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties</FormLabel>
                    <FormControl>
                      <Input placeholder="Asphalt Shingles, Metal Roofing" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certifications</FormLabel>
                    <FormControl>
                      <Input placeholder="GAF Master Elite, OSHA 10" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_territories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Territories</FormLabel>
                    <FormControl>
                      <Input placeholder="Dallas, Fort Worth" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list</FormDescription>
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
