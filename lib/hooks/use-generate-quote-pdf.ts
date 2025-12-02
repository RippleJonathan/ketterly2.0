'use client'

import { useState } from 'react'
import { useCurrentCompany } from './use-current-company'
import { QuoteWithRelations } from '@/lib/types/quotes'
import { QuotePDFTemplate } from '@/components/admin/quotes/quote-pdf-template'
import {
  generateQuotePDF,
  uploadQuotePDF,
  updateQuotePDFUrl,
  downloadPDF,
} from '@/lib/utils/pdf-generator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useGenerateQuotePDF() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { data: company } = useCurrentCompany()
  const supabase = createClient()

  /**
   * Fetch signatures for a quote
   */
  const fetchSignatures = async (quoteId: string) => {
    const { data: signatures } = await supabase
      .from('quote_signatures')
      .select('signer_name, signer_type, signer_title, signature_data, signed_at')
      .eq('quote_id', quoteId)
      .order('signed_at', { ascending: true })
    
    return signatures || []
  }

  /**
   * Generate and download PDF
   */
  const generateAndDownload = async (quote: QuoteWithRelations) => {
    if (!company) {
      toast.error('Company information not found')
      return
    }

    setIsGenerating(true)
    try {
      // Fetch signatures
      const signatures = await fetchSignatures(quote.id)

      // Build company address from parts, filtering out null/empty values
      const addressParts = [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ].filter(Boolean)
      const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

      // Generate PDF blob
      const blob = await generateQuotePDF(
        {
          quote,
          companyName: company.name,
          companyLogo: company.logo_url || undefined,
          companyAddress,
          companyPhone: company.contact_phone || undefined,
          companyEmail: company.contact_email || undefined,
          contractTerms: company.contract_terms || undefined,
          signatures,
        },
        QuotePDFTemplate
      )

      // Download to user's device
      const fileName = `${company.name.replace(/\s+/g, '_')}_Quote_${quote.quote_number}.pdf`
      downloadPDF(blob, fileName)

      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF generation failed:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Generate, upload to storage, and save URL to database
   */
  const generateAndUpload = async (quote: QuoteWithRelations) => {
    if (!company) {
      toast.error('Company information not found')
      return null
    }

    setIsGenerating(true)
    try {
      // Fetch signatures
      const signatures = await fetchSignatures(quote.id)

      // Build company address from parts, filtering out null/empty values
      const addressParts = [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ].filter(Boolean)
      const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

      // Generate PDF blob
      const blob = await generateQuotePDF(
        {
          quote,
          companyName: company.name,
          companyLogo: company.logo_url || undefined,
          companyAddress,
          companyPhone: company.contact_phone || undefined,
          companyEmail: company.contact_email || undefined,
          contractTerms: company.contract_terms || undefined,
          signatures,
        },
        QuotePDFTemplate
      )

      // Upload to Supabase Storage
      const uploadResult = await uploadQuotePDF(
        company.id,
        quote.id,
        blob,
        quote.version || 1
      )

      if ('error' in uploadResult) {
        throw new Error(uploadResult.error)
      }

      // Update quote record with PDF URL
      const updateResult = await updateQuotePDFUrl(quote.id, uploadResult.url)

      if (updateResult.error) {
        throw new Error(updateResult.error)
      }

      toast.success('PDF generated and saved')
      return uploadResult.url
    } catch (error) {
      console.error('PDF generation/upload failed:', error)
      toast.error('Failed to generate PDF')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Generate and download (also saves to storage for future access)
   */
  const generateDownloadAndSave = async (quote: QuoteWithRelations) => {
    if (!company) {
      toast.error('Company information not found')
      return
    }

    setIsGenerating(true)
    try {
      // Fetch signatures
      const signatures = await fetchSignatures(quote.id)

      // Build company address from parts, filtering out null/empty values
      const addressParts = [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ].filter(Boolean)
      const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

      // Generate PDF blob
      const blob = await generateQuotePDF(
        {
          quote,
          companyName: company.name,
          companyLogo: company.logo_url || undefined,
          companyAddress,
          companyPhone: company.contact_phone || undefined,
          companyEmail: company.contact_email || undefined,
          contractTerms: company.contract_terms || undefined,
          signatures,
        },
        QuotePDFTemplate
      )

      // Upload to Supabase Storage
      const uploadResult = await uploadQuotePDF(
        company.id,
        quote.id,
        blob,
        quote.version || 1
      )

      if ('error' in uploadResult) {
        throw new Error(uploadResult.error)
      }

      // Update quote record with PDF URL
      await updateQuotePDFUrl(quote.id, uploadResult.url)

      // Download to user's device
      const fileName = `${company.name.replace(/\s+/g, '_')}_Quote_${quote.quote_number}.pdf`
      downloadPDF(blob, fileName)

      toast.success('PDF downloaded and saved')
    } catch (error) {
      console.error('PDF generation failed:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateAndDownload,
    generateAndUpload,
    generateDownloadAndSave,
    isGenerating,
  }
}
