// Company Roles List Component
'use client'

import { useState } from 'react'
import { Plus, Users, Shield, Edit, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCompanyRolesWithCounts, useDeleteCompanyRole, useDuplicateCompanyRole } from '@/lib/hooks/use-company-roles'
import { RoleEditorDialog } from '@/components/admin/settings/role-editor-dialog'
import type { CompanyRole } from '@/lib/types/users'

export function CompanyRolesList() {
  const { data: roles, isLoading } = useCompanyRolesWithCounts()
  const deleteRole = useDeleteCompanyRole()
  const duplicateRole = useDuplicateCompanyRole()

  const [editingRole, setEditingRole] = useState<CompanyRole | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingRole, setDeletingRole] = useState<CompanyRole | null>(null)

  const systemRoles = roles?.filter((r: CompanyRole) => r.is_system_role) || []
  const customRoles = roles?.filter((r: CompanyRole) => !r.is_system_role) || []

  const handleDuplicate = async (role: CompanyRole) => {
    const newName = `${role.role_name}_copy`
    const newDisplayName = `${role.display_name} (Copy)`
    
    await duplicateRole.mutateAsync({
      sourceRoleId: role.id,
      newRoleName: newName,
      newDisplayName: newDisplayName
    })
  }

  const handleDelete = async () => {
    if (!deletingRole) return
    await deleteRole.mutateAsync(deletingRole.id)
    setDeletingRole(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Protected Roles Skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>

        {/* Custom Roles Skeleton */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-7 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-56 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Roles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protected Roles
            </h2>
            <p className="text-sm text-muted-foreground">
              Admin role is protected and cannot be deleted or renamed
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemRoles.map((role: CompanyRole) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => setEditingRole(role)}
              onDuplicate={() => handleDuplicate(role)}
            />
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Custom Roles</h2>
            <p className="text-sm text-muted-foreground">
              Custom roles created for your specific needs
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>

        {customRoles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom roles yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create custom roles tailored to your team&apos;s specific needs
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customRoles.map((role: CompanyRole) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={() => setEditingRole(role)}
                onDuplicate={() => handleDuplicate(role)}
                onDelete={() => setDeletingRole(role)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Role Editor Dialog */}
      <RoleEditorDialog
        role={editingRole}
        open={!!editingRole || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null)
            setIsCreating(false)
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRole} onOpenChange={(open: boolean) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{deletingRole?.display_name}&quot;? 
              This action cannot be undone.
              {deletingRole && deletingRole.user_count > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  Warning: {deletingRole.user_count} user(s) are currently assigned to this role.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface RoleCardProps {
  role: CompanyRole
  onEdit: () => void
  onDuplicate: () => void
  onDelete?: () => void
}

function RoleCard({ role, onEdit, onDuplicate, onDelete }: RoleCardProps) {
  const permissionCount = Object.values(role.permissions).filter(Boolean).length

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {role.display_name}
              {role.is_system_role && (
                <Badge variant="secondary" className="text-xs">
                  System
                </Badge>
              )}
            </CardTitle>
            {role.description && (
              <CardDescription className="mt-1">
                {role.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{role.user_count}</span>
            <span className="text-muted-foreground">users</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{permissionCount}</span>
            <span className="text-muted-foreground">permissions</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
          >
            <Copy className="h-3 w-3" />
          </Button>
          {onDelete && !role.is_system_role && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
