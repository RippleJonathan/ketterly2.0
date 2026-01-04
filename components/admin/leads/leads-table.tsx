'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Lead } from '@/lib/types'
import { LeadsFilters } from './leads-filters'
import { LeadsTableSkeleton } from './leads-table-skeleton'
import { StatusDropdown } from './status-dropdown'
import { AssignUserDropdown } from './assign-user-dropdown'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import {
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
  getPriorityBadgeClasses,
} from '@/lib/constants/leads'
import {
  LEAD_STAGE_LABELS,
  getStageBadgeClasses,
} from '@/lib/constants/pipeline'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useDeleteLead, useLeads } from '@/lib/hooks/use-leads'

interface LeadsTableProps {
  initialData: Lead[]
}

export function LeadsTable({ initialData }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState({ rep: false }) // Hide rep column
  
  // Use React Query to get live data
  const { data: leadsResponse, isLoading } = useLeads()
  const leads = leadsResponse?.data || initialData
  
  const deleteLead = useDeleteLead()

  const handleDelete = async (leadId: string, leadName: string) => {
    if (confirm(`Are you sure you want to delete ${leadName}? This action cannot be undone.`)) {
      try {
        await deleteLead.mutateAsync(leadId)
      } catch (error) {
        // Error already handled in mutation
      }
    }
  }

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: 'full_name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-semibold hover:text-blue-600 whitespace-nowrap"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <Link 
            href={`/admin/leads/${row.original.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
          >
            {row.getValue('full_name')}
          </Link>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <span className="text-sm text-gray-700" title={`${lead.address}${lead.city ? ', ' + lead.city : ''}`}>
              {lead.address}
              {lead.city && `, ${lead.city}`}
            </span>
          )
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <a 
            href={`tel:${row.getValue('phone')}`}
            className="text-gray-700 hover:text-blue-600 whitespace-nowrap"
          >
            {row.getValue('phone')}
          </a>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          return <StatusDropdown leadId={row.original.id} currentStatus={row.getValue('status')} />
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 font-semibold hover:text-blue-600 whitespace-nowrap"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Created
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {formatDistanceToNow(new Date(row.getValue('created_at')), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: 'rep',
        accessorFn: (row: any) => {
          // Only check sales_rep_id for filtering
          return row.sales_rep_id || null
        },
        filterFn: (row, id, filterValue: string[]) => {
          const salesRepId = row.getValue(id) as string | null
          if (!salesRepId) return false
          return filterValue.includes(salesRepId)
        },
        // Hide this column from the table - it's only used for filtering
        enableHiding: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/leads/${lead.id}`} className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/leads/${lead.id}/edit`} className="flex items-center">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => handleDelete(lead.id, lead.full_name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [deleteLead]
  )

  const table = useReactTable({
    data: leads,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  // Show skeleton while loading (after all hooks are called)
  if (isLoading && !initialData.length) {
    return <LeadsTableSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <LeadsFilters
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
      />

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No leads found. Create your first lead to get started.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {table.getRowModel().rows.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
            No leads found. Create your first lead to get started.
          </div>
        ) : (
          table.getRowModel().rows.map((row) => {
            const lead = row.original
            return (
              <div
                key={row.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {lead.full_name}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/leads/${lead.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/leads/${lead.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(lead.id, lead.full_name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Email:</span>
                    <a href={`mailto:${lead.email}`} className="text-blue-600">
                      {lead.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Phone:</span>
                    <a href={`tel:${lead.phone}`} className="text-blue-600">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <span className={getStageBadgeClasses(lead.status as any)}>
                      {LEAD_STAGE_LABELS[lead.status as keyof typeof LEAD_STAGE_LABELS]}
                    </span>
                    <span className={getPriorityBadgeClasses(lead.priority as any)}>
                      {LEAD_PRIORITY_LABELS[lead.priority as keyof typeof LEAD_PRIORITY_LABELS]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {table.getRowModel().rows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-gray-700">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} leads
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
