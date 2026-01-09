'use client'

import { useState } from 'react'
import { Mail, User, Trash2, UserCheck, Shield, Users, Settings, DollarSign } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocationTeam, useRemoveUserFromLocation, useUpdateCommissionSettings } from '@/lib/hooks/use-location-team'
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
  const updateCommission = useUpdateCommissionSettings()
  const [userToRemove, setUserToRemove] = useState<{ userId: string; userName: string } | null>(null)
  const [commissionSettings, setCommissionSettings] = useState<{
    userId: string
    userName: string
    userRole: string
    commissionEnabled: boolean
    commissionRate: number
    commissionType: 'percentage' | 'flat_amount'
    flatCommissionAmount: number
    paidWhen: 'when_deposit_paid' | 'when_final_payment' | 'when_job_completed' | 'when_invoice_created'
    includeOwnSales: boolean
    isTeamLead: boolean
  } | null>(null)
  
  const [teamLeadSettings, setTeamLeadSettings] = useState<{
    currentTeamLeadId: string | null
    newTeamLeadId: string | null
    commissionRate: number
    paidWhen: 'when_deposit_paid' | 'when_final_payment' | 'when_job_completed' | 'when_invoice_created'
    includeOwnSales: boolean
  } | null>(null)

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

  const handleSaveCommissionSettings = async () => {
    if (!commissionSettings) return

    await updateCommission.mutateAsync({
      userId: commissionSettings.userId,
      locationId,
      commissionEnabled: commissionSettings.commissionEnabled,
      commissionRate: commissionSettings.commissionType === 'percentage' ? commissionSettings.commissionRate : null,
      commissionType: commissionSettings.commissionType,
      flatCommissionAmount: commissionSettings.commissionType === 'flat_amount' ? commissionSettings.flatCommissionAmount : null,
      paidWhen: commissionSettings.paidWhen,
      includeOwnSales: commissionSettings.includeOwnSales,
    })

    setCommissionSettings(null)
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
                const isOfficeRole = member.users.role === 'office'
                
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
                          {(member as any).team_lead_for_location && (
                            <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
                              ⭐ Team Lead
                            </Badge>
                          )}
                          {(isOfficeRole || (member as any).team_lead_for_location) && member.commission_enabled && (
                            <Badge variant="outline" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              {member.commission_type === 'percentage' 
                                ? `${member.commission_rate}%`
                                : `$${member.flat_commission_amount}`
                              }
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.users.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(isOfficeRole || (member as any).team_lead_for_location) && canRemoveUsers && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCommissionSettings({
                              userId: member.user_id,
                              userName: member.users.full_name,
                              userRole: member.users.role,
                              commissionEnabled: member.commission_enabled || false,
                              commissionRate: member.commission_rate || 0,
                              commissionType: (member.commission_type as 'percentage' | 'flat_amount') || 'percentage',
                              flatCommissionAmount: member.flat_commission_amount || 0,
                              paidWhen: ((member as any).paid_when as any) || 'when_final_payment',
                              includeOwnSales: (member as any).include_own_sales || false,
                              isTeamLead: (member as any).team_lead_for_location || false,
                            })
                          }
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
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

      {/* Commission Settings Dialog */}
      <Dialog open={!!commissionSettings} onOpenChange={(open) => !open && setCommissionSettings(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commission Settings</DialogTitle>
            <DialogDescription>
              Configure commission for <strong>{commissionSettings?.userName}</strong> at this location
            </DialogDescription>
          </DialogHeader>

          {commissionSettings && (
            <div className="space-y-4 py-4">
              {/* Commission Enabled Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="commission-enabled">Enable Commission</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create commissions for jobs at this location
                  </p>
                </div>
                <Switch
                  id="commission-enabled"
                  checked={commissionSettings.commissionEnabled}
                  onCheckedChange={(checked) =>
                    setCommissionSettings({ ...commissionSettings, commissionEnabled: checked })
                  }
                />
              </div>

              {/* Commission Type */}
              {commissionSettings.commissionEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="commission-type">Commission Type</Label>
                    <Select
                      value={commissionSettings.commissionType}
                      onValueChange={(value: 'percentage' | 'flat_amount') =>
                        setCommissionSettings({ ...commissionSettings, commissionType: value })
                      }
                    >
                      <SelectTrigger id="commission-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage of Job Value</SelectItem>
                        <SelectItem value="flat_amount">Flat Amount per Job</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Commission Rate (Percentage) */}
                  {commissionSettings.commissionType === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                      <Input
                        id="commission-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={commissionSettings.commissionRate}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            commissionRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="e.g., 3.00 for 3%"
                      />
                      <p className="text-sm text-muted-foreground">
                        Example: 3.00 = 3% of total job value
                      </p>
                    </div>
                  )}

                  {/* Flat Commission Amount */}
                  {commissionSettings.commissionType === 'flat_amount' && (
                    <div className="space-y-2">
                      <Label htmlFor="flat-commission">Flat Commission Amount ($)</Label>
                      <Input
                        id="flat-commission"
                        type="number"
                        min="0"
                        step="0.01"
                        value={commissionSettings.flatCommissionAmount}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            flatCommissionAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="e.g., 100.00"
                      />
                      <p className="text-sm text-muted-foreground">
                        Fixed amount per job at this location
                      </p>
                    </div>
                  )}

                  {/* Paid When Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="paid-when">Commission Paid When</Label>
                    <Select
                      value={commissionSettings.paidWhen}
                      onValueChange={(value: any) =>
                        setCommissionSettings({ ...commissionSettings, paidWhen: value })
                      }
                    >
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
                    <p className="text-sm text-muted-foreground">
                      Determines when this commission becomes active
                    </p>
                  </div>

                  {/* Include Own Sales Toggle (Team Leads only) */}
                  {commissionSettings.isTeamLead && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="include-own-sales">Include Own Sales</Label>
                        <p className="text-sm text-muted-foreground">
                          Earn override commission on jobs where you are the sales rep
                        </p>
                      </div>
                      <Switch
                        id="include-own-sales"
                        checked={commissionSettings.includeOwnSales}
                        onCheckedChange={(checked) =>
                          setCommissionSettings({ ...commissionSettings, includeOwnSales: checked })
                        }
                      />
                    </div>
                  )}

                  {/* Preview */}
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium mb-1">Preview</p>
                    <p className="text-sm text-muted-foreground">
                      {commissionSettings.commissionType === 'percentage'
                        ? `${commissionSettings.userName} will receive ${commissionSettings.commissionRate}% commission on jobs at ${locationName}`
                        : `${commissionSettings.userName} will receive $${commissionSettings.flatCommissionAmount.toFixed(2)} per job at ${locationName}`}
                    </p>
                  </div>
                </>
              )}

              {!commissionSettings.commissionEnabled && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Commission is disabled. {commissionSettings.userName} will not receive automatic commissions for jobs at this location.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommissionSettings(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCommissionSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
