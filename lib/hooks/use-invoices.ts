import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getChangeOrders,
  createChangeOrder,
  updateChangeOrder,
  deleteChangeOrder,
  getNextChangeOrderNumber,
} from '@/lib/api/invoices'
import { getNextPaymentNumberAction } from '@/lib/actions/invoices'
import {
  CustomerInvoiceInsert,
  CustomerInvoiceUpdate,
  InvoiceFilters,
  PaymentInsert,
  PaymentUpdate,
  PaymentFilters,
  ChangeOrderInsert,
  ChangeOrderUpdate,
  ChangeOrderFilters,
  InvoiceLineItemInsert,
} from '@/lib/types/invoices'
import { toast } from 'sonner'

// =============================================
// INVOICES
// =============================================

export function useInvoices(filters?: InvoiceFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['invoices', company?.id, filters],
    queryFn: () => getInvoices(company!.id, filters),
    enabled: !!company?.id,
  })
}

export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId!),
    enabled: !!invoiceId,
  })
}

export function useNextInvoiceNumber() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['next-invoice-number', company?.id],
    queryFn: async () => {
      console.log('DEBUG_INVOICE: fetching for', company?.id)
      const result = await getNextInvoiceNumber(company!.id)
      console.log('DEBUG_INVOICE: result', result)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!company?.id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({
      invoice,
      lineItems,
    }: {
      invoice: CustomerInvoiceInsert
      lineItems?: InvoiceLineItemInsert[]
    }) => createInvoice(invoice, lineItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['next-invoice-number', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['lead-commissions'] })
      queryClient.invalidateQueries({ queryKey: ['commission-summary'] })
      toast.success('Invoice created successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to create invoice:', error)
      toast.error(`Failed to create invoice: ${error.message}`)
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({
      invoiceId,
      updates,
    }: {
      invoiceId: string
      updates: CustomerInvoiceUpdate
    }) => updateInvoice(invoiceId, updates),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Invoice updated successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to update invoice:', error)
      toast.error(`Failed to update invoice: ${error.message}`)
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Invoice deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to delete invoice:', error)
      toast.error(`Failed to delete invoice: ${error.message}`)
    },
  })
}

// =============================================
// PAYMENTS
// =============================================

export function usePayments(filters?: PaymentFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['payments', company?.id, filters],
    queryFn: () => getPayments(company!.id, filters),
    enabled: !!company?.id,
  })
}

export function useNextPaymentNumber() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['next-payment-number', company?.id],
    queryFn: async () => {
      const result = await getNextPaymentNumberAction(company!.id)
      if (!result) throw new Error('Failed to generate payment number')
      return result
    },
    enabled: !!company?.id,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (payment: PaymentInsert) => createPayment(payment),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payments', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['next-payment-number', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id] })
      
      // Also invalidate invoices if payment is linked to an invoice
      if (result.data?.invoice_id) {
        queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
        queryClient.invalidateQueries({ queryKey: ['invoice', result.data.invoice_id] })
      }
      
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to record payment:', error)
      toast.error(`Failed to record payment: ${error.message}`)
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({
      paymentId,
      updates,
    }: {
      paymentId: string
      updates: PaymentUpdate
    }) => updatePayment(paymentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id] })
      toast.success('Payment updated successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to update payment:', error)
      toast.error(`Failed to update payment: ${error.message}`)
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['commissions', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['commission-summary', company?.id] })
      toast.success('Payment deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to delete payment:', error)
      toast.error(`Failed to delete payment: ${error.message}`)
    },
  })
}

// =============================================
// CHANGE ORDERS
// =============================================

export function useChangeOrders(filters?: ChangeOrderFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['change-orders', company?.id, filters],
    queryFn: () => getChangeOrders(company!.id, filters),
    enabled: !!company?.id,
  })
}

export function useNextChangeOrderNumber() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['next-change-order-number', company?.id],
    queryFn: async () => {
      const result = await getNextChangeOrderNumber(company!.id)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!company?.id,
  })
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (changeOrder: ChangeOrderInsert) => createChangeOrder(changeOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['next-change-order-number', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Change order created successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to create change order:', error)
      toast.error(`Failed to create change order: ${error.message}`)
    },
  })
}

export function useUpdateChangeOrder() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({
      changeOrderId,
      updates,
    }: {
      changeOrderId: string
      updates: ChangeOrderUpdate
    }) => updateChangeOrder(changeOrderId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Change order updated successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to update change order:', error)
      toast.error(`Failed to update change order: ${error.message}`)
    },
  })
}

export function useDeleteChangeOrder() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (changeOrderId: string) => deleteChangeOrder(changeOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-orders', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Change order deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to delete change order:', error)
      toast.error(`Failed to delete change order: ${error.message}`)
    },
  })
}
