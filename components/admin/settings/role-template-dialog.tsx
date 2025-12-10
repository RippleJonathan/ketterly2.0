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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCreateRoleTemplate, useUpdateRoleTemplate } from '@/lib/hooks/use-role-templates'
import { PERMISSION_CATEGORIES, PERMISSION_LABELS } from '@/lib/constants/permissions'
import type { RoleTemplate } from '@/lib/types/users'

const roleTemplateSchema = z.object({
  template_name: z.string().min(2, 'Template name must be at least 2 characters'),
  base_role: z.enum(['super_admin', 'admin', 'manager', 'user']),
  description: z.string().optional(),
})

type RoleTemplateFormData = z.infer<typeof roleTemplateSchema>

interface RoleTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: RoleTemplate
}

export function RoleTemplateDialog({
  open,
  onOpenChange,
  template,
}: RoleTemplateDialogProps) {
  const createTemplate = useCreateRoleTemplate()
  const updateTemplate = useUpdateRoleTemplate()

  // Initialize permissions state with all permissions set to false
  const initialPermissions = Object.keys(PERMISSION_LABELS).reduce((acc, key) => {
    acc[key] = false
    return acc
  }, {} as Record<string, boolean>)

  const [permissions, setPermissions] = useState<Record<string, boolean>>(initialPermissions)

  const form = useForm<RoleTemplateFormData>({
    resolver: zodResolver(roleTemplateSchema),
    defaultValues: {
      template_name: '',
      base_role: 'user',
      description: '',
    },
  })

  useEffect(() => {
    if (template) {
      form.reset({
        template_name: template.template_name || template.name,
        base_role: template.base_role,
        description: template.description || '',
      })
      // Convert UserPermissions to simple permission object
      const perms = template.default_permissions || initialPermissions
      const permissionsObj: Record<string, boolean> = {}
      Object.entries(perms).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
          permissionsObj[key] = value as boolean
        }
      })
      setPermissions(permissionsObj)
    } else {
      form.reset({
        template_name: '',
        base_role: 'user',
        description: '',
      })
      setPermissions(initialPermissions)
    }
  }, [template, form, initialPermissions])

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [permission]: checked }))
  }

  const handleSelectAll = (category: string) => {
    const categoryPerms = PERMISSION_CATEGORIES[category]
    const updates: Record<string, boolean> = {}
    categoryPerms.forEach((perm: string) => {
      updates[perm] = true
    })
    setPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleSelectNone = (category: string) => {
    const categoryPerms = PERMISSION_CATEGORIES[category]
    const updates: Record<string, boolean> = {}
    categoryPerms.forEach((perm: string) => {
      updates[perm] = false
    })
    setPermissions((prev) => ({ ...prev, ...updates }))
  }

  const onSubmit = async (data: RoleTemplateFormData) => {
    const templateData: any = {
      name: data.template_name,
      base_role: data.base_role,
      description: data.description || null,
      default_permissions: permissions,
    }

    if (template && template.id) {
      await updateTemplate.mutateAsync({ templateId: template.id, updates: templateData })
    } else {
      await createTemplate.mutateAsync(templateData)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Role Template' : 'Create Role Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update the role template details and permissions'
              : 'Create a permission template to quickly set up new users'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="template_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sales Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The base role that users will have when this template is applied
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this role..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help identify this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Permissions Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Permissions</h3>
                {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{category}</h4>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAll(category)}
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectNone(category)}
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pl-4">
                      {(perms as string[]).map((perm: string) => (
                        <div key={perm} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm}
                            checked={permissions[perm] || false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={perm}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {PERMISSION_LABELS[perm]}
                          </label>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createTemplate.isPending || updateTemplate.isPending}
          >
            {createTemplate.isPending || updateTemplate.isPending
              ? 'Saving...'
              : template
              ? 'Update Template'
              : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
