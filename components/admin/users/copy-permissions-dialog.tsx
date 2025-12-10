'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUsers } from '@/lib/hooks/use-users'
import { useCopyPermissions } from '@/lib/hooks/use-permissions'
import { UserWithRelations } from '@/lib/types/users'

interface CopyPermissionsDialogProps {
  targetUser: UserWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopyPermissionsDialog({
  targetUser,
  open,
  onOpenChange,
}: CopyPermissionsDialogProps) {
  const { data: usersResponse } = useUsers()
  const copyPermissions = useCopyPermissions()
  
  const [sourceUserId, setSourceUserId] = useState<string>('')

  const users = usersResponse?.data || []
  const availableUsers = users.filter((u) => u.id !== targetUser.id)

  const handleCopy = async () => {
    if (!sourceUserId) return

    await copyPermissions.mutateAsync({
      fromUserId: sourceUserId,
      toUserId: targetUser.id,
    })
    setSourceUserId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Permissions</DialogTitle>
          <DialogDescription>
            Copy permissions from another user to {targetUser.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Copy from user:</Label>
            <Select value={sourceUserId} onValueChange={setSourceUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => {
                  const initials = user.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span>{user.full_name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {sourceUserId && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                This will replace all of {targetUser.full_name}'s current permissions with those
                from the selected user.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!sourceUserId || copyPermissions.isPending}
          >
            {copyPermissions.isPending ? 'Copying...' : 'Copy Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
