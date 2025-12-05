import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  deactivateSupplier
} from '@/lib/api/suppliers'
import { useCurrentCompany } from './use-current-company'
import { SupplierInsert, SupplierUpdate, SupplierFilters } from '@/lib/types/suppliers'

/**
 * Get all suppliers with optional filters
 */
export function useSuppliers(filters?: SupplierFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['suppliers', company?.id, filters],
    queryFn: () => getSuppliers(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Get a single supplier by ID
 */
export function useSupplier(supplierId: string) {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => getSupplier(company!.id, supplierId),
    enabled: !!supplierId && !!company?.id,
  })
}

/**
 * Create a new supplier
 */
export function useCreateSupplier() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (supplier: SupplierInsert) => createSupplier(company!.id, supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', company?.id] })
      toast.success('Supplier created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create supplier: ${error.message}`)
    },
  })
}

/**
 * Update an existing supplier
 */
export function useUpdateSupplier() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ supplierId, updates }: { supplierId: string; updates: SupplierUpdate }) =>
      updateSupplier(company!.id, supplierId, updates),
    onSuccess: (_, { supplierId }) => {
      queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', company?.id] })
      toast.success('Supplier updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update supplier: ${error.message}`)
    },
  })
}

/**
 * Delete a supplier (soft delete)
 */
export function useDeleteSupplier() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (supplierId: string) => deleteSupplier(company!.id, supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', company?.id] })
      toast.success('Supplier deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete supplier: ${error.message}`)
    },
  })
}

/**
 * Deactivate a supplier (keeps record but marks inactive)
 */
export function useDeactivateSupplier() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (supplierId: string) => deactivateSupplier(company!.id, supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', company?.id] })
      toast.success('Supplier deactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate supplier: ${error.message}`)
    },
  })
}
