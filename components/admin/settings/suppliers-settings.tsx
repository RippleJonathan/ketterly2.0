'use client'

import { useState } from 'react'
import { useSuppliers, useDeleteSupplier } from '@/lib/hooks/use-suppliers'
import { useLocations } from '@/lib/hooks/use-locations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, FileText } from 'lucide-react'
import { SupplierType } from '@/lib/types/suppliers'
import { SupplierDialog } from './supplier-dialog'
import { SupplierDocumentsDialog } from './supplier-documents-dialog'

export function SuppliersSettings() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<SupplierType | 'all'>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [documentsDialogSupplier, setDocumentsDialogSupplier] = useState<{
    id: string
    name: string
  } | null>(null)

  const { data: locationsResponse } = useLocations(true)
  const locations = locationsResponse?.data || []

  const { data: suppliersResponse, isLoading } = useSuppliers({
    search: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    location_id: locationFilter !== 'all' ? locationFilter : undefined,
    is_active: true,
  })

  const deleteSupplier = useDeleteSupplier()

  const suppliers = suppliersResponse?.data || []

  const handleDelete = async (supplierId: string, supplierName: string) => {
    if (!confirm(`Are you sure you want to delete "${supplierName}"? This action cannot be undone.`)) {
      return
    }

    await deleteSupplier.mutateAsync(supplierId)
  }

  const typeColors = {
    material_supplier: 'bg-blue-100 text-blue-700',
    subcontractor: 'bg-purple-100 text-purple-700',
    both: 'bg-green-100 text-green-700',
  }

  const typeLabels = {
    material_supplier: 'Material Supplier',
    subcontractor: 'Subcontractor',
    both: 'Both',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppliers & Subcontractors</CardTitle>
              <CardDescription>
                Manage your material suppliers and subcontractors
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as SupplierType | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="material_supplier">Material Suppliers</SelectItem>
                <SelectItem value="subcontractor">Subcontractors</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={locationFilter}
              onValueChange={(value) => setLocationFilter(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No suppliers found</h3>
              <p className="text-muted-foreground mt-2">
                {search || typeFilter !== 'all' || locationFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first supplier'}
              </p>
              {!search && typeFilter === 'all' && locationFilter === 'all' && (
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[supplier.type]}>
                          {typeLabels[supplier.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {supplier.contact_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.email ? (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.locations ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {supplier.locations.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">All Locations</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDocumentsDialogSupplier({
                                id: supplier.id,
                                name: supplier.name,
                              })
                            }
                            title="View Documents"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSupplierId(supplier.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier.id, supplier.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <SupplierDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Edit Dialog */}
      {editingSupplierId && (
        <SupplierDialog
          isOpen={!!editingSupplierId}
          onClose={() => setEditingSupplierId(null)}
          supplierId={editingSupplierId}
        />
      )}

      {/* Documents Dialog */}
      {documentsDialogSupplier && (
        <SupplierDocumentsDialog
          isOpen={!!documentsDialogSupplier}
          onClose={() => setDocumentsDialogSupplier(null)}
          supplierId={documentsDialogSupplier.id}
          supplierName={documentsDialogSupplier.name}
        />
      )}
    </div>
  )
}
