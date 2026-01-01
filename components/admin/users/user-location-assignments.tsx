'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useLocations } from '@/lib/hooks/use-locations'
import { useUserLocations, useAssignUserToLocation, useRemoveUserFromLocation } from '@/lib/hooks/use-location-users'
import type { LocationRole } from '@/lib/api/location-users'
import { getLocationRoleFromCompanyRole, getLocationRoleDescription } from '@/lib/utils/location-roles'
import { useUsers } from '@/lib/hooks/use-users'
import type { UserRole } from '@/lib/types/users'

interface UserLocationAssignmentsProps {
  userId: string
  currentUserRole: string // For permission checking
}

export function UserLocationAssignments({ userId, currentUserRole }: UserLocationAssignmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedLocationRole, setSelectedLocationRole] = useState<LocationRole>('member')

  const { data: allLocations } = useLocations(true)
  const { data: userLocations } = useUserLocations(userId)
  const { data: usersData } = useUsers()
  const assignUser = useAssignUserToLocation()
  const removeUser = useRemoveUserFromLocation()
  
  // Get the user's company role to suggest default location role
  const targetUser = usersData?.data?.find(u => u.id === userId)
  const userCompanyRole = targetUser?.role as UserRole
  const suggestedLocationRole = userCompanyRole ? getLocationRoleFromCompanyRole(userCompanyRole) : 'member'

  // Only admin/super_admin can manage location assignments
  const canManage = ['admin', 'super_admin'].includes(currentUserRole)

  const handleAssign = async () => {
    if (!selectedLocationId) return

    await assignUser.mutateAsync({
      user_id: userId,
      location_id: selectedLocationId,
      location_role: selectedLocationRole,
    })

    setIsAddDialogOpen(false)
    setSelectedLocationId('')
    setSelectedLocationRole('member')
  }

  const handleRemove = async (locationUserId: string, locationId: string) => {
    await removeUser.mutateAsync({
      locationUserId,
      locationId,
      userId,
    })
  }

  // Filter out already assigned locations
  const assignedLocationIds = new Set(userLocations?.data?.map(ul => ul.location_id) || [])
  const availableLocations = allLocations?.data?.filter(loc => !assignedLocationIds.has(loc.id)) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Location Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Locations this user can access and their role at each location
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Assign Location
          </Button>
        )}
      </div>

      {userLocations?.data && userLocations.data.length > 0 ? (
        <div className="space-y-2">
          {userLocations.data.map((ul: any) => (
            <div
              key={ul.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{ul.locations?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ul.locations?.city}, {ul.locations?.state}
                  </p>
                </div>
                <Badge variant="secondary">
                  {ul.location_role === 'location_admin' && 'Location Admin'}
                  {ul.location_role === 'manager' && 'Manager'}
                  {ul.location_role === 'member' && 'Member'}
                </Badge>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(ul.id, ul.location_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground">
            No location assignments yet
          </p>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign First Location
            </Button>
          )}
        </div>
      )}

      {/* Assign Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Location</DialogTitle>
            <DialogDescription>
              Add location access for this user and choose their role at that location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Location</Label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                      {location.is_primary && ' (Primary)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location Role</Label>
              <Select
                value={selectedLocationRole}
                onValueChange={(value) => setSelectedLocationRole(value as LocationRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location_admin">
                    <div>
                      <p className="font-medium">Location Admin</p>
                      <p className="text-xs text-muted-foreground">Full control of this location (office role)</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div>
                      <p className="font-medium">Manager</p>
                      <p className="text-xs text-muted-foreground">Manage team and operations (sales manager role)</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div>
                      <p className="font-medium">Member</p>
                      <p className="text-xs text-muted-foreground">Regular employee (work leads, quotes, projects)</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {suggestedLocationRole !== selectedLocationRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Suggested: <span className="font-medium">
                    {suggestedLocationRole === 'location_admin' && 'Location Admin'}
                    {suggestedLocationRole === 'manager' && 'Manager'}
                    {suggestedLocationRole === 'member' && 'Member'}
                  </span> (based on company role: {userCompanyRole})
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedLocationId || assignUser.isPending}
              >
                {assignUser.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
