'use client'

import { useState } from 'react'
import { Mail, User, Trash2, UserCheck, Shield, Users } from 'lucide-react'
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
import { useLocationTeam, useRemoveUserFromLocation } from '@/lib/hooks/use-location-team'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

interface LocationTeamTabProps {
  locationId: string
  locationName: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  office: 'Office',
  sales_manager: 'Sales Manager',
  production_manager: 'Production Manager',
  sales: 'Sales',
  marketing: 'Marketing',
  production: 'Production',
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  super_admin: Shield,
  office: UserCheck,
  sales_manager: Users,
  production_manager: Users,
  sales: User,
  marketing: User,
  production: User,
}

export function LocationTeamTab({ locationId, locationName }: LocationTeamTabProps) {
  const { data: teamMembers, isLoading } = useLocationTeam(locationId)
  const { data: currentUser } = useCurrentUser()
  const removeUser = useRemoveUserFromLocation()
  const [userToRemove, setUserToRemove] = useState<{ userId: string; userName: string } | null>(null)

  const isAdmin = currentUser?.data?.role === 'admin' || currentUser?.data?.role === 'super_admin'
  const isOffice = currentUser?.data?.role === 'office'
  const canRemoveUsers = isAdmin || isOffice

  const handleRemoveUser = async () => {
    if (!userToRemove) return

    await removeUser.mutateAsync({
      userId: userToRemove.userId,
      locationId,
    })

    setUserToRemove(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Loading team members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Users assigned to {locationName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No users assigned to this location yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Users can be assigned to this location when creating or editing them in the Users page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const RoleIcon = ROLE_ICONS[member.users.role] || User
                
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <RoleIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.users.full_name}</p>
                          <Badge variant="secondary">
                            {ROLE_LABELS[member.users.role] || member.users.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.users.email}
                        </div>
                      </div>
                    </div>

                    {canRemoveUsers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUserToRemove({
                            userId: member.user_id,
                            userName: member.users.full_name,
                          })
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> To add users to this location, go to{' '}
              <a href="/admin/settings/users" className="text-primary hover:underline">
                Settings → Users
              </a>{' '}
              and create or edit a user. Location assignment happens automatically based on who creates the user.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Remove User Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToRemove?.userName}</strong> from this location?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove their access to leads/quotes at this location</li>
                <li>Remove them from location-specific rep dropdowns</li>
                <li>Not delete the user from the system</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
