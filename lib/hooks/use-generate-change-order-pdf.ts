'use client'

import { useState } from 'react'
import { useCurrentCompany } from './use-current-company'
import { ChangeOrderWithRelations } from '@/lib/types/invoices'
import { ChangeOrderPDF } from '@/components/admin/pdf/change-order-pdf'
import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function useGenerateChangeOrderPDF() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { data: company } = useCurrentCompany()
  const supabase = createClient()

  /**
   * Generate and download PDF
   */
  const generateAndDownload = async (changeOrder: ChangeOrderWithRelations) => {
    if (!company) {
      toast.error('Company information not found')
      return
    }

    setIsGenerating(true)
    try {
      // Build company address from parts, filtering out null/empty values
      const addressParts = [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ].filter(Boolean)
      const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

      // Generate PDF
      const blob = await pdf(
        createElement(ChangeOrderPDF, {
          changeOrder: changeOrder,
          companyName: company.name,
          companyLogo: company.logo_url || undefined,
          companyAddress: companyAddress,
          companyPhone: company.contact_phone || undefined,
          companyEmail: company.contact_email || undefined,
        }) as any
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `change-order-${changeOrder.change_order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Generate and upload PDF to storage
   */
  const generateAndUpload = async (changeOrder: ChangeOrderWithRelations) => {
    if (!company) {
      toast.error('Company information not found')
      return null
    }

    setIsGenerating(true)
    try {
      // Build company address
      const addressParts = [
        company.address,
        company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
        company.zip
      ].filter(Boolean)
      const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

      // Generate PDF
      const blob = await pdf(
        createElement(ChangeOrderPDF, {
          changeOrder: changeOrder,
          companyName: company.name,
          companyLogo: company.logo_url || undefined,
          companyAddress: companyAddress,
          companyPhone: company.contact_phone || undefined,
          companyEmail: company.contact_email || undefined,
        }) as any
      ).toBlob()

      // Upload to Supabase Storage
      const fileName = `change-order-${changeOrder.change_order_number}-${Date.now()}.pdf`
      const filePath = `${company.id}/change-orders/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Update change order with PDF URL
      const { error: updateError } = await supabase
        .from('change_orders')
        .update({ pdf_url: publicUrl })
        .eq('id', changeOrder.id)

      if (updateError) throw updateError

      toast.success('PDF generated and uploaded successfully')
      return publicUrl
    } catch (error) {
      console.error('Error generating and uploading PDF:', error)
      toast.error('Failed to generate PDF')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    isGenerating,
    generateAndDownload,
    generateAndUpload,
  }
}
