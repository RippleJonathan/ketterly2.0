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
import { getPrimaryLocation } from '@/lib/api/locations'

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
   * Fetch approved change orders for a quote
   */
  const fetchChangeOrders = async (quoteId: string) => {
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select(`
        *,
        line_items:change_order_line_items(*)
      `)
      .eq('quote_id', quoteId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    
    return changeOrders || []
  }

  /**
   * Fetch signed contract for a quote
   */
  const fetchContract = async (quoteId: string) => {
    const { data: contract } = await supabase
      .from('signed_contracts')
      .select('original_contract_price, current_contract_price, original_total, original_subtotal')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .maybeSingle()
    
    return contract
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
      // Fetch signatures, change orders, and contract
      const [signatures, changeOrders, contract] = await Promise.all([
        fetchSignatures((quote as any).id),
        fetchChangeOrders((quote as any).id),
        fetchContract((quote as any).id),
      ])

      // Determine location data to use for PDF
      let locationData = null
      
      // First, check if the lead has a specific location assigned
      if (quote.lead?.location) {
        locationData = quote.lead.location
      } else {
        // If no location on lead, get the primary location for the company
        const primaryLocationResponse = await getPrimaryLocation(company.id)
        if (primaryLocationResponse.data) {
          locationData = primaryLocationResponse.data
        }
      }

      // Use location data if available, otherwise fall back to company data
      const entityName = locationData?.name || company.name
      const entityLogo = locationData?.logo_url || company.logo_url || undefined
      
      // Build address from location or company
      const addressParts = locationData ? [
        locationData.address,
        locationData.city && locationData.state ? `${locationData.city}, ${locationData.state}` : locationData.city || locationData.state,
        locationData.zip
      ] : [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ]
      const entityAddress = addressParts.filter(Boolean).length > 0 ? addressParts.filter(Boolean).join(' ') : undefined
      
      const entityPhone = locationData?.phone || company.contact_phone || undefined
      const entityEmail = locationData?.email || company.contact_email || undefined
      const contractTerms = locationData?.contract_terms || company.contract_terms || undefined

      // Generate PDF blob
      const blob = await generateQuotePDF(
        {
          quote,
          companyName: entityName,
          companyLogo: entityLogo,
          companyAddress: entityAddress,
          companyPhone: entityPhone,
          companyEmail: entityEmail,
          contractTerms,
          signatures,
          changeOrders: changeOrders.map(co => ({
            id: co.id,
            change_order_number: co.change_order_number,
            title: co.title,
            description: co.description,
            amount: co.amount,
            tax_amount: co.tax_amount,
            total: co.total,
            line_items: (co.line_items || []).map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
              notes: item.notes,
            })),
          })),
          originalContractPrice: contract?.original_contract_price || contract?.original_total,
          originalSubtotal: contract?.original_subtotal,
          currentContractPrice: contract?.current_contract_price,
        },
        QuotePDFTemplate
      )

      // Download to user's device
      const fileName = `${entityName.replace(/\s+/g, '_')}_Quote_${(quote as any).quote_number}.pdf`
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
      // Fetch signatures, change orders, and contract
      const [signatures, changeOrders, contract] = await Promise.all([
        fetchSignatures((quote as any).id),
        fetchChangeOrders((quote as any).id),
        fetchContract((quote as any).id),
      ])

      // Determine location data to use for PDF
      let locationData = null
      
      // First, check if the lead has a specific location assigned
      if (quote.lead?.location) {
        locationData = quote.lead.location
      } else {
        // If no location on lead, get the primary location for the company
        const primaryLocationResponse = await getPrimaryLocation(company.id)
        if (primaryLocationResponse.data) {
          locationData = primaryLocationResponse.data
        }
      }

      // Use location data if available, otherwise fall back to company data
      const entityName = locationData?.name || company.name
      const entityLogo = locationData?.logo_url || company.logo_url || undefined
      
      // Build address from location or company
      const addressParts = locationData ? [
        locationData.address,
        locationData.city && locationData.state ? `${locationData.city}, ${locationData.state}` : locationData.city || locationData.state,
        locationData.zip
      ] : [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ]
      const entityAddress = addressParts.filter(Boolean).length > 0 ? addressParts.filter(Boolean).join(' ') : undefined
      
      const entityPhone = locationData?.phone || company.contact_phone || undefined
      const entityEmail = locationData?.email || company.contact_email || undefined
      const contractTerms = locationData?.contract_terms || company.contract_terms || undefined

      // Generate PDF blob
      const blob = await generateQuotePDF(
        {
          quote,
          companyName: entityName,
          companyLogo: entityLogo,
          companyAddress: entityAddress,
          companyPhone: entityPhone,
          companyEmail: entityEmail,
          contractTerms,
          signatures,
          changeOrders: changeOrders.map(co => ({
            id: co.id,
            change_order_number: co.change_order_number,
            title: co.title,
            description: co.description,
            amount: co.amount,
            tax_amount: co.tax_amount,
            total: co.total,
            line_items: (co.line_items || []).map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
              notes: item.notes,
            })),
          })),
          originalContractPrice: contract?.original_contract_price || contract?.original_total,
          originalSubtotal: contract?.original_subtotal,
          currentContractPrice: contract?.current_contract_price,
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
      const updateResult = await updateQuotePDFUrl((quote as any).id, uploadResult.url)

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
      const signatures = await fetchSignatures((quote as any).id)

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
        (quote as any).id,
        blob,
        (quote as any).version || 1
      )

      if ('error' in uploadResult) {
        throw new Error(uploadResult.error)
      }

      // Update quote record with PDF URL
      await updateQuotePDFUrl((quote as any).id, uploadResult.url)

      // Download to user's device
      const fileName = `${company.name.replace(/\s+/g, '_')}_Quote_${(quote as any).quote_number}.pdf`
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
