'use client'

import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from '@tanstack/react-table'
import { useUsers } from '@/lib/hooks/use-users'
import { UserWithRelations, UserRole } from '@/lib/types/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Shield, 
  UserX,
  UserCheck,
  Copy,
  FileUser
} from 'lucide-react'
import { CreateUserDialog } from './create-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { PermissionsManager } from './permissions-manager'
import { CopyPermissionsDialog } from './copy-permissions-dialog'
import { ApplyTemplateDialog } from './apply-template-dialog'
import { useDeactivateUser, useReactivateUser, useDeleteUser } from '@/lib/hooks/use-users'
import { toast } from 'sonner'

export function UserList() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [copyPermissionsDialogOpen, setCopyPermissionsDialogOpen] = useState(false)
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null)

  const deactivateUser = useDeactivateUser()
  const reactivateUser = useReactivateUser()
  const deleteUser = useDeleteUser()

  // Build filters for API
  const filters = {
    role: roleFilter !== 'all' ? roleFilter : undefined,
    is_active: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
  }

  const { data: usersResponse, isLoading } = useUsers(filters)
  const users = usersResponse?.data || []

  const handleDeactivate = async (userId: string) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      await deactivateUser.mutateAsync(userId)
    }
  }

  const handleReactivate = async (userId: string) => {
    await reactivateUser.mutateAsync(userId)
  }

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
      await deleteUser.mutateAsync(userId)
    }
  }

  const columns: ColumnDef<UserWithRelations>[] = [
    {
      accessorKey: 'full_name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original
        const initials = user.full_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role
        const roleColors: Record<string, string> = {
          super_admin: 'bg-purple-100 text-purple-800',
          admin: 'bg-blue-100 text-blue-800',
          office: 'bg-cyan-100 text-cyan-800',
          sales_manager: 'bg-green-100 text-green-800',
          sales: 'bg-yellow-100 text-yellow-800',
          production: 'bg-orange-100 text-orange-800',
          marketing: 'bg-pink-100 text-pink-800',
        }
        const roleLabels: Record<string, string> = {
          super_admin: 'Super Admin',
          admin: 'Admin',
          office: 'Office',
          sales_manager: 'Sales Manager',
          sales: 'Sales',
          production: 'Production',
          marketing: 'Marketing',
        }

        return (
          <Badge variant="secondary" className={roleColors[role]}>
            {roleLabels[role]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'commission_plan',
      header: 'Commission Plan',
      cell: ({ row }) => {
        const plan = row.original.commission_plan
        return plan ? (
          <span className="text-sm">{plan.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.original.phone
        return phone ? (
          <span className="text-sm">{phone}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user)
                  setEditDialogOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user)
                  setPermissionsDialogOpen(true)
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Manage Permissions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user)
                  setCopyPermissionsDialogOpen(true)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.is_active ? (
                <DropdownMenuItem
                  onClick={() => handleDeactivate(user.id)}
                  className="text-orange-600"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleReactivate(user.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => handleDelete(user.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search users..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} user(s) total
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Dialogs */}
      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      {selectedUser && (
        <>
          <EditUserDialog
            user={selectedUser}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <PermissionsManager
            user={selectedUser}
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
          />
          <CopyPermissionsDialog
            targetUser={selectedUser}
            open={copyPermissionsDialogOpen}
            onOpenChange={setCopyPermissionsDialogOpen}
          />
          <ApplyTemplateDialog
            user={selectedUser}
            open={applyTemplateDialogOpen}
            onOpenChange={setApplyTemplateDialogOpen}
          />
        </>
      )}
    </div>
  )
}
