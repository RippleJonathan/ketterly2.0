'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Loader2, X } from 'lucide-react'
import { replaceVariables, DocumentData } from '@/lib/utils/document-variables'
import { format } from 'date-fns'
import SignatureCanvas from 'react-signature-canvas'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SignaturePageClientProps {
  document: any
  leadId?: string
}

export function SignaturePageClient({ document, leadId }: SignaturePageClientProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(document.lead?.email || '')
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const router = useRouter()

  const supabase = createClient()

  const documentData: DocumentData = {
    company: document.company ? {
      name: document.company.name,
      address: document.company.address,
      city: document.company.city,
      state: document.company.state,
      zip: document.company.zip,
      contact_phone: document.company.contact_phone,
      contact_email: document.company.contact_email,
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
  }

  const handleSign = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error('Please provide your signature')
      return
    }

    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    setIsSigning(true)

    try {
      const signatureData = signatureRef.current.toDataURL()

      // Call API to save signature
      const { error } = await supabase.rpc('save_customer_signature', {
        p_document_id: document.id,
        p_signature_data: signatureData,
        p_name: name,
        p_email: email,
        p_ip: '' // Browser doesn't have access to IP
      })

      if (error) throw error

      setIsSigned(true)
      toast.success('Document signed successfully!')
    } catch (error: any) {
      console.error('Signature error:', error)
      toast.error(error.message || 'Failed to save signature')
    } finally {
      setIsSigning(false)
    }
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
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
        if (!document.quote) return null
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
        // Don't render signature section in preview - it's handled separately below
        return null

      default:
        return null
    }
  }

  if (isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Document Signed!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for signing. A copy has been sent to your email.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You can now close this window.
            </p>
            {leadId && (
              <Button
                onClick={() => router.push(`/admin/leads/${leadId}?tab=documents`)}
                variant="outline"
              >
                Back to Lead Documents
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
          {document.company && (
            <p className="text-gray-600">From {document.company.name}</p>
          )}
        </div>

        {/* Document Preview */}
        <Card>
          <CardContent className="p-0">
            {document.sections.map((section: any, index: number) => renderSection(section, index))}
          </CardContent>
        </Card>

        {/* Signature Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Signature *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              <div className="border-2 border-gray-300 rounded-lg bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-48',
                    style: { touchAction: 'none' }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Sign above using your mouse or touchscreen
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSign}
                disabled={isSigning}
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  'Sign Document'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Created on {format(new Date(document.created_at), 'MMMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}
