'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { Check, X, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'

import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-users'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { getAllCompanyCommissions } from '@/lib/api/lead-commissions'
import { approveCommission, bulkApproveCommissions } from '@/lib/actions/commissions'
import { LeadCommissionWithRelations } from '@/lib/types/commissions'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { CommissionFilters } from './commission-filters'
import { MarkPaidDialog } from './mark-paid-dialog'

export function CommissionsTable() {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  
  console.log('DEBUG - Current user:', currentUser)
  console.log('DEBUG - Current user data:', (currentUser as any)?.data)
  console.log('DEBUG - Current user ID:', (currentUser as any)?.data?.id)
  
  // @ts-ignore - Temporarily ignore type error since getCurrentUser returns ApiResponse
  const userId = currentUser?.data?.id || currentUser?.id
  
  const { data: canViewAll } = useCheckPermission(userId, 'can_view_all_commissions')
  const { data: canApprove } = useCheckPermission(userId, 'can_approve_commissions')

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [isApproving, setIsApproving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>()
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()

  // Fetch commissions
  const { data: commissions, isLoading, refetch, error } = useQuery({
    queryKey: ['all-commissions', company?.id, selectedUserId, selectedStatus, dateFrom, dateTo],
    queryFn: async () => {
      if (!company?.id) return []
      console.log('🔍 Fetching commissions for company:', company.id)
      const result = await getAllCompanyCommissions(company.id, {
        userId: selectedUserId,
        status: selectedStatus,
        dateFrom,
        dateTo,
      })
      console.log('📊 API Result:', result)
      console.log('📦 Commissions data:', result.data)
      console.log('❌ Error:', result.error)
      return result.data || []
    },
    enabled: !!company?.id && canViewAll === true,
  })

  console.log('DEBUG - Company ID:', company?.id)
  console.log('DEBUG - Can view all:', canViewAll)
  console.log('DEBUG - Query enabled:', !!company?.id && canViewAll === true)
  console.log('DEBUG - Commissions:', commissions)
  console.log('DEBUG - Is loading:', isLoading)

  // Permission check
  if (canViewAll === false) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view all company commissions.
        </p>
      </div>
    )
  }

  // Define columns
  const columns: ColumnDef<LeadCommissionWithRelations>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={row.original.status !== 'eligible'}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user
        if (!user) return <span className="text-muted-foreground">—</span>
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{user.full_name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'lead',
      header: 'Lead/Job',
      cell: ({ row }) => {
        const lead = row.original.lead
        if (!lead) return <span className="text-muted-foreground">—</span>
        
        return (
          <Link
            href={`/admin/leads/${lead.id}`}
            className="hover:underline"
          >
            <div>
              <div className="font-medium">{lead.full_name}</div>
              {lead.address && (
                <div className="text-xs text-muted-foreground">
                  {lead.address}
                </div>
              )}
            </div>
          </Link>
        )
      },
    },
    {
      accessorKey: 'calculated_amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.original.calculated_amount || 0
        const balanceOwed = row.original.balance_owed || 0
        
        return (
          <div>
            <div className="font-medium">
              ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {balanceOwed !== 0 && (
              <div className={`text-xs ${balanceOwed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Balance: ${Math.abs(balanceOwed).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        
        const statusConfig = {
          pending: { label: 'Pending', variant: 'secondary' as const, icon: '⏳' },
          eligible: { label: 'Eligible', variant: 'default' as const, icon: '✓' },
          approved: { label: 'Approved', variant: 'success' as const, icon: '✅' },
          paid: { label: 'Paid', variant: 'outline' as const, icon: '💰' },
          voided: { label: 'Voided', variant: 'destructive' as const, icon: '❌' },
          cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: '🚫' },
        }
        
        const config = statusConfig[status] || statusConfig.pending
        
        return (
          <Badge variant={config.variant}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        return format(new Date(row.original.created_at), 'MMM d, yyyy')
      },
    },
    {
      accessorKey: 'approved_by',
      header: 'Approved By',
      cell: ({ row }) => {
        const approvedBy = row.original.approved_by_user
        const approvedAt = row.original.approved_at
        
        if (!approvedBy || !approvedAt) {
          return <span className="text-muted-foreground">—</span>
        }
        
        return (
          <div className="text-sm">
            <div>{approvedBy.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(approvedAt), 'MMM d, yyyy')}
            </div>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const commission = row.original
        const [isApproving, setIsApproving] = useState(false)
        
        if (commission.status === 'eligible' && canApprove) {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsApproving(true)
                try {
                  const result = await approveCommission(commission.id)
                  if (result.success) {
                    toast.success('Commission approved successfully')
                    refetch()
                  } else {
                    toast.error(result.error || 'Failed to approve commission')
                  }
                } finally {
                  setIsApproving(false)
                }
              }}
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          )
        }
        
        if (commission.status === 'approved') {
          return <MarkPaidDialog commission={commission} onSuccess={() => refetch()} />
        }
        
        return <span className="text-muted-foreground">—</span>
      },
    },
  ]

  // Create table instance
  const table = useReactTable({
    data: commissions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  // Handle bulk approval
  const handleBulkApprove = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const eligibleCommissionIds = selectedRows
      .filter(row => row.original.status === 'eligible')
      .map(row => row.original.id)

    if (eligibleCommissionIds.length === 0) {
      toast.error('Please select eligible commissions to approve')
      return
    }

    setIsApproving(true)
    try {
      const result = await bulkApproveCommissions(eligibleCommissionIds)
      if (result.success) {
        const approvedCount = result.data?.approvedCount || eligibleCommissionIds.length
        toast.success(`Approved ${approvedCount} commission(s)`)
        setRowSelection({})
        refetch()
      } else {
        toast.error(result.error || 'Failed to approve commissions')
      }
    } finally {
      setIsApproving(false)
    }
  }

  // Handle CSV export
  const handleExport = () => {
    if (!commissions || commissions.length === 0) {
      toast.error('No commissions to export')
      return
    }

    const csv = [
      ['User', 'Email', 'Lead', 'Amount', 'Balance Owed', 'Status', 'Created', 'Approved By', 'Approved At', 'Paid Date'].join(','),
      ...commissions.map(c => [
        c.user?.full_name || '',
        c.user?.email || '',
        c.lead?.full_name || '',
        c.calculated_amount || 0,
        c.balance_owed || 0,
        c.status,
        format(new Date(c.created_at), 'yyyy-MM-dd'),
        c.approved_by_user?.full_name || '',
        c.approved_at ? format(new Date(c.approved_at), 'yyyy-MM-dd') : '',
        c.paid_date ? format(new Date(c.paid_date), 'yyyy-MM-dd') : '',
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${commissions.length} commission(s) to CSV`)
  }

  const selectedCount = Object.keys(rowSelection).length
  const eligibleSelectedCount = table.getFilteredSelectedRowModel().rows
    .filter(row => row.original.status === 'eligible').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-2">
        <CommissionFilters
          onUserChange={setSelectedUserId}
          onStatusChange={setSelectedStatus}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        
        <div className="flex items-center gap-2">
          {selectedCount > 0 && canApprove && (
            <Button
              variant="default"
              onClick={handleBulkApprove}
              disabled={isApproving || eligibleSelectedCount === 0}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve {eligibleSelectedCount} Selected
                </>
              )}
            </Button>
          )}
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No commissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
