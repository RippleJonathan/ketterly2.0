// Server-side PDF generation utilities
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { MaterialOrder } from '@/lib/types/material-orders'
import { WorkOrder } from '@/lib/types/work-orders'
import { PurchaseOrderPDF } from '@/components/admin/pdf/purchase-order-pdf'
import { WorkOrderPDF } from '@/components/admin/pdf/work-order-pdf'

interface GeneratePurchaseOrderPDFOptions {
  order: MaterialOrder
  company: {
    name: string
    logo_url?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    contact_phone?: string | null
    contact_email?: string | null
  }
}

/**
 * Generate purchase order PDF as buffer (for server-side email attachments)
 */
export async function generatePurchaseOrderBuffer(options: GeneratePurchaseOrderPDFOptions): Promise<Buffer> {
  try {
    const doc = createElement(PurchaseOrderPDF, {
      order: options.order,
      company: options.company,
    })
    
    return await renderToBuffer(doc)
  } catch (error) {
    console.error('Error generating purchase order buffer:', error)
    throw error
  }
}

interface GenerateWorkOrderPDFOptions {
  workOrder: WorkOrder
  company: {
    name: string
    logo_url?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    contact_phone?: string | null
    contact_email?: string | null
  }
}

/**
 * Generate work order PDF as buffer (for server-side email attachments)
 */
export async function generateWorkOrderBuffer(options: GenerateWorkOrderPDFOptions): Promise<Buffer> {
  try {
    const doc = createElement(WorkOrderPDF, {
      workOrder: options.workOrder,
      company: options.company,
    })
    
    return await renderToBuffer(doc)
  } catch (error) {
    console.error('Error generating work order buffer:', error)
    throw error
  }
}
