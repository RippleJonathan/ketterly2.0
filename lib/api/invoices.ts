import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  CustomerInvoice,
  CustomerInvoiceWithRelations,
  CustomerInvoiceInsert,
  CustomerInvoiceUpdate,
  InvoiceFilters,
  Payment,
  PaymentWithRelations,
  PaymentInsert,
  PaymentUpdate,
  PaymentFilters,
  ChangeOrder,
  ChangeOrderWithRelations,
  ChangeOrderInsert,
  ChangeOrderUpdate,
  ChangeOrderFilters,
  InvoiceLineItem,
  InvoiceLineItemInsert,
} from '@/lib/types/invoices'
import { applyStatusTransition } from './leads'
import { LeadStatus, LeadSubStatus } from '@/lib/types/enums'

const supabase = createClient()

// =============================================
// CUSTOMER INVOICES
// =============================================

/**
 * Get all invoices for a company
 */
export async function getInvoices(
  companyId: string,
  filters?: InvoiceFilters
): Promise<ApiResponse<CustomerInvoiceWithRelations[]>> {
  try {
    let query = supabase
      .from('customer_invoices')
      .select(`
        *,
        lead:leads!customer_invoices_lead_id_fkey(full_name, email, phone, address, city, state, zip),
        quote:quotes!customer_invoices_quote_id_fkey(quote_number, title),
        line_items:invoice_line_items(*),
        payments:payments(*),
        created_by_user:users!customer_invoices_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }
    if (filters?.quote_id) {
      query = query.eq('quote_id', filters.quote_id)
    }
    if (filters?.from_date) {
      query = query.gte('invoice_date', filters.from_date)
    }
    if (filters?.to_date) {
      query = query.lte('invoice_date', filters.to_date)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as CustomerInvoiceWithRelations[], error: null, count: count || undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a single invoice by ID
 */
export async function getInvoiceById(
  invoiceId: string
): Promise<ApiResponse<CustomerInvoiceWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select(`
        *,
        lead:leads!customer_invoices_lead_id_fkey(full_name, email, phone, address, city, state, zip),
        quote:quotes!customer_invoices_quote_id_fkey(quote_number, title),
        line_items:invoice_line_items(*),
        payments:payments(*),
        created_by_user:users!customer_invoices_created_by_fkey(full_name)
      `)
      .eq('id', invoiceId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data: data as CustomerInvoiceWithRelations, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  invoice: CustomerInvoiceInsert,
  lineItems?: InvoiceLineItemInsert[]
): Promise<ApiResponse<CustomerInvoice>> {
  try {
    // Create the invoice
    const { data, error } = await supabase
      .from('customer_invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) throw error

    // Create line items if provided
    if (lineItems && lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems.map(item => ({ ...item, invoice_id: data.id })))

      if (lineItemsError) throw lineItemsError
    }

    // AUTO-TRANSITION: Invoice created → INVOICED/INVOICE_SENT
    if (invoice.lead_id && invoice.company_id) {
      try {
        // Get current lead status
        const { data: leadData } = await supabase
          .from('leads')
          .select('status, sub_status')
          .eq('id', invoice.lead_id)
          .single()

        if (leadData) {
          await applyStatusTransition(
            invoice.lead_id,
            invoice.company_id,
            {
              from_status: leadData.status as LeadStatus,
              from_sub_status: leadData.sub_status as LeadSubStatus,
              to_status: LeadStatus.INVOICED,
              to_sub_status: LeadSubStatus.INVOICE_SENT,
              automated: true,
              metadata: {
                trigger: 'invoice_created',
                invoice_id: data.id,
                invoice_number: data.invoice_number,
              },
            }
          )
        }
      } catch (statusError) {
        // Don't fail invoice creation if status update fails
        console.error('Failed to update lead status after invoice creation:', statusError)
      }
    }

    return { data: data as CustomerInvoice, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  invoiceId: string,
  updates: CustomerInvoiceUpdate
): Promise<ApiResponse<CustomerInvoice>> {
  try {
    const { data, error } = await supabase
      .from('customer_invoices')
      .update(updates)
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error
    return { data: data as CustomerInvoice, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete an invoice (soft delete)
 */
export async function deleteInvoice(
  invoiceId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('customer_invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', invoiceId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Generate next invoice number for company
 */
export async function getNextInvoiceNumber(
  companyId: string
): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const year = new Date().getFullYear()
    if (!data || data.length === 0) {
      return { data: `INV-${year}-001`, error: null }
    }

    // Extract number from last invoice (format: INV-YYYY-NNN)
    const lastNumber = data[0].invoice_number
    const match = lastNumber.match(/INV-(\d{4})-(\d{3})/)
    
    if (match) {
      const lastYear = parseInt(match[1])
      const lastNum = parseInt(match[2])
      
      // Reset counter if new year
      if (lastYear < year) {
        return { data: `INV-${year}-001`, error: null }
      }
      
      // Increment number
      const nextNum = (lastNum + 1).toString().padStart(3, '0')
      return { data: `INV-${year}-${nextNum}`, error: null }
    }

    // Fallback
    return { data: `INV-${year}-001`, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// PAYMENTS
// =============================================

/**
 * Get all payments for a company
 */
export async function getPayments(
  companyId: string,
  filters?: PaymentFilters
): Promise<ApiResponse<PaymentWithRelations[]>> {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        lead:leads!payments_lead_id_fkey(full_name, email),
        invoice:customer_invoices!payments_invoice_id_fkey(invoice_number, total),
        created_by_user:users!payments_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false })

    if (filters?.payment_method) {
      query = query.eq('payment_method', filters.payment_method)
    }
    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }
    if (filters?.invoice_id) {
      query = query.eq('invoice_id', filters.invoice_id)

    // AUTO-TRANSITION: Payment recorded → Update invoice status
    if (payment.invoice_id && payment.lead_id && payment.company_id) {
      try {
        // Get invoice and calculate balance
        const { data: invoiceData } = await supabase
          .from('customer_invoices')
          .select('total, balance_due')
          .eq('id', payment.invoice_id)
          .single()

        if (invoiceData) {
          // Get current lead status
          const { data: leadData } = await supabase
            .from('leads')
            .select('status, sub_status')
            .eq('id', payment.lead_id)
            .single()

          if (leadData) {
            const newBalance = (invoiceData.balance_due || invoiceData.total) - payment.amount
            const isPaidInFull = newBalance <= 0
            const isPartialPayment = newBalance > 0 && newBalance < invoiceData.total

            // Determine target sub-status based on payment
            const targetSubStatus = isPaidInFull 
              ? LeadSubStatus.PAID 
              : isPartialPayment 
              ? LeadSubStatus.PARTIAL_PAYMENT 
              : LeadSubStatus.INVOICE_SENT

            await applyStatusTransition(
              payment.lead_id,
              payment.company_id,
              {
                from_status: leadData.status as LeadStatus,
                from_sub_status: leadData.sub_status as LeadSubStatus,
                to_status: LeadStatus.INVOICED,
                to_sub_status: targetSubStatus,
                automated: true,
                metadata: {
                  trigger: 'payment_recorded',
                  payment_id: data.id,
                  payment_amount: payment.amount,
                  payment_method: payment.payment_method,
                  balance_remaining: newBalance,
                  paid_in_full: isPaidInFull,
                },
              }
            )
          }
        }
      } catch (statusError) {
        // Don't fail payment creation if status update fails
        console.error('Failed to update lead status after payment:', statusError)
      }
    }

    }
    if (filters?.cleared !== undefined) {
      query = query.eq('cleared', filters.cleared)
    }
    if (filters?.from_date) {
      query = query.gte('payment_date', filters.from_date)
    }
    if (filters?.to_date) {
      query = query.lte('payment_date', filters.to_date)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as PaymentWithRelations[], error: null, count: count || undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new payment
 */
export async function createPayment(
  payment: PaymentInsert
): Promise<ApiResponse<Payment>> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single()

    if (error) throw error
    return { data: data as Payment, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a payment
 */
export async function updatePayment(
  paymentId: string,
  updates: PaymentUpdate
): Promise<ApiResponse<Payment>> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single()

    if (error) throw error
    return { data: data as Payment, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete a payment (soft delete)
 */
export async function deletePayment(
  paymentId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('payments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', paymentId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Generate next payment number for company
 */
export async function getNextPaymentNumber(
  companyId: string
): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const year = new Date().getFullYear()
    if (!data || data.length === 0) {
      return { data: `PAY-${year}-001`, error: null }
    }

    const lastNumber = data[0].payment_number
    const match = lastNumber.match(/PAY-(\d{4})-(\d{3})/)
    
    if (match) {
      const lastYear = parseInt(match[1])
      const lastNum = parseInt(match[2])
      
      if (lastYear < year) {
        return { data: `PAY-${year}-001`, error: null }
      }
      
      const nextNum = (lastNum + 1).toString().padStart(3, '0')
      return { data: `PAY-${year}-${nextNum}`, error: null }
    }

    return { data: `PAY-${year}-001`, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// CHANGE ORDERS
// =============================================

/**
 * Get all change orders for a company
 */
export async function getChangeOrders(
  companyId: string,
  filters?: ChangeOrderFilters
): Promise<ApiResponse<ChangeOrderWithRelations[]>> {
  try {
    let query = supabase
      .from('change_orders')
      .select(`
        *,
        lead:leads!change_orders_lead_id_fkey(full_name, email),
        quote:quotes!change_orders_quote_id_fkey(quote_number, title),
        approved_by_user:users!change_orders_approved_by_fkey(full_name),
        created_by_user:users!change_orders_created_by_fkey(full_name),
        line_items:change_order_line_items(*)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }
    if (filters?.quote_id) {
      query = query.eq('quote_id', filters.quote_id)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as ChangeOrderWithRelations[], error: null, count: count || undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new change order
 */
export async function createChangeOrder(
  changeOrder: ChangeOrderInsert
): Promise<ApiResponse<ChangeOrder>> {
  try {
    const { data, error } = await supabase
      .from('change_orders')
      .insert(changeOrder)
      .select()
      .single()

    if (error) throw error
    return { data: data as ChangeOrder, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a change order
 */
export async function updateChangeOrder(
  changeOrderId: string,
  updates: ChangeOrderUpdate
): Promise<ApiResponse<ChangeOrder>> {
  try {
    const { data, error } = await supabase
      .from('change_orders')
      .update(updates)
      .eq('id', changeOrderId)
      .select()
      .single()

    if (error) throw error
    return { data: data as ChangeOrder, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Delete a change order (soft delete)
 */
export async function deleteChangeOrder(
  changeOrderId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('change_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', changeOrderId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Generate next change order number for company
 */
export async function getNextChangeOrderNumber(
  companyId: string
): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase
      .from('change_orders')
      .select('change_order_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const year = new Date().getFullYear()
    if (!data || data.length === 0) {
      return { data: `CO-${year}-001`, error: null }
    }

    const lastNumber = data[0].change_order_number
    const match = lastNumber.match(/CO-(\d{4})-(\d{3})/)
    
    if (match) {
      const lastYear = parseInt(match[1])
      const lastNum = parseInt(match[2])
      
      if (lastYear < year) {
        return { data: `CO-${year}-001`, error: null }
      }
      
      const nextNum = (lastNum + 1).toString().padStart(3, '0')
      return { data: `CO-${year}-${nextNum}`, error: null }
    }

    return { data: `CO-${year}-001`, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
