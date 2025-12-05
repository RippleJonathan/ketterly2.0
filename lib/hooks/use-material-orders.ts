import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import {
  getMaterialOrders,
  getMaterialOrder,
  createMaterialOrder,
  createFromTemplate,
  updateMaterialOrder,
  updateOrderStatus,
  updateActualCosts,
  uploadInvoice,
  updateInvoice,
  deleteInvoice
} from '@/lib/api/material-orders'
import {
  MaterialOrderInsert,
  MaterialOrderUpdate,
  MaterialOrderFilters,
  MaterialOrderItemInsert,
  OrderInvoiceInsert,
  OrderInvoiceUpdate
} from '@/lib/types/material-orders'

/**
 * Fetch all material orders
 */
export function useMaterialOrders(filters?: MaterialOrderFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-orders', company?.id, filters],
    queryFn: () => getMaterialOrders(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Fetch single material order by ID
 */
export function useMaterialOrder(orderId?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-orders', company?.id, orderId],
    queryFn: () => getMaterialOrder(company!.id, orderId!),
    enabled: !!company?.id && !!orderId,
  })
}

/**
 * Create a new material order
 */
export function useCreateMaterialOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: MaterialOrderInsert) => createMaterialOrder(company!.id, order),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to create material order: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      toast.success('Material order created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create material order: ${error.message}`)
    },
  })
}

/**
 * Create material order from template
 */
export function useCreateFromTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      leadId,
      templateId,
      templateName,
      squares,
      items
    }: {
      leadId: string
      templateId: string
      templateName: string
      squares: number
      items: MaterialOrderItemInsert[]
    }) => createFromTemplate(company!.id, leadId, templateId, templateName, squares, items),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to create order from template: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      toast.success('Material order created from template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create order from template: ${error.message}`)
    },
  })
}

/**
 * Update a material order
 */
export function useUpdateMaterialOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: MaterialOrderUpdate }) =>
      updateMaterialOrder(company!.id, orderId, updates),
    onSuccess: (response, { orderId }) => {
      if (response.error) {
        toast.error(`Failed to update material order: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id, orderId] })
      toast.success('Material order updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update material order: ${error.message}`)
    },
  })
}

/**
 * Update order status
 */
export function useUpdateOrderStatus() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      status,
      actualDeliveryDate
    }: {
      orderId: string
      status: any
      actualDeliveryDate?: string
    }) => updateOrderStatus(company!.id, orderId, status, actualDeliveryDate),
    onSuccess: (response, { orderId }) => {
      if (response.error) {
        toast.error(`Failed to update order status: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id, orderId] })
      toast.success('Order status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update order status: ${error.message}`)
    },
  })
}

/**
 * Update actual costs for order items
 */
export function useUpdateActualCosts() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      itemCosts
    }: {
      orderId: string
      itemCosts: { itemId: string; actualUnitCost: number }[]
    }) => updateActualCosts(company!.id, orderId, itemCosts),
    onSuccess: (response, { orderId }) => {
      if (response.error) {
        toast.error(`Failed to update actual costs: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id, orderId] })
      toast.success('Actual costs updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update actual costs: ${error.message}`)
    },
  })
}

/**
 * Upload invoice for order
 */
export function useUploadInvoice() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, invoice }: { orderId: string; invoice: OrderInvoiceInsert }) =>
      uploadInvoice(company!.id, orderId, invoice),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to upload invoice: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      toast.success('Invoice uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload invoice: ${error.message}`)
    },
  })
}

/**
 * Update invoice
 */
export function useUpdateInvoice() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, updates }: { invoiceId: string; updates: OrderInvoiceUpdate }) =>
      updateInvoice(company!.id, invoiceId, updates),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to update invoice: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      toast.success('Invoice updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`)
    },
  })
}

/**
 * Delete invoice
 */
export function useDeleteInvoice() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(company!.id, invoiceId),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to delete invoice: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-orders', company?.id] })
      toast.success('Invoice deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete invoice: ${error.message}`)
    },
  })
}
