'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLeadCommissions, useLeadCommissionSummary, useDeleteLeadCommission } from '@/lib/hooks/use-lead-commissions'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { CommissionDialog } from './commission-dialog'
import { MarkCommissionPaidDialog } from './mark-commission-paid-dialog'
import { LeadCommission, CommissionStatus } from '@/lib/types/commissions'
import { formatCurrency, formatDate } from '@/lib/utils/formatting'
import { Plus, Pencil, Trash2, DollarSign, Loader2, CheckCircle, RefreshCw, ThumbsUp, CreditCard, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Lead } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { getLeadFinancials } from '@/lib/api/financials'
import { autoCreateCommission } from '@/lib/utils/auto-commission'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { approveCommission } from '@/lib/actions/commissions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface CommissionsTabProps {
  lead: Lead
}

export function CommissionsTab({ lead }: CommissionsTabProps) {
  const { data: currentUser } = useCurrentUser()
  const { data: company } = useCurrentCompany()
  const { data: commissionsData, isLoading, refetch: refetchCommissions } = useLeadCommissions(lead.id)
  const { data: summaryData, refetch: refetchSummary } = useLeadCommissionSummary(lead.id)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // New granular permissions
  const { data: canViewOwn } = useCheckPermission(currentUser?.data?.id || '', 'can_view_own_commissions')
  const { data: canViewAll } = useCheckPermission(currentUser?.data?.id || '', 'can_view_all_commissions')
  const { data: canCreate } = useCheckPermission(currentUser?.data?.id || '', 'can_create_commissions')
  const { data: canEdit } = useCheckPermission(currentUser?.data?.id || '', 'can_edit_commissions')
  const { data: canDelete } = useCheckPermission(currentUser?.data?.id || '', 'can_delete_commissions')
  const { data: canMarkPaid } = useCheckPermission(currentUser?.data?.id || '', 'can_mark_commissions_paid')
  const { data: canApprove } = useCheckPermission(currentUser?.data?.id || '', 'can_approve_commissions')
  const { data: canManage } = useCheckPermission(currentUser?.data?.id || '', 'can_manage_commissions')
  const deleteCommission = useDeleteLeadCommission()
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  
  // Determine if user can view at all (own or all)
  // Sales reps and marketing reps can always view their own commissions
  // Admin and office can view all commissions
  const currentUserId = currentUser?.data?.id
  const userRole = currentUser?.data?.role as string
  const isSalesOrMarketing = ['sales_rep', 'marketing_rep'].includes(userRole)
  const isAdminOrOffice = ['admin', 'office', 'super_admin'].includes(userRole)
  const permissionsNotLoaded = canViewOwn === undefined && canViewAll === undefined
  const canView = canViewOwn || canViewAll || isSalesOrMarketing || isAdminOrOffice || (permissionsNotLoaded && !!currentUser)
  
  // Allow actions if: explicit permission OR (permissions not loaded AND user is logged in)
  const permissionsExist = canCreate !== undefined || canEdit !== undefined || canDelete !== undefined || canMarkPaid !== undefined
  const canCreateFinal = canCreate === true || (!permissionsExist && !!currentUser)
  const canEditFinal = canEdit === true || (!permissionsExist && !!currentUser)
  const canDeleteFinal = canDelete === true || (!permissionsExist && !!currentUser)
  const canMarkPaidFinal = canMarkPaid === true || (!permissionsExist && !!currentUser)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingCommission, setEditingCommission] = useState<LeadCommission | null>(null)
  const [markPaidCommission, setMarkPaidCommission] = useState<LeadCommission | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  // Track if we've already auto-refreshed on mount
  const hasAutoRefreshed = useRef(false)

  const allCommissions = commissionsData?.data || []
  
  // Filter commissions based on role
  // Admin, Office → See all commissions  
  // Sales reps and marketing reps → See only their own commissions
  const canSeeAllCommissions = isAdminOrOffice
  
  const commissions = canSeeAllCommissions 
    ? allCommissions 
    : allCommissions.filter(c => c.user_id === currentUserId)
  
  // Calculate summary from filtered commissions (user-specific if not admin/office)
  const summary = canSeeAllCommissions 
    ? (summaryData?.data || {
        total_owed: 0,
        total_paid: 0,
        total_pending: 0,
        total_approved: 0,
        total_cancelled: 0,
        count_paid: 0,
        count_pending: 0,
        count_approved: 0,
      })
    : {
        total_owed: commissions.reduce((sum, c) => sum + ((c.status === 'approved' || c.status === 'eligible') ? (c.amount || 0) : 0), 0),
        total_paid: commissions.reduce((sum, c) => sum + (c.status === 'paid' ? (c.amount || 0) : 0), 0),
        total_pending: commissions.reduce((sum, c) => sum + (c.status === 'pending' ? (c.amount || 0) : 0), 0),
        total_approved: commissions.reduce((sum, c) => sum + (c.status === 'approved' ? (c.amount || 0) : 0), 0),
        total_cancelled: commissions.reduce((sum, c) => sum + (c.status === 'cancelled' ? (c.amount || 0) : 0), 0),
        count_paid: commissions.filter(c => c.status === 'paid').length,
        count_pending: commissions.filter(c => c.status === 'pending').length,
        count_approved: commissions.filter(c => c.status === 'approved').length,
      }

  // Get financials data to calculate accurate base amount for commissions
  // MUST be before any conditional returns to maintain hook order
  const { data: financialsData } = useQuery({
    queryKey: ['lead-financials', lead.id],
    queryFn: () => getLeadFinancials(lead.id),
    enabled: !!lead.id && !!canView, // Only fetch if user has permission
  })

  // Calculate base amount from financials (quote + change orders = revenue)
  const defaultBaseAmount = financialsData?.data?.summary?.estimated_revenue || 0
  const quoteTotal = financialsData?.data?.summary?.quote_total || 0
  const changeOrdersTotal = financialsData?.data?.summary?.change_orders_total || 0

  // Define handleRefresh callback BEFORE any conditional returns (React hooks rules)
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Auto-create/update commissions for all assigned users
      if (company?.id) {
        const assignedUsers = [
          lead.sales_rep_id,
          lead.marketing_rep_id,
          lead.sales_manager_id,
          lead.production_manager_id,
        ].filter(Boolean)

        // Create commissions for each assigned user with their respective roles
        // Map users to their assignment fields to use correct commission rates
        const userFieldMap: Array<{ userId: string, field: 'sales_rep_id' | 'marketing_rep_id' | 'sales_manager_id' | 'production_manager_id' }> = []
        
        if (lead.sales_rep_id) userFieldMap.push({ userId: lead.sales_rep_id, field: 'sales_rep_id' })
        if (lead.marketing_rep_id) userFieldMap.push({ userId: lead.marketing_rep_id, field: 'marketing_rep_id' })
        if (lead.sales_manager_id) userFieldMap.push({ userId: lead.sales_manager_id, field: 'sales_manager_id' })
        if (lead.production_manager_id) userFieldMap.push({ userId: lead.production_manager_id, field: 'production_manager_id' })
        
        // Create commissions for all assigned users (with skipCancelOthers=true)
        if (userFieldMap.length > 0) {
          const promises = userFieldMap.map(({ userId, field }) => 
            autoCreateCommission(lead.id, userId, company.id, currentUser?.data?.id || null, field, true)
              .catch(err => {
                console.error(`Failed to auto-create commission for ${field}:`, err)
                return { success: false }
              })
          )
          await Promise.all(promises)
        }
        
        // Create office/team lead commissions (separate call to avoid race conditions)
        if (lead.sales_rep_id) {
          const { createOfficeAndTeamCommissions } = await import('@/lib/utils/auto-commission')
          await createOfficeAndTeamCommissions(lead.id, lead.sales_rep_id, company.id)
        }
        
        // Recalculate all commission amounts based on current invoice
        const { recalculateLeadCommissions } = await import('@/lib/utils/recalculate-commissions')
        const result = await recalculateLeadCommissions(lead.id, company.id)
        
        if (!result.success && result.errors.length > 0) {
          console.error('Recalculation errors:', result.errors)
        }
        
        console.log(`✅ Recalculated ${result.updated} commission(s)`)
      }

      // Refresh the commission data
      await Promise.all([refetchCommissions(), refetchSummary()])
      toast.success('Commissions refreshed and updated')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh commissions')
    } finally {
      setIsRefreshing(false)
    }
  }, [company?.id, lead.id, lead.sales_rep_id, lead.marketing_rep_id, lead.sales_manager_id, lead.production_manager_id, currentUser?.data?.id, refetchCommissions, refetchSummary])

  // Auto-refresh commissions when tab is first opened
  // This useEffect must also be BEFORE conditional returns
  useEffect(() => {
    if (!hasAutoRefreshed.current && company?.id && lead.id) {
      console.log('🔄 Auto-refreshing commissions on tab load')
      hasAutoRefreshed.current = true
      handleRefresh()
    }
  }, [company?.id, lead.id, handleRefresh])

  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to view commissions.</p>
      </div>
    )
  }

  const getStatusBadge = (status: CommissionStatus) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Paid
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            Approved
          </Badge>
        )
      case 'eligible':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            Eligible
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1">
            <Loader2 className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCommission.mutateAsync({ id, leadId: lead.id })
    setDeleteConfirm(null)
  }

  const handleApprove = async (commissionId: string) => {
    setApprovingIds(prev => new Set(prev).add(commissionId))
    try {
      const result = await approveCommission(commissionId)
      if (result.success) {
        toast.success('Commission approved successfully')
        await Promise.all([refetchCommissions(), refetchSummary()])
      } else {
        toast.error(result.error || 'Failed to approve commission')
      }
    } catch (error) {
      toast.error('Failed to approve commission')
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev)
        next.delete(commissionId)
        return next
      })
    }
  }

  const toggleRowExpansion = (commissionId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(commissionId)) {
        next.delete(commissionId)
      } else {
        next.add(commissionId)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commissions</h2>
          <p className="text-gray-600 mt-1">Track and manage sales commissions for this lead</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Add Commission Button */}
      {canCreateFinal && (
        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Commission
        </Button>
      )}

      {/* Estimate Revenue Info */}
      {defaultBaseAmount > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">Commission Base Amount</h4>
              <div className="text-sm text-green-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Estimate (Quote):</span>
                  <span className="font-medium">{formatCurrency(quoteTotal)}</span>
                </div>
                {changeOrdersTotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span>+ Approved Change Orders:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(changeOrdersTotal)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-green-300 pt-1 mt-1">
                  <span className="font-semibold">Total Revenue:</span>
                  <span className="font-bold text-lg">{formatCurrency(defaultBaseAmount)}</span>
                </div>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 mt-2">
            💡 Commissions are created automatically when invoices are generated
          </p>
        </div>
      )}

      {!defaultBaseAmount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">
              No estimate created yet. Create a quote in the Estimates tab first.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Pending</p>
            <Loader2 className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {formatCurrency(summary.total_pending)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.count_pending} pending</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Paid</p>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(summary.total_paid)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.count_paid} payments</p>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading commissions...</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No commissions added yet.</p>
            {canCreateFinal && (
              <Button onClick={() => setShowAddDialog(true)} className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Commission
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => {
                const isExpanded = expandedRows.has(commission.id)
                const isApproving = approvingIds.has(commission.id)
                
                return (
                  <React.Fragment key={commission.id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleRowExpansion(commission.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{commission.user?.full_name}</p>
                          <p className="text-xs text-gray-500">{commission.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {commission.assignment_field === 'sales_rep_id' && 'Sales Rep'}
                          {commission.assignment_field === 'marketing_rep_id' && 'Marketing Rep'}
                          {commission.assignment_field === 'sales_manager_id' && 'Sales Manager'}
                          {commission.assignment_field === 'production_manager_id' && 'Production Manager'}
                          {commission.assignment_field === 'office_override' && 'Office Manager'}
                          {commission.assignment_field === 'team_lead_override' && 'Team Lead'}
                          {!commission.assignment_field && <span className="text-gray-400">Unknown</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {commission.commission_type === 'percentage'
                              ? `${commission.commission_rate}% Commission`
                              : commission.commission_type === 'flat_amount'
                              ? `${formatCurrency(commission.flat_amount || 0)} Flat`
                              : 'Custom'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {commission.assignment_field === 'sales_rep_id' && 'Sales Rep Rate'}
                            {commission.assignment_field === 'marketing_rep_id' && 'Marketing Rep Rate'}
                            {commission.assignment_field === 'sales_manager_id' && 'Sales Manager Rate'}
                            {commission.assignment_field === 'production_manager_id' && 'Production Manager Rate'}
                            {commission.assignment_field === 'office_override' && 'Office Override'}
                            {commission.assignment_field === 'team_lead_override' && 'Team Lead Override'}
                            {!commission.assignment_field && 'Legacy/Manual'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-lg">
                            {formatCurrency(commission.calculated_amount)}
                          </p>
                          {commission.balance_owed !== 0 && commission.balance_owed !== commission.calculated_amount && (
                            <p className="text-xs text-orange-600 font-medium">
                              Balance: {formatCurrency(commission.balance_owed)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(commission.status)}
                            {commission.status === 'eligible' && commission.triggered_by_payment && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Triggered by {commission.triggered_by_payment.payment_method} payment</p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(commission.triggered_by_payment.payment_date)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize">
                          {commission.paid_when.replace('when_', '').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canApprove && commission.status === 'eligible' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(commission.id)}
                              disabled={isApproving}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isApproving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          {canMarkPaidFinal && commission.status === 'approved' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setMarkPaidCommission(commission)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {canEditFinal && (commission.status !== 'paid' || canManage) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCommission(commission)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteFinal && commission.status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(commission.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Row - Approval History & Details */}
                    {isExpanded && (
                      <TableRow key={`${commission.id}-expanded`} className="bg-gray-50">
                        <TableCell colSpan={7} className="py-4">
                          <div className="space-y-4 px-4">
                            {/* Commission Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Base Amount</p>
                                <p className="font-semibold">{formatCurrency(commission.base_amount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Commission Type</p>
                                <p className="font-semibold capitalize">
                                  {commission.commission_type === 'percentage' 
                                    ? `${commission.commission_rate}% of base`
                                    : commission.commission_type === 'flat_amount'
                                    ? `Flat: ${formatCurrency(commission.flat_amount || 0)}`
                                    : 'Custom'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Paid Amount</p>
                                <p className="font-semibold">{formatCurrency(commission.paid_amount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">Balance Owed</p>
                                <p className={`font-semibold ${commission.balance_owed < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(commission.balance_owed)}
                                </p>
                              </div>
                            </div>

                            {/* Workflow History */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Status History</h4>
                              <div className="space-y-2">
                                {/* Created */}
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span className="text-gray-600">Created on {formatDate(commission.created_at)}</span>
                                </div>
                                
                                {/* Eligible */}
                                {commission.triggered_by_payment && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-gray-600">
                                      Became eligible on {formatDate(commission.triggered_by_payment.payment_date)}
                                      {' '}(triggered by {commission.triggered_by_payment.payment_method} payment of{' '}
                                      {formatCurrency(commission.triggered_by_payment.amount)})
                                    </span>
                                  </div>
                                )}
                                
                                {/* Approved */}
                                {commission.approved_at && commission.approved_by_user && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-600">
                                      Approved by {commission.approved_by_user.full_name} on{' '}
                                      {formatDate(commission.approved_at)}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Paid */}
                                {commission.paid_date && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-600">
                                      Paid on {formatDate(commission.paid_date)}
                                      {commission.payment_reference && (
                                        <> (Ref: {commission.payment_reference})</>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            {commission.notes && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                                <p className="text-sm text-gray-600">{commission.notes}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <CommissionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        leadId={lead.id}
        defaultBaseAmount={defaultBaseAmount}
        mode="create"
      />

      <CommissionDialog
        open={!!editingCommission}
        onOpenChange={(open) => !open && setEditingCommission(null)}
        leadId={lead.id}
        commission={editingCommission}
        mode="edit"
      />

      <MarkCommissionPaidDialog
        open={!!markPaidCommission}
        onOpenChange={(open) => !open && setMarkPaidCommission(null)}
        commission={markPaidCommission}
        leadId={lead.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this commission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
