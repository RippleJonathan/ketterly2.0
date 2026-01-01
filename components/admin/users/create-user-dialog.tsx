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
import { useManagedLocations } from '@/lib/hooks/use-location-admin'
import { useAssignUserToLocation } from '@/lib/hooks/use-location-users'
import { useLocations } from '@/lib/hooks/use-locations'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { getLocationRoleFromCompanyRole } from '@/lib/utils/location-roles'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'office', 'sales_manager', 'sales', 'production', 'marketing']),
  phone: z.string().optional(),
  commission_plan_id: z.string().optional(),
  role_template_id: z.string().optional(),
  location_id: z.string().optional(),
})

type CreateUserFormData = z.infer<typeof createUserSchema>

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser()
  const assignUserToLocation = useAssignUserToLocation()
  const { data: plansResponse } = useCommissionPlans()
  const { data: templatesResponse } = useRoleTemplates()
  const { data: locationsResponse } = useLocations()
  const { isCompanyAdmin, isLocationAdmin, managedLocationIds } = useManagedLocations()
  const { data: currentUserData } = useCurrentUser()
  const currentUser = currentUserData?.data

  const plans = plansResponse?.data || []
  const templates = templatesResponse?.data || []
  const allLocations = locationsResponse?.data || []
  
  // Location managers can only assign to their managed locations
  const availableLocations = isLocationAdmin 
    ? allLocations.filter(loc => managedLocationIds.includes(loc.id))
    : allLocations
    
  // Determine which roles the current user can assign
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  const canCreateAdmins = isAdmin
  const canCreateOffice = isAdmin

  // Auto-select location logic
  const getDefaultLocationId = () => {
    // If only one location exists company-wide, auto-select it
    if (allLocations.length === 1) return allLocations[0].id
    
    // If office user creating user, will auto-assign to their locations (no selection needed)
    if (!isAdmin && managedLocationIds.length > 0) return 'none'
    
    return 'none'
  }

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
      location_id: getDefaultLocationId(),
    },
  })

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      // Convert "none" values to null for optional fields
      const submitData = {
        ...data,
        role_template_id: data.role_template_id === 'none' ? undefined : data.role_template_id,
        commission_plan_id: data.commission_plan_id === 'none' ? undefined : data.commission_plan_id,
      }
      
      // Create the user first
      const result = await createUser.mutateAsync(submitData as any)
      
      if (!result.data) return
      
      // Auto-derive location role from company role
      const locationRole = getLocationRoleFromCompanyRole(data.role as UserRole)
      
      // Determine which locations to assign
      let locationsToAssign: string[] = []
      
      if (isAdmin) {
        // Admin selected a location explicitly
        if (data.default_location_id && data.default_location_id !== 'none') {
          locationsToAssign = [data.default_location_id]
        }
      } else {
        // Office user: auto-assign to their managed locations
        locationsToAssign = managedLocationIds
      }
      
      // Assign user to location(s)
      for (const locationId of locationsToAssign) {
        await assignUserToLocation.mutateAsync({
          user_id: result.data.id,
          location_id: locationId,
          location_role: locationRole,
        })
      }
      
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create user:', error)
    }
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
                        {canCreateAdmins && <SelectItem value="admin">Admin</SelectItem>}
                        {canCreateOffice && <SelectItem value="office">Office Staff</SelectItem>}
                        <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        <SelectItem value="sales">Sales Rep</SelectItem>
                        <SelectItem value="production">Production/Crew</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isAdmin 
                        ? 'Admin: Full system access | Office: Location manager | Sales: Customer-facing | Production: Field work'
                        : 'You can create: Sales Manager, Sales Rep, Production, Marketing (not admin/office roles)'}
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

            {/* Location Assignment - Only show for admins */}
            {isAdmin && availableLocations.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="default_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Location (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Location</SelectItem>
                          {availableLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name} {location.is_primary && '(Primary)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {allLocations.length === 1 
                          ? 'Auto-selected (only one location exists)' 
                          : 'User can be assigned to locations later via "Manage Locations"'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Info for office users */}
            {!isAdmin && managedLocationIds.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  ℹ️ New user will be automatically assigned to your location(s): {availableLocations.map(l => l.name).join(', ')}
                </p>
              </div>
            )}

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
