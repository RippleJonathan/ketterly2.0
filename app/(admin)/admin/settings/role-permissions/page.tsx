'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRolePermissionTemplate, useUpdateRolePermissionTemplate, useResetRolePermissionTemplate } from '@/lib/hooks/use-role-permission-templates'
import { UserRole, PERMISSION_CATEGORIES, PERMISSION_LABELS, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/types/users'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Shield, RefreshCw, Save, AlertCircle, Info } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// All selectable roles (excluding super_admin)
const SELECTABLE_ROLES: UserRole[] = [
  'admin',
  'office',
  'sales_manager',
  'sales',
  'production',
  'marketing',
]

export default function RolePermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [hasChanges, setHasChanges] = useState(false)
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})

  const { data: template, isLoading, refetch } = useRolePermissionTemplate(selectedRole)
  const updateMutation = useUpdateRolePermissionTemplate()
  const resetMutation = useResetRolePermissionTemplate()

  // Initialize local permissions when template loads
  useEffect(() => {
    if (template) {
      const permissions: Record<string, boolean> = {}
      Object.entries(template).forEach(([key, value]) => {
        if (key.startsWith('can_') && typeof value === 'boolean') {
          permissions[key] = value
        }
      })
      setLocalPermissions(permissions)
      setHasChanges(false)
    }
  }, [template])

  const handleRoleChange = (role: UserRole) => {
    if (hasChanges) {
      const confirm = window.confirm('You have unsaved changes. Do you want to discard them?')
      if (!confirm) return
    }
    setSelectedRole(role)
    setLocalPermissions({})
    setHasChanges(false)
  }

  const handlePermissionToggle = (permission: string, value: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [permission]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      role: selectedRole,
      permissions: localPermissions as any
    })
    setHasChanges(false)
    refetch()
  }

  const handleReset = async () => {
    const confirm = window.confirm(
      `Are you sure you want to reset ${ROLE_LABELS[selectedRole]} permissions to defaults? This cannot be undone.`
    )
    if (!confirm) return

    await resetMutation.mutateAsync(selectedRole)
    setLocalPermissions({})
    setHasChanges(false)
    refetch()
  }

  const handleCancel = () => {
    if (template) {
      const permissions: Record<string, boolean> = {}
      Object.entries(template).forEach(([key, value]) => {
        if (key.startsWith('can_') && typeof value === 'boolean') {
          permissions[key] = value
        }
      })
      setLocalPermissions(permissions)
      setHasChanges(false)
    }
  }

  const getPermissionValue = (permission: string): boolean => {
    if (localPermissions[permission] !== undefined) {
      return localPermissions[permission]
    }
    return template?.[permission as keyof typeof template] as boolean || false
  }

  const countEnabledPermissions = (): number => {
    return Object.values(localPermissions).filter(v => v === true).length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Role Permissions
            </h1>
            <p className="text-gray-600 mt-1">
              Customize default permissions for each role in your company
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            Changes to role permissions will only affect <strong>newly created users</strong>. 
            Existing users' permissions remain unchanged unless you manually update them.
          </div>
        </div>

        {/* Role Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Role</CardTitle>
            <CardDescription>
              Choose a role to customize its default permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={(value) => handleRoleChange(value as UserRole)}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECTABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{ROLE_LABELS[role]}</span>
                          <span className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{ROLE_LABELS[selectedRole]}</p>
                    <p className="text-xs text-gray-500">
                      {countEnabledPermissions()} of 44 permissions enabled
                    </p>
                  </div>
                  {hasChanges && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : template ? (
          <Card>
            <CardHeader>
              <CardTitle>Permissions for {ROLE_LABELS[selectedRole]}</CardTitle>
              <CardDescription>
                Toggle permissions on or off for this role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{category}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {permissions.filter(p => getPermissionValue(p)).length}/{permissions.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 pl-4">
                    {permissions.map((permission) => {
                      const isEnabled = getPermissionValue(permission)
                      
                      return (
                        <div key={permission} className="flex items-center justify-between py-2">
                          <Label 
                            htmlFor={permission} 
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS]}
                          </Label>
                          <Switch
                            id={permission}
                            checked={isEnabled}
                            onCheckedChange={(value) => handlePermissionToggle(permission, value)}
                          />
                        </div>
                      )
                    })}
                  </div>
                  
                  {category !== Object.keys(PERMISSION_CATEGORIES)[Object.keys(PERMISSION_CATEGORIES).length - 1] && (
                    <Separator />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Actions */}
        {template && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!hasChanges}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
