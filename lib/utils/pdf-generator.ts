// PDF generation utilities for quotes
'use client'

import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { QuoteWithRelations } from '@/lib/types/quotes'
import { MaterialOrder } from '@/lib/types/material-orders'
import { WorkOrder } from '@/lib/types/work-orders'
import { createClient } from '@/lib/supabase/client'
import { PurchaseOrderPDF } from '@/components/admin/pdf/purchase-order-pdf'
import { WorkOrderPDF } from '@/components/admin/pdf/work-order-pdf'

interface GeneratePDFOptions {
  quote: QuoteWithRelations
  companyName: string
  companyLogo?: string | null
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  contractTerms?: string | null
}

/**
 * Generate PDF blob from quote data
 */
export async function generateQuotePDF(
  options: GeneratePDFOptions,
  PDFTemplate: React.ComponentType<any>
): Promise<Blob> {
  const blob = await pdf(
    createElement(PDFTemplate, options)
  ).toBlob()
  
  return blob
}

/**
 * Upload PDF to Supabase Storage
 */
export async function uploadQuotePDF(
  companyId: string,
  quoteId: string,
  blob: Blob,
  version: number = 1
): Promise<{ url: string; path: string } | { error: string }> {
  try {
    const supabase = createClient()
    const fileName = `${quoteId}_v${version}.pdf`
    const filePath = `${companyId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('quote-pdfs')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true, // Replace if exists
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quote-pdfs')
      .getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error('PDF upload failed:', error)
    return { error: 'Failed to upload PDF' }
  }
}

/**
 * Update quote with PDF URL
 */
export async function updateQuotePDFUrl(
  quoteId: string,
  pdfUrl: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)

    if (error) {
      console.error('Database update error:', error)
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('Failed to update quote PDF URL:', error)
    return { error: 'Failed to update quote' }
  }
}

/**
 * Download PDF to user's device
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Delete PDF from storage
 */
export async function deleteQuotePDF(
  filePath: string
): Promise<{ error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from('quote-pdfs')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('Failed to delete PDF:', error)
    return { error: 'Failed to delete PDF' }
  }
}

// ===== PURCHASE ORDER PDF GENERATION =====

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
 * Generate and download a purchase order PDF
 */
export async function generatePurchaseOrderPDF(options: GeneratePurchaseOrderPDFOptions): Promise<void> {
  try {
    // Create the PDF document
    const doc = createElement(PurchaseOrderPDF, {
      order: options.order,
      company: options.company,
    })
    
    // Generate the blob
    const blob = await pdf(doc).toBlob()
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PO-${options.order.order_number}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating purchase order PDF:', error)
    throw error
  }
}

/**
 * Generate purchase order PDF as blob (for email attachments)
 */
export async function generatePurchaseOrderBlob(options: GeneratePurchaseOrderPDFOptions): Promise<Blob> {
  try {
    const doc = createElement(PurchaseOrderPDF, {
      order: options.order,
      company: options.company,
    })
    
    return await pdf(doc).toBlob()
  } catch (error) {
    console.error('Error generating purchase order blob:', error)
    throw error
  }
}

/**
 * Generate purchase order PDF as data URL (for preview)
 */
export async function generatePurchaseOrderDataURL(options: GeneratePurchaseOrderPDFOptions): Promise<string> {
  try {
    const blob = await generatePurchaseOrderBlob(options)
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error generating purchase order data URL:', error)
    throw error
  }
}

// ===== WORK ORDER PDF GENERATION =====

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
 * Generate and download a work order PDF
 */
export async function generateWorkOrderPDF(options: GenerateWorkOrderPDFOptions): Promise<void> {
  try {
    // Create the PDF document
    const doc = createElement(WorkOrderPDF, {
      workOrder: options.workOrder,
      company: options.company,
    })
    
    // Generate the blob
    const blob = await pdf(doc).toBlob()
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `WO-${options.workOrder.work_order_number || options.workOrder.id.slice(0, 8)}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating work order PDF:', error)
    throw error
  }
}

/**
 * Generate work order PDF as blob (for email attachments)
 */
export async function generateWorkOrderBlob(options: GenerateWorkOrderPDFOptions): Promise<Blob> {
  try {
    const doc = createElement(WorkOrderPDF, {
      workOrder: options.workOrder,
      company: options.company,
    })
    
    return await pdf(doc).toBlob()
  } catch (error) {
    console.error('Error generating work order blob:', error)
    throw error
  }
}

/**
 * Generate work order PDF as data URL (for preview)
 */
export async function generateWorkOrderDataURL(options: GenerateWorkOrderPDFOptions): Promise<string> {
  try {
    const blob = await generateWorkOrderBlob(options)
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error generating work order data URL:', error)
    throw error
  }
}
