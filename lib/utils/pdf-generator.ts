// PDF generation utilities for quotes
'use client'

import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { QuoteWithRelations } from '@/lib/types/quotes'
import { createClient } from '@/lib/supabase/client'

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
