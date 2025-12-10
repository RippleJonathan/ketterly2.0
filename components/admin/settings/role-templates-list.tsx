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
import { MoreHorizontal, Plus, Copy } from 'lucide-react'
import { useRoleTemplates, useDeleteRoleTemplate } from '@/lib/hooks/use-role-templates'
import { RoleTemplateDialog } from './role-template-dialog'
import type { RoleTemplate, UserPermissions } from '@/lib/types/users'

export function RoleTemplatesList() {
  const { data: response } = useRoleTemplates()
  const deleteTemplate = useDeleteRoleTemplate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | undefined>()

  const templates = response?.data || []

  const handleEdit = (template: RoleTemplate) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(undefined)
    setDialogOpen(true)
  }

  const handleDuplicate = (template: RoleTemplate) => {
    setEditingTemplate({
      ...template,
      id: '', // Clear ID so it creates a new one
      template_name: `${template.template_name} (Copy)`,
    } as RoleTemplate)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTemplate(undefined)
  }

  const handleDelete = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this role template? This action cannot be undone.')) {
      await deleteTemplate.mutateAsync(templateId)
    }
  }

  const getPermissionCount = (permissions: Partial<UserPermissions> | null) => {
    if (!permissions) return 0
    return Object.entries(permissions).filter(([key, value]) => 
      key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at' && value === true
    ).length
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive'
      case 'admin':
        return 'default'
      case 'manager':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'manager':
        return 'Manager'
      case 'user':
        return 'User'
      default:
        return role
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Role Template
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Base Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No role templates yet. Create your first template to get started.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.template_name}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(template.base_role)}>
                      {getRoleLabel(template.base_role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getPermissionCount(template.default_permissions)} permissions
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {template.description || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          Edit Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template.id)}
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

      <RoleTemplateDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={editingTemplate}
      />
    </div>
  )
}
