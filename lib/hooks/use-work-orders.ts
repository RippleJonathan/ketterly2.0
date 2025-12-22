import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import { useCurrentUser } from './use-current-user'
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
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: WorkOrderInsert) => createWorkOrder(company!.id, order),
    onSuccess: async (response) => {
      if (response.error || !response.data) {
        toast.error(`Failed to create work order: ${response.error || 'Unknown error'}`)
        return
      }
      
      const workOrder = response.data
      
      // If work order has a scheduled date, create calendar event automatically
      if (workOrder.scheduled_date) {
        try {
          const { createEventFromLaborOrder } = await import('@/lib/api/calendar')
          const { getLeads } = await import('@/lib/api/leads')
          
          // Get lead info if available
          let leadName = 'Unknown Lead'
          if (workOrder.lead_id) {
            const leadResult = await getLeads(company!.id, { lead_id: workOrder.lead_id })
            if (leadResult.data && leadResult.data.length > 0) {
              leadName = leadResult.data[0].full_name
            }
          }
          
          console.log('Creating work order calendar event:', {
            laborOrderId: workOrder.id,
            scheduledDate: workOrder.scheduled_date,
            leadName,
            orderNumber: workOrder.work_order_number,
          })
          
          const result = await createEventFromLaborOrder(
            company!.id,
            workOrder.id,
            workOrder.scheduled_date,
            workOrder.lead_id || '',
            leadName,
            workOrder.work_order_number || 'New',
            workOrder.subcontractor_name || 'TBD',
            user?.id || '',
            [] // assigned users - can be empty for now
          )
          
          if (result.error) {
            console.error('Failed to create work order calendar event:', result.error)
          } else {
            console.log('Work order calendar event created successfully:', result.data)
          }
        } catch (error) {
          console.error('Failed to create calendar event:', error)
          // Don't fail the whole operation if calendar event creation fails
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['work-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
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
