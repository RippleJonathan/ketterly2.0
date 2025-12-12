// Role Editor Dialog - Create or edit company roles
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Check } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCreateCompanyRole, useUpdateCompanyRole } from '@/lib/hooks/use-company-roles'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { PERMISSION_CATEGORIES, PERMISSION_LABELS, ALL_PERMISSIONS } from '@/lib/types/users'
import type { CompanyRole, UserPermissions, PermissionKey } from '@/lib/types/users'

const roleFormSchema = z.object({
  role_name: z.string()
    .min(2, 'Role name must be at least 2 characters')
    .regex(/^[a-z][a-z0-9_]*$/, 'Role name must be in snake_case (e.g., project_manager)'),
  display_name: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  description: z.string().optional(),
  permissions: z.record(z.boolean()).optional()
})

type RoleFormData = z.infer<typeof roleFormSchema>

interface RoleEditorDialogProps {
  role?: CompanyRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleEditorDialog({ role, open, onOpenChange }: RoleEditorDialogProps) {
  const { data: company } = useCurrentCompany()
  const createRole = useCreateCompanyRole()
  const updateRole = useUpdateCompanyRole()
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  const isEditing = !!role
  const isSystemRole = role?.is_system_role || false

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      role_name: '',
      display_name: '',
      description: '',
      permissions: {}
    }
  })

  // Reset form when dialog opens/closes or role changes
  useEffect(() => {
    if (open && role) {
      form.reset({
        role_name: role.role_name,
        display_name: role.display_name,
        description: role.description || '',
        permissions: role.permissions as Record<string, boolean>
      })
      // Set selected permissions
      const selected = new Set<string>()
      Object.entries(role.permissions).forEach(([key, value]) => {
        if (value === true) selected.add(key)
      })
      setSelectedPermissions(selected)
    } else if (open && !role) {
      form.reset({
        role_name: '',
        display_name: '',
        description: '',
        permissions: {}
      })
      setSelectedPermissions(new Set())
    }
  }, [open, role, form])

  const togglePermission = (permission: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permission)) {
      newSelected.delete(permission)
    } else {
      newSelected.add(permission)
    }
    setSelectedPermissions(newSelected)
    
    // Update form
    const permissions: Record<string, boolean> = {}
    ALL_PERMISSIONS.forEach(perm => {
      permissions[perm] = newSelected.has(perm)
    })
    form.setValue('permissions', permissions)
  }

  const selectAllInCategory = (category: string) => {
    const categoryPerms = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const newSelected = new Set(selectedPermissions)
    categoryPerms.forEach(perm => newSelected.add(perm))
    setSelectedPermissions(newSelected)
    
    const permissions: Record<string, boolean> = {}
    ALL_PERMISSIONS.forEach(perm => {
      permissions[perm] = newSelected.has(perm)
    })
    form.setValue('permissions', permissions)
  }

  const deselectAllInCategory = (category: string) => {
    const categoryPerms = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const newSelected = new Set(selectedPermissions)
    categoryPerms.forEach(perm => newSelected.delete(perm))
    setSelectedPermissions(newSelected)
    
    const permissions: Record<string, boolean> = {}
    ALL_PERMISSIONS.forEach(perm => {
      permissions[perm] = newSelected.has(perm)
    })
    form.setValue('permissions', permissions)
  }

  const onSubmit = async (data: RoleFormData) => {
    if (!company?.id) return

    try {
      if (isEditing && role) {
        await updateRole.mutateAsync({
          roleId: role.id,
          updates: {
            // System roles can only update permissions
            ...(isSystemRole ? {} : {
              display_name: data.display_name,
              description: data.description || null,
            }),
            permissions: data.permissions as Partial<UserPermissions>
          }
        })
      } else {
        await createRole.mutateAsync({
          company_id: company.id,
          role_name: data.role_name,
          display_name: data.display_name,
          description: data.description || null,
          permissions: data.permissions as Partial<UserPermissions>,
          is_system_role: false
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save role:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                Edit Role: {role?.display_name}
                {isSystemRole && (
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    System Role
                  </Badge>
                )}
              </>
            ) : (
              'Create New Role'
            )}
          </DialogTitle>
          <DialogDescription>
            {isSystemRole
              ? 'System roles cannot be deleted. You can only modify their permissions.'
              : isEditing
              ? 'Update the role details and permissions below.'
              : 'Define a custom role with specific permissions for your team members.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Role Name (only for new roles) */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="role_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name (Internal)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., project_manager"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Internal identifier in snake_case. This cannot be changed after creation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Display Name */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Project Manager"
                      disabled={isSystemRole}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    User-friendly name shown in the interface.
                    {isSystemRole && ' (Cannot be changed for system roles)'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this role is for..."
                      rows={2}
                      disabled={isSystemRole}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify the role&apos;s purpose.
                    {isSystemRole && ' (Cannot be changed for system roles)'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Permissions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the permissions this role should have access to.
              </p>
              
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-6">
                  {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
                    const categoryPerms = permissions as readonly string[]
                    const allSelected = categoryPerms.every(p => selectedPermissions.has(p))
                    const someSelected = categoryPerms.some(p => selectedPermissions.has(p))
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{category}</h4>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => selectAllInCategory(category)}
                              className="h-7 text-xs"
                            >
                              Select All
                            </Button>
                            {someSelected && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deselectAllInCategory(category)}
                                className="h-7 text-xs"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2 ml-4">
                          {categoryPerms.map((permission) => {
                            const isChecked = selectedPermissions.has(permission)
                            return (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox
                                  id={permission}
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(permission)}
                                />
                                <label
                                  htmlFor={permission}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                                >
                                  {PERMISSION_LABELS[permission as PermissionKey]}
                                  {isChecked && <Check className="h-3 w-3 text-green-600" />}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                        
                        {Object.keys(PERMISSION_CATEGORIES).indexOf(category) < Object.keys(PERMISSION_CATEGORIES).length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {selectedPermissions.size} of {ALL_PERMISSIONS.length} permissions selected
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRole.isPending || updateRole.isPending}
              >
                {isEditing ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
