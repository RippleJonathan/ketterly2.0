'use client'

import { useState } from 'react'
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
import { Plus, Pencil, Trash2, DollarSign, Loader2, CheckCircle } from 'lucide-react'
import { Lead } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { getLeadFinancials } from '@/lib/api/financials'
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

interface CommissionsTabProps {
  lead: Lead
}

export function CommissionsTab({ lead }: CommissionsTabProps) {
  const { data: currentUser } = useCurrentUser()
  const { data: commissionsData, isLoading } = useLeadCommissions(lead.id)
  const { data: summaryData } = useLeadCommissionSummary(lead.id)
  
  // New granular permissions
  const { data: canViewOwn } = useCheckPermission(currentUser?.data?.id || '', 'can_view_own_commissions')
  const { data: canViewAll } = useCheckPermission(currentUser?.data?.id || '', 'can_view_all_commissions')
  const { data: canCreate } = useCheckPermission(currentUser?.data?.id || '', 'can_create_commissions')
  const { data: canEdit } = useCheckPermission(currentUser?.data?.id || '', 'can_edit_commissions')
  const { data: canDelete } = useCheckPermission(currentUser?.data?.id || '', 'can_delete_commissions')
  const { data: canMarkPaid } = useCheckPermission(currentUser?.data?.id || '', 'can_mark_commissions_paid')
  const deleteCommission = useDeleteLeadCommission()
  
  // Determine if user can view at all (own or all)
  // If permissions haven't loaded (undefined) and user exists, allow access
  const isAdmin = currentUser?.data?.role === 'admin'
  const permissionsNotLoaded = canViewOwn === undefined && canViewAll === undefined
  const canView = canViewOwn || canViewAll || (permissionsNotLoaded && !!currentUser)
  
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

  const commissions = commissionsData?.data || []
  const summary = summaryData?.data || {
    total_owed: 0,
    total_paid: 0,
    total_pending: 0,
    total_approved: 0,
    total_cancelled: 0,
    count_paid: 0,
    count_pending: 0,
    count_approved: 0,
  }

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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
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

  // Get financials data to calculate accurate base amount for commissions
  const { data: financialsData } = useQuery({
    queryKey: ['lead-financials', lead.id],
    queryFn: () => getLeadFinancials(lead.id),
  })

  // Calculate base amount from financials (quote + change orders = revenue)
  const defaultBaseAmount = financialsData?.data?.summary?.estimated_revenue || 0
  const quoteTotal = financialsData?.data?.summary?.quote_total || 0
  const changeOrdersTotal = financialsData?.data?.summary?.change_orders_total || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commissions</h2>
          <p className="text-gray-600 mt-1">Track and manage sales commissions for this lead</p>
        </div>
        {canCreateFinal && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Commission
          </Button>
        )}
      </div>

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
            💡 Commissions calculate automatically from estimate total (quote + change orders)
          </p>
        </div>
      )}

      {!defaultBaseAmount && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">
              No estimate created yet. Create a quote in the Estimates tab to calculate commissions.
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
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{commission.user?.full_name}</p>
                      <p className="text-xs text-gray-500">{commission.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {commission.commission_plan?.name || (
                      <span className="text-gray-400">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {commission.commission_type === 'percentage'
                          ? `${commission.commission_rate}%`
                          : commission.commission_type === 'flat_amount'
                          ? 'Flat'
                          : 'Custom'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Base: {formatCurrency(commission.base_amount)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-lg">
                      {formatCurrency(commission.calculated_amount)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs capitalize">
                      {commission.paid_when.replace('when_', '').replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.status)}</TableCell>
                  <TableCell>
                    {commission.paid_at ? (
                      <div>
                        <p className="text-sm">{formatDate(commission.paid_at)}</p>
                        {commission.paid_by_user && (
                          <p className="text-xs text-gray-500">
                            by {commission.paid_by_user.full_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canMarkPaidFinal && commission.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMarkPaidCommission(commission)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canEditFinal && commission.status !== 'paid' && (
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
              ))}
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
