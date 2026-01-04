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
import { useManagedLocations } from '@/lib/hooks/use-location-admin'

interface UserLocationAssignmentsProps {
  userId: string
  currentUserRole: string // For permission checking
}

export function UserLocationAssignments({ userId, currentUserRole }: UserLocationAssignmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  const { data: allLocations } = useLocations(true)
  const { data: userLocations } = useUserLocations(userId)
  const { data: usersData } = useUsers()
  const assignUser = useAssignUserToLocation()
  const removeUser = useRemoveUserFromLocation()
  const { isCompanyAdmin, isLocationAdmin, managedLocationIds } = useManagedLocations()
  
  // Get the user's company role to auto-derive location role
  const targetUser = usersData?.data?.find(u => u.id === userId)
  const userCompanyRole = targetUser?.role as UserRole
  const autoLocationRole = userCompanyRole ? getLocationRoleFromCompanyRole(userCompanyRole) : 'member'
  const locationRoleDescription = getLocationRoleDescription(userCompanyRole)

  // Admin/super_admin can manage all locations, office users can manage their locations
  const canManage = ['admin', 'super_admin', 'office'].includes(currentUserRole)
  
  // Office users can only assign to their managed locations
  const locationsToShow = currentUserRole === 'office' && !isCompanyAdmin
    ? allLocations?.data?.filter(loc => managedLocationIds.includes(loc.id)) || []
    : allLocations?.data || []

  const handleAssign = async () => {
    if (!selectedLocationId) return

    // Auto-derive location role from company role
    const locationRole = getLocationRoleFromCompanyRole(userCompanyRole)

    await assignUser.mutateAsync({
      user_id: userId,
      location_id: selectedLocationId,
      location_role: locationRole,
    })

    setIsAddDialogOpen(false)
    setSelectedLocationId('')
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
  const availableLocations = locationsToShow.filter(loc => !assignedLocationIds.has(loc.id))

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
              Add location access for this user. Their permissions at this location are determined by their company role.
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

            <div className="rounded-lg bg-muted p-3">
              <Label className="text-xs font-semibold">Location Permissions</Label>
              <p className="text-sm font-medium mt-1">
                {autoLocationRole === 'location_admin' && 'Location Admin'}
                {autoLocationRole === 'manager' && 'Manager'}
                {autoLocationRole === 'member' && 'Member'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {locationRoleDescription}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Automatically assigned based on company role: <span className="font-medium">{userCompanyRole}</span>
              </p>
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
