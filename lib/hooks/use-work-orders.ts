import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import {
  getWorkOrders,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  addWorkOrderLineItems,
  updateWorkOrderLineItems,
  sendWorkOrderEmail
} from '@/lib/api/work-orders'
import {
  WorkOrderInsert,
  WorkOrderUpdate,
  WorkOrderFilters,
  WorkOrderLineItemInsert
} from '@/lib/types/work-orders'

/**
 * Fetch all work orders
 */
export function useWorkOrders(filters?: WorkOrderFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['work-orders', company?.id, filters],
    queryFn: () => getWorkOrders(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Fetch single work order by ID
 */
export function useWorkOrder(workOrderId?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['work-orders', company?.id, workOrderId],
    queryFn: () => getWorkOrder(company!.id, workOrderId!),
    enabled: !!company?.id && !!workOrderId,
  })
}

/**
 * Create a new work order
 */
export function useCreateWorkOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: WorkOrderInsert) => createWorkOrder(company!.id, order),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to create work order: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Work order created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create work order: ${error.message}`)
    },
  })
}

/**
 * Update a work order
 */
export function useUpdateWorkOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workOrderId, updates }: { workOrderId: string; updates: WorkOrderUpdate }) =>
      updateWorkOrder(company!.id, workOrderId, updates),
    onSuccess: (response, variables) => {
      if (response.error) {
        toast.error(`Failed to update work order: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id, variables.workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Work order updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update work order: ${error.message}`)
    },
  })
}

/**
 * Delete a work order
 */
export function useDeleteWorkOrder() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workOrderId: string) => deleteWorkOrder(company!.id, workOrderId),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to delete work order: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Work order deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete work order: ${error.message}`)
    },
  })
}

/**
 * Add line items to a work order
 */
export function useAddWorkOrderLineItems() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workOrderId, items }: { workOrderId: string; items: WorkOrderLineItemInsert[] }) =>
      addWorkOrderLineItems(company!.id, workOrderId, items),
    onSuccess: (response, variables) => {
      if (response.error) {
        toast.error(`Failed to add line items: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id, variables.workOrderId] })
      toast.success('Line items added successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add line items: ${error.message}`)
    },
  })
}

/**
 * Update work order line items (replace all)
 */
export function useUpdateWorkOrderLineItems() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ workOrderId, items }: { workOrderId: string; items: WorkOrderLineItemInsert[] }) =>
      updateWorkOrderLineItems(company!.id, workOrderId, items),
    onSuccess: (response, variables) => {
      if (response.error) {
        toast.error(`Failed to update line items: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id, variables.workOrderId] })
      toast.success('Line items updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line items: ${error.message}`)
    },
  })
}

/**
 * Send work order email
 */
export function useSendWorkOrderEmail() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workOrderId: string) => sendWorkOrderEmail(company!.id, workOrderId),
    onSuccess: (response, workOrderId) => {
      if (response.error) {
        toast.error(`Failed to send email: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id, workOrderId] })
      toast.success('Work order email sent successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`)
    },
  })
}
