'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Share2, Download, Link2 } from 'lucide-react'
import { replaceVariables, DocumentData } from '@/lib/utils/document-variables'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/types/document-builder'
import { useGenerateDocumentShareLink } from '@/lib/hooks/use-document-builder'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface GeneratedDocumentPreviewProps {
  document: any
  company: any
}

export function GeneratedDocumentPreview({ document, company }: GeneratedDocumentPreviewProps) {
  const router = useRouter()
  const generateShareLink = useGenerateDocumentShareLink()

  const documentData: DocumentData = {
    company: company ? {
      name: company.name,
      address: company.address,
      city: company.city,
      state: company.state,
      zip: company.zip,
      contact_phone: company.contact_phone,
      contact_email: company.contact_email,
    } : undefined,
    customer: document.lead ? {
      full_name: document.lead.full_name,
      email: document.lead.email,
      phone: document.lead.phone,
      property_address: document.lead.address,
      city: document.lead.city,
      state: document.lead.state,
      zip: document.lead.zip,
    } : undefined,
    quote: document.quote ? {
      quote_number: document.quote.quote_number,
      subtotal: document.quote.subtotal,
      tax: document.quote.tax,
      total: document.quote.total,
      created_at: document.quote.created_at,
    } : undefined,
    project: document.project ? {
      project_number: document.project.project_number,
      start_date: document.project.start_date,
      completion_date: document.project.completion_date,
    } : undefined,
  }

  const handleGenerateShareLink = async () => {
    const result = await generateShareLink.mutateAsync({ documentId: document.id })
    
    if (result.data?.token) {
      const shareUrl = `${window.location.origin}/sign/${result.data.token}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    }
  }

  const renderSection = (section: any, index: number) => {
    switch (section.type) {
      case 'header':
      case 'text':
        const html = replaceVariables(section.content.text || '', documentData)
        return (
          <div
            key={index}
            className="prose prose-sm max-w-none"
            style={{
              padding: section.settings?.padding || '1rem',
              borderTop: section.settings?.borderTop ? '1px solid #e5e7eb' : undefined,
              borderBottom: section.settings?.borderBottom ? '1px solid #e5e7eb' : undefined,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )

      case 'customer_info':
        return (
          <div
            key={index}
            style={{
              padding: section.settings?.padding || '1rem',
              borderTop: section.settings?.borderTop ? '1px solid #e5e7eb' : undefined,
              borderBottom: section.settings?.borderBottom ? '1px solid #e5e7eb' : undefined,
            }}
          >
            <h3 className="text-lg font-semibold mb-4">{section.title || 'Customer Information'}</h3>
            <div className="grid gap-3">
              {section.content.fields?.map((field: any, fieldIndex: number) => (
                <div key={fieldIndex}>
                  <p className="text-sm text-gray-500">{field.label}</p>
                  <p className="font-medium">
                    {replaceVariables(`{{${field.variable}}}`, documentData)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'pricing_table':
        if (!document.quote) {
          return (
            <div
              key={index}
              style={{
                padding: section.settings?.padding || '1rem',
                borderTop: section.settings?.borderTop ? '1px solid #e5e7eb' : undefined,
                borderBottom: section.settings?.borderBottom ? '1px solid #e5e7eb' : undefined,
              }}
            >
              <p className="text-sm text-gray-500">No quote linked to this document</p>
            </div>
          )
        }
        return (
          <div
            key={index}
            style={{
              padding: section.settings?.padding || '1rem',
              borderTop: section.settings?.borderTop ? '1px solid #e5e7eb' : undefined,
              borderBottom: section.settings?.borderBottom ? '1px solid #e5e7eb' : undefined,
            }}
          >
            <h3 className="text-lg font-semibold mb-4">{section.title || 'Pricing'}</h3>
            <div className="space-y-2">
              {section.content.showSubtotal && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{replaceVariables('{{quote.subtotal}}', documentData)}</span>
                </div>
              )}
              {section.content.showTax && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-medium">{replaceVariables('{{quote.tax}}', documentData)}</span>
                </div>
              )}
              {section.content.showTotal && (
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>{replaceVariables('{{quote.total}}', documentData)}</span>
                </div>
              )}
            </div>
          </div>
        )

      case 'signatures':
        return (
          <div
            key={index}
            style={{
              padding: section.settings?.padding || '2rem 1rem',
              borderTop: section.settings?.borderTop ? '1px solid #e5e7eb' : undefined,
              borderBottom: section.settings?.borderBottom ? '1px solid #e5e7eb' : undefined,
            }}
          >
            <h3 className="text-lg font-semibold mb-6">{section.title || 'Signatures'}</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {section.content.signers?.map((signer: any, signerIndex: number) => {
                const signatureData = signer.type === 'customer' 
                  ? document.customer_signature_data 
                  : document.company_signature_data
                const signedByName = signer.type === 'customer'
                  ? document.customer_signed_by_name
                  : document.company_signed_by_name
                const signedAt = signer.type === 'customer'
                  ? document.customer_signed_at
                  : document.company_signed_at

                return (
                  <div key={signerIndex} className="space-y-4">
                    <p className="font-medium">{signer.label}</p>
                    {signatureData ? (
                      <div className="space-y-2">
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <img
                            src={signatureData}
                            alt="Signature"
                            className="max-h-20"
                          />
                        </div>
                        {signer.showName && signedByName && (
                          <p className="text-sm">Name: {signedByName}</p>
                        )}
                        {signer.showDate && signedAt && (
                          <p className="text-sm">
                            Date: {format(new Date(signedAt), 'MM/dd/yyyy')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="border-b-2 border-gray-300 h-16 flex items-end pb-2">
                        <span className="text-xs text-gray-400">Unsigned</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/document-builder')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{document.title}</h2>
            <p className="text-muted-foreground">
              Created {format(new Date(document.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={DOCUMENT_STATUS_COLORS[document.status as keyof typeof DOCUMENT_STATUS_COLORS]}>
            {DOCUMENT_STATUS_LABELS[document.status as keyof typeof DOCUMENT_STATUS_LABELS]}
          </Badge>
          {!document.share_token && (
            <Button variant="outline" onClick={handleGenerateShareLink} disabled={generateShareLink.isPending}>
              <Share2 className="h-4 w-4 mr-2" />
              {generateShareLink.isPending ? 'Generating...' : 'Generate Share Link'}
            </Button>
          )}
          {document.share_token && (
            <Button
              variant="outline"
              onClick={() => {
                const shareUrl = `${window.location.origin}/sign/${document.share_token}`
                navigator.clipboard.writeText(shareUrl)
                toast.success('Share link copied!')
              }}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Copy Share Link
            </Button>
          )}
        </div>
      </div>

      {/* Document Preview */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-0">
          {document.sections.map((section: any, index: number) => renderSection(section, index))}
        </CardContent>
      </Card>
    </div>
  )
}
