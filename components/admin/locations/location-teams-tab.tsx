'use client'

import { useState } from 'react'
import { Crown, Users, Plus, Edit, Trash2, UserPlus, UserMinus, DollarSign } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  useLocationTeams,
  useTeamMembers,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from '@/lib/hooks/use-teams'
import { useLocationTeam } from '@/lib/hooks/use-location-team'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

interface LocationTeamsTabProps {
  locationId: string
  locationName: string
  companyId: string
}

export function LocationTeamsTab({ locationId, locationName, companyId }: LocationTeamsTabProps) {
  const { data: teams, isLoading: teamsLoading } = useLocationTeams(locationId)
  const { data: locationUsers } = useLocationTeam(locationId)
  const { data: currentUser } = useCurrentUser()
  
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()

  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [managingMembers, setManagingMembers] = useState<string | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<{ id: string; name: string } | null>(null)

  // Form state
  const [teamName, setTeamName] = useState('')
  const [teamLeadId, setTeamLeadId] = useState<string>('')
  const [commissionRate, setCommissionRate] = useState(2.0)
  const [paidWhen, setPaidWhen] = useState<'when_deposit_paid' | 'when_final_payment' | 'when_job_completed' | 'when_invoice_created'>('when_final_payment')
  const [includeOwnSales, setIncludeOwnSales] = useState(false)

  const isAdmin = currentUser?.data?.role === 'admin' || currentUser?.data?.role === 'super_admin'
  const isOffice = currentUser?.data?.role === 'office'
  const canManageTeams = isAdmin || isOffice

  // Get sales managers at this location (for Team Lead selection)
  const salesManagers = locationUsers?.filter(u => u.users.role === 'sales_manager') || []

  // Get sales reps at this location (for team member assignment)
  const salesReps = locationUsers?.filter(u => u.users.role === 'sales' || u.users.role === 'sales_manager') || []

  const handleOpenCreate = () => {
    setTeamName('')
    setTeamLeadId('')
    setCommissionRate(2.0)
    setPaidWhen('when_final_payment')
    setIncludeOwnSales(false)
    setShowCreateTeam(true)
  }

  const handleOpenEdit = (team: any) => {
    setTeamName(team.name)
    setTeamLeadId(team.team_lead_id || '')
    setCommissionRate(team.commission_rate)
    setPaidWhen(team.paid_when)
    setIncludeOwnSales(team.include_own_sales)
    setEditingTeam(team.id)
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      return
    }

    await createTeam.mutateAsync({
      companyId,
      locationId,
      name: teamName.trim(),
      teamLeadId: teamLeadId || null,
      commissionRate,
      paidWhen,
      includeOwnSales,
    })

    setShowCreateTeam(false)
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam || !teamName.trim()) return

    await updateTeam.mutateAsync({
      teamId: editingTeam,
      locationId,
      name: teamName.trim(),
      teamLeadId: teamLeadId || null,
      commissionRate,
      paidWhen,
      includeOwnSales,
    })

    setEditingTeam(null)
  }

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return

    await deleteTeam.mutateAsync({
      teamId: deletingTeam.id,
      locationId,
    })

    setDeletingTeam(null)
  }

  if (teamsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Loading teams...</CardDescription>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teams</CardTitle>
              <CardDescription>
                Sales teams at {locationName}. Each team has a Team Lead who receives override commission.
              </CardDescription>
            </div>
            {canManageTeams && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!teams || teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">No teams created yet</p>
              <p className="text-sm text-muted-foreground">
                Create a team to organize sales reps and assign Team Leads with override commissions.
              </p>
              {canManageTeams && (
                <Button onClick={handleOpenCreate} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{team.name}</h3>
                        {!team.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      
                      {team.team_lead ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span>Team Lead: <strong>{team.team_lead.full_name}</strong></span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-2">No Team Lead assigned</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {team.member_count || 0} member{team.member_count !== 1 ? 's' : ''}
                        </Badge>
                        
                        {team.team_lead && (
                          <>
                            <Badge variant="outline" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              {team.commission_rate}% override
                            </Badge>
                            
                            <Badge variant="outline">
                              Paid: {
                                team.paid_when === 'when_deposit_paid' ? 'Deposit' :
                                team.paid_when === 'when_final_payment' ? 'Final Payment' :
                                team.paid_when === 'when_job_completed' ? 'Job Completed' :
                                'Invoice Created'
                              }
                            </Badge>
                            
                            {team.include_own_sales && (
                              <Badge variant="outline">
                                Includes Own Sales
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {canManageTeams && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManagingMembers(team.id)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTeam({ id: team.id, name: team.name })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Team Dialog */}
      <Dialog open={showCreateTeam || !!editingTeam} onOpenChange={(open) => {
        if (!open) {
          setShowCreateTeam(false)
          setEditingTeam(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam ? 'Update team settings' : 'Create a new sales team with a Team Lead'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Billy Idol's Team, Roofing Crew 1"
              />
            </div>

            {/* Team Lead */}
            <div className="space-y-2">
              <Label htmlFor="team-lead">Team Lead (Sales Manager)</Label>
              <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                <SelectTrigger id="team-lead">
                  <SelectValue placeholder="Select a Sales Manager" />
                </SelectTrigger>
                <SelectContent>
                  {salesManagers.map((manager) => (
                    <SelectItem key={manager.user_id} value={manager.user_id}>
                      {manager.users.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The Team Lead receives override commission on team sales
              </p>
            </div>

            {/* Commission Rate */}
            {teamLeadId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                  <Input
                    id="commission-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Paid When */}
                <div className="space-y-2">
                  <Label htmlFor="paid-when">Commission Paid When</Label>
                  <Select value={paidWhen} onValueChange={(value: any) => setPaidWhen(value)}>
                    <SelectTrigger id="paid-when">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="when_deposit_paid">When Deposit Paid</SelectItem>
                      <SelectItem value="when_final_payment">When Final Payment</SelectItem>
                      <SelectItem value="when_job_completed">When Job Completed</SelectItem>
                      <SelectItem value="when_invoice_created">When Invoice Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Own Sales */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-own">Include Own Sales</Label>
                    <p className="text-sm text-muted-foreground">
                      Team Lead earns override on their own sales
                    </p>
                  </div>
                  <Switch
                    id="include-own"
                    checked={includeOwnSales}
                    onCheckedChange={setIncludeOwnSales}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateTeam(false)
              setEditingTeam(null)
            }}>
              Cancel
            </Button>
            <Button onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}>
              {editingTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Team Members Dialog */}
      {managingMembers && (
        <TeamMembersDialog
          teamId={managingMembers}
          locationId={locationId}
          availableUsers={salesReps}
          onClose={() => setManagingMembers(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingTeam?.name}</strong>?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove all members from this team</li>
                <li>Stop creating Team Lead override commissions</li>
                <li>Not delete any existing commissions</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Team Members Dialog Component
function TeamMembersDialog({
  teamId,
  locationId,
  availableUsers,
  onClose,
}: {
  teamId: string
  locationId: string
  availableUsers: any[]
  onClose: () => void
}) {
  const { data: teamMembers } = useTeamMembers(teamId)
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()
  
  const [selectedUser, setSelectedUser] = useState('')

  const memberIds = teamMembers?.map(m => m.user_id) || []
  const unassignedUsers = availableUsers.filter(u => !memberIds.includes(u.user_id))

  const handleAddMember = async () => {
    if (!selectedUser) return
    await addMember.mutateAsync({ userId: selectedUser, teamId, locationId })
    setSelectedUser('')
  }

  const handleRemoveMember = async (userId: string) => {
    await removeMember.mutateAsync({ userId, teamId, locationId })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Team Members</DialogTitle>
          <DialogDescription>
            Add or remove sales reps from this team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Member */}
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a sales rep" />
              </SelectTrigger>
              <SelectContent>
                {unassignedUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.users.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddMember} disabled={!selectedUser}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Members */}
          <div className="space-y-2">
            <Label>Current Members ({teamMembers?.length || 0})</Label>
            {!teamMembers || teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No members assigned to this team yet
              </p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="font-medium">{member.users.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.users.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
