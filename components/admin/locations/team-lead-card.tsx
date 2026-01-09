'use client'

import { useState } from 'react'
import { Crown, DollarSign, Settings } from 'lucide-react'
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
import { useLocationTeam, useLocationTeamLead, useSetTeamLead } from '@/lib/hooks/use-location-team'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

interface TeamLeadCardProps {
  locationId: string
  locationName: string
}

export function TeamLeadCard({ locationId, locationName }: TeamLeadCardProps) {
  const { data: teamMembers } = useLocationTeam(locationId)
  const { data: currentTeamLead } = useLocationTeamLead(locationId)
  const { data: currentUser } = useCurrentUser()
  const setTeamLead = useSetTeamLead()

  const [showSetTeamLead, setShowSetTeamLead] = useState(false)
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [showConfirmReplace, setShowConfirmReplace] = useState(false)
  
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [commissionRate, setCommissionRate] = useState(2.0)
  const [paidWhen, setPaidWhen] = useState<'when_deposit_paid' | 'when_final_payment' | 'when_job_completed' | 'when_invoice_created'>('when_final_payment')
  const [includeOwnSales, setIncludeOwnSales] = useState(false)

  const isAdmin = currentUser?.data?.role === 'admin' || currentUser?.data?.role === 'super_admin'
  const isOffice = currentUser?.data?.role === 'office'
  const canManageTeamLead = isAdmin || isOffice

  // Get sales managers at this location who are NOT already the Team Lead
  const availableSalesManagers = teamMembers?.filter(
    (member) => 
      member.users.role === 'sales_manager' && 
      !(member as any).team_lead_for_location
  ) || []

  const handleOpenSetTeamLead = () => {
    setSelectedUserId('')
    setCommissionRate(2.0)
    setPaidWhen('when_final_payment')
    setIncludeOwnSales(false)
    setShowSetTeamLead(true)
  }

  const handleOpenEditSettings = () => {
    if (currentTeamLead) {
      setCommissionRate(currentTeamLead.commission_rate || 2.0)
      setPaidWhen((currentTeamLead.paid_when as any) || 'when_final_payment')
      setIncludeOwnSales(currentTeamLead.include_own_sales || false)
      setShowEditSettings(true)
    }
  }

  const handleSetTeamLead = async () => {
    if (!selectedUserId) return

    // If there's already a Team Lead, show confirmation dialog
    if (currentTeamLead) {
      setShowSetTeamLead(false)
      setShowConfirmReplace(true)
      return
    }

    // Otherwise, set directly
    await setTeamLead.mutateAsync({
      locationId,
      userId: selectedUserId,
      commissionRate,
      paidWhen,
      includeOwnSales,
    })

    setShowSetTeamLead(false)
  }

  const handleConfirmReplace = async () => {
    if (!selectedUserId) return

    await setTeamLead.mutateAsync({
      locationId,
      userId: selectedUserId,
      commissionRate,
      paidWhen,
      includeOwnSales,
    })

    setShowConfirmReplace(false)
    setShowSetTeamLead(false)
  }

  const handleUpdateSettings = async () => {
    if (!currentTeamLead) return

    await setTeamLead.mutateAsync({
      locationId,
      userId: currentTeamLead.user_id,
      commissionRate,
      paidWhen,
      includeOwnSales,
    })

    setShowEditSettings(false)
  }

  const selectedUser = teamMembers?.find((m) => m.user_id === selectedUserId)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Team Lead
              </CardTitle>
              <CardDescription>
                Sales Manager with override commission on all team sales
              </CardDescription>
            </div>
            {canManageTeamLead && availableSalesManagers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSetTeamLead}
              >
                {currentTeamLead ? 'Change Team Lead' : 'Set Team Lead'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentTeamLead ? (
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{currentTeamLead.users?.full_name}</p>
                  <Badge className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
                    ⭐ Team Lead
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentTeamLead.users?.email}</p>
                
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    {currentTeamLead.commission_rate}% Override
                  </Badge>
                  
                  <Badge variant="outline">
                    Paid: {
                      currentTeamLead.paid_when === 'when_deposit_paid' ? 'Deposit' :
                      currentTeamLead.paid_when === 'when_final_payment' ? 'Final Payment' :
                      currentTeamLead.paid_when === 'when_job_completed' ? 'Job Completed' :
                      'Invoice Created'
                    }
                  </Badge>
                  
                  {currentTeamLead.include_own_sales && (
                    <Badge variant="outline">
                      Includes Own Sales
                    </Badge>
                  )}
                </div>

                {canManageTeamLead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenEditSettings}
                    className="mt-3"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Commission Settings
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No Team Lead assigned to this location</p>
              <p className="text-xs mt-1">
                {availableSalesManagers.length > 0 
                  ? 'Click "Set Team Lead" to assign a Sales Manager as Team Lead'
                  : 'Add a Sales Manager to this location first'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Team Lead Dialog */}
      <Dialog open={showSetTeamLead} onOpenChange={setShowSetTeamLead}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Team Lead</DialogTitle>
            <DialogDescription>
              Select a Sales Manager to be the Team Lead for {locationName}. They will receive override commission on all team sales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sales Manager Selection */}
            <div className="space-y-2">
              <Label htmlFor="team-lead-user">Sales Manager</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="team-lead-user">
                  <SelectValue placeholder="Select a Sales Manager" />
                </SelectTrigger>
                <SelectContent>
                  {availableSalesManagers.map((manager) => (
                    <SelectItem key={manager.user_id} value={manager.user_id}>
                      {manager.users.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="team-lead-rate">Commission Rate (%)</Label>
              <Input
                id="team-lead-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                placeholder="e.g., 2.00 for 2%"
              />
              <p className="text-sm text-muted-foreground">
                Override commission on all team sales at this location
              </p>
            </div>

            {/* Paid When */}
            <div className="space-y-2">
              <Label htmlFor="team-lead-paid-when">Commission Paid When</Label>
              <Select value={paidWhen} onValueChange={(value: any) => setPaidWhen(value)}>
                <SelectTrigger id="team-lead-paid-when">
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
                <Label htmlFor="team-lead-include-own">Include Own Sales</Label>
                <p className="text-sm text-muted-foreground">
                  Earn override commission on jobs where they are the sales rep
                </p>
              </div>
              <Switch
                id="team-lead-include-own"
                checked={includeOwnSales}
                onCheckedChange={setIncludeOwnSales}
              />
            </div>

            {/* Preview */}
            {selectedUser && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Preview
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.users.full_name} will receive {commissionRate}% override commission on{' '}
                  {includeOwnSales ? 'all' : 'team'} sales at {locationName}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetTeamLead(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetTeamLead} disabled={!selectedUserId}>
              Set Team Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Settings Dialog */}
      <Dialog open={showEditSettings} onOpenChange={setShowEditSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Lead Commission Settings</DialogTitle>
            <DialogDescription>
              Update commission settings for {currentTeamLead?.users?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Commission Rate (%)</Label>
              <Input
                id="edit-rate"
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
              <Label htmlFor="edit-paid-when">Commission Paid When</Label>
              <Select value={paidWhen} onValueChange={(value: any) => setPaidWhen(value)}>
                <SelectTrigger id="edit-paid-when">
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
                <Label htmlFor="edit-include-own">Include Own Sales</Label>
                <p className="text-sm text-muted-foreground">
                  Earn override commission on own sales
                </p>
              </div>
              <Switch
                id="edit-include-own"
                checked={includeOwnSales}
                onCheckedChange={setIncludeOwnSales}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Replace Dialog */}
      <AlertDialog open={showConfirmReplace} onOpenChange={setShowConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Team Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentTeamLead && selectedUser && (
                <>
                  You are about to replace <strong>{currentTeamLead.users?.full_name}</strong> with{' '}
                  <strong>{selectedUser.users.full_name}</strong> as Team Lead for {locationName}.
                  <br />
                  <br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Remove Team Lead status from {currentTeamLead.users?.full_name}</li>
                    <li>Disable their override commission</li>
                    <li>Set {selectedUser.users.full_name} as the new Team Lead</li>
                    <li>Enable {commissionRate}% override commission for them</li>
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              Replace Team Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
