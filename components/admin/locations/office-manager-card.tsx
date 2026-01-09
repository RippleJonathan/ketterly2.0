'use client'

import { useState, useEffect } from 'react'
import { UserCheck, DollarSign, Settings } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useLocationTeam, useLocationOfficeManager, useSetLocationOfficeManager } from '@/lib/hooks/use-location-team'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { createClient } from '@/lib/supabase/client'

interface OfficeManagerCardProps {
  locationId: string
  locationName: string
}

export function OfficeManagerCard({ locationId, locationName }: OfficeManagerCardProps) {
  const { data: teamMembers } = useLocationTeam(locationId)
  const { data: officeManagerResponse } = useLocationOfficeManager(locationId)
  const { data: currentUser } = useCurrentUser()
  const { data: company } = useCurrentCompany()
  const setOfficeManager = useSetLocationOfficeManager()

  const [showManageDialog, setShowManageDialog] = useState(false)
  const [allOfficeUsers, setAllOfficeUsers] = useState<any[]>([])
  
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [commissionEnabled, setCommissionEnabled] = useState(true)
  const [commissionType, setCommissionType] = useState<'percentage' | 'flat_amount'>('percentage')
  const [commissionRate, setCommissionRate] = useState(3.0)
  const [flatCommissionAmount, setFlatCommissionAmount] = useState(100)
  const [paidWhen, setPaidWhen] = useState<'when_deposit_paid' | 'when_final_payment' | 'when_job_completed' | 'when_invoice_created'>('when_final_payment')

  const isAdmin = currentUser?.data?.role === 'admin' || currentUser?.data?.role === 'super_admin'
  const canManage = isAdmin

  const currentOfficeManager = officeManagerResponse?.data

  // Fetch all office users in the company (not just those assigned to this location)
  useEffect(() => {
    async function fetchOfficeUsers() {
      if (!company?.id) return

      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('company_id', company.id)
        .eq('role', 'office')
        .order('full_name')

      if (data) {
        console.log('📋 All office users in company:', data.map(u => u.full_name))
        setAllOfficeUsers(data)
      }
    }

    fetchOfficeUsers()
  }, [company?.id])

  // Get office role users at this location who can be office managers
  const availableOfficeUsers = allOfficeUsers

  console.log('Office Manager Card Debug:', {
    locationId,
    currentOfficeManager,
    allOfficeUsersCount: allOfficeUsers.length,
    availableOfficeUsers: availableOfficeUsers.map(u => u.full_name),
  })

  const handleOpenManageDialog = () => {
    if (currentOfficeManager) {
      // Edit existing
      const mgr = currentOfficeManager as any
      setSelectedUserId(mgr.user_id)
      setCommissionEnabled(mgr.commission_enabled ?? true)
      setCommissionType(mgr.commission_type || 'percentage')
      setCommissionRate(mgr.commission_rate || 3.0)
      setFlatCommissionAmount(mgr.flat_commission_amount || 100)
      setPaidWhen(mgr.paid_when || 'when_final_payment')
    } else {
      // Set new
      setSelectedUserId('')
      setCommissionEnabled(true)
      setCommissionType('percentage')
      setCommissionRate(3.0)
      setFlatCommissionAmount(100)
      setPaidWhen('when_final_payment')
    }
    setShowManageDialog(true)
  }

  const handleSave = async () => {
    if (!selectedUserId) {
      console.warn('⚠️ No user selected')
      return
    }

    console.log('💾 Saving office manager:', {
      locationId,
      userId: selectedUserId,
      commissionEnabled,
      commissionType,
      commissionRate,
      flatCommissionAmount,
      paidWhen,
    })

    await setOfficeManager.mutateAsync({
      locationId,
      userId: selectedUserId,
      commissionEnabled,
      commissionType,
      commissionRate: commissionType === 'percentage' ? commissionRate : null,
      flatCommissionAmount: commissionType === 'flat_amount' ? flatCommissionAmount : null,
      paidWhen,
    })

    console.log('✅ Office manager saved successfully')
    setShowManageDialog(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Office Manager</CardTitle>
              <CardDescription>
                Office role user assigned to this location with commission override settings
              </CardDescription>
            </div>
            {canManage && (
              <Button variant="outline" size="sm" onClick={handleOpenManageDialog}>
                <Settings className="h-4 w-4 mr-2" />
                {currentOfficeManager ? 'Edit' : 'Assign'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentOfficeManager ? (
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{(currentOfficeManager as any).users?.full_name}</p>
                <p className="text-sm text-muted-foreground">{(currentOfficeManager as any).users?.email}</p>
                
                {(currentOfficeManager as any).commission_enabled && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="h-3 w-3" />
                      {(currentOfficeManager as any).commission_type === 'percentage'
                        ? `${(currentOfficeManager as any).commission_rate}% Override`
                        : `$${(currentOfficeManager as any).flat_commission_amount} per job`
                      }
                    </Badge>
                    <Badge variant="secondary">
                      {(currentOfficeManager as any).paid_when === 'when_deposit_paid' && 'Paid on Deposit'}
                      {(currentOfficeManager as any).paid_when === 'when_final_payment' && 'Paid on Final Payment'}
                      {(currentOfficeManager as any).paid_when === 'when_job_completed' && 'Paid on Job Complete'}
                      {(currentOfficeManager as any).paid_when === 'when_invoice_created' && 'Paid on Invoice'}
                    </Badge>
                  </div>
                )}
                
                {!(currentOfficeManager as any).commission_enabled && (
                  <Badge variant="secondary" className="mt-2">No Commission</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No office manager assigned</p>
              {canManage && (
                <p className="text-xs mt-1">Click "Assign" to set an office manager with commission override</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Office Manager Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentOfficeManager ? 'Edit Office Manager' : 'Assign Office Manager'}
            </DialogTitle>
            <DialogDescription>
              Configure commission override for office manager at {locationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Select Office User */}
            <div className="space-y-2">
              <Label htmlFor="office-user">Office User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="office-user">
                  <SelectValue placeholder="Select an office user" />
                </SelectTrigger>
                <SelectContent>
                  {availableOfficeUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Only users with "office" role can be assigned ({availableOfficeUsers.length} available)
              </p>
            </div>

            {/* Commission Enabled */}
            <div className="flex items-center justify-between">
              <Label htmlFor="commission-enabled">Enable Commission Override</Label>
              <Switch
                id="commission-enabled"
                checked={commissionEnabled}
                onCheckedChange={setCommissionEnabled}
              />
            </div>

            {commissionEnabled && (
              <>
                {/* Commission Type */}
                <div className="space-y-2">
                  <Label htmlFor="commission-type">Commission Type</Label>
                  <Select value={commissionType} onValueChange={(value: 'percentage' | 'flat_amount') => setCommissionType(value)}>
                    <SelectTrigger id="commission-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat_amount">Flat Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Commission Rate or Amount */}
                {commissionType === 'percentage' ? (
                  <div className="space-y-2">
                    <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                    <Input
                      id="commission-rate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="flat-amount">Flat Amount ($)</Label>
                    <Input
                      id="flat-amount"
                      type="number"
                      step="1"
                      min="0"
                      value={flatCommissionAmount}
                      onChange={(e) => setFlatCommissionAmount(parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {/* Paid When */}
                <div className="space-y-2">
                  <Label htmlFor="paid-when">Commission Paid When</Label>
                  <Select value={paidWhen} onValueChange={(value: any) => setPaidWhen(value)}>
                    <SelectTrigger id="paid-when">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="when_deposit_paid">When Deposit Paid</SelectItem>
                      <SelectItem value="when_final_payment">When Final Payment Received</SelectItem>
                      <SelectItem value="when_job_completed">When Job Completed</SelectItem>
                      <SelectItem value="when_invoice_created">When Invoice Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedUserId || setOfficeManager.isPending}>
              {setOfficeManager.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
