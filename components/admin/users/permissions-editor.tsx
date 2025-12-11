'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUserPermissions } from '@/lib/hooks/use-permissions'
import { useUpdatePermissions } from '@/lib/hooks/use-permissions'
import { UserWithRelations, PERMISSION_CATEGORIES, PERMISSION_LABELS, PermissionKey } from '@/lib/types/users'

interface PermissionsEditorProps {
  user: UserWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PermissionsEditor({ user, open, onOpenChange }: PermissionsEditorProps) {
  const { data: permissionsResponse, isLoading } = useUserPermissions(user.id)
  const updatePermissions = useUpdatePermissions()
  
  const permissions = permissionsResponse?.data
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})

  // Initialize local permissions from API response or with defaults
  useEffect(() => {
    if (permissions) {
      // User has existing permissions - load them
      const permMap: Record<string, boolean> = {}
      Object.entries(permissions).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
          permMap[key] = value as boolean
        }
      })
      setLocalPermissions(permMap)
    } else if (permissionsResponse && !isLoading) {
      // User has no permissions yet - initialize with all false
      const permMap: Record<string, boolean> = {}
      Object.values(PERMISSION_CATEGORIES).flat().forEach((perm) => {
        permMap[perm] = false
      })
      setLocalPermissions(permMap)
    }
  }, [permissions, permissionsResponse, isLoading])

  const handleToggle = (permission: PermissionKey) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }))
  }

  const handleSelectAll = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      updates[perm] = true
    })
    setLocalPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleDeselectAll = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] as readonly string[]
    const updates: Record<string, boolean> = {}
    categoryPermissions.forEach((perm) => {
      updates[perm] = false
    })
    setLocalPermissions((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    await updatePermissions.mutateAsync({
      userId: user.id,
      permissions: localPermissions as any,
    })
    onOpenChange(false)
  }

  if (isLoading) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Permissions - {user.full_name}</DialogTitle>
          <DialogDescription>
            Grant or revoke specific permissions for this user
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{category}</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAll(category)}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeselectAll(category)}
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {perms.map((perm) => {
                    const permKey = perm as PermissionKey
                    return (
                      <div key={perm} className="flex items-center space-x-2">
                        <Checkbox
                          id={perm}
                          checked={localPermissions[perm] || false}
                          onCheckedChange={() => handleToggle(permKey)}
                        />
                        <Label
                          htmlFor={perm}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {PERMISSION_LABELS[permKey]}
                        </Label>
                      </div>
                    )
                  })}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updatePermissions.isPending}>
            {updatePermissions.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
