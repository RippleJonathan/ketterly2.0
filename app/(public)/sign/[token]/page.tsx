import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SignaturePageClient } from '@/components/public/signature-page-client'

interface SignaturePageProps {
  params: Promise<{ token: string }>
}

export default async function SignaturePage({ params }: SignaturePageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch document by share token (no auth required)
  const { data: document, error } = await supabase
    .from('generated_documents')
    .select(`
      *,
      template:document_templates(*),
      lead:leads(full_name, email, phone, address, city, state, zip),
      quote:quotes(quote_number, subtotal, tax_amount, total_amount, created_at),
      project:projects(project_number),
      company:companies(*)
    `)
    .eq('share_token', token)
    .single()

  console.log('Sign page fetch:', { token, document, error })

  if (error || !document) {
    console.error('Document not found or error:', error)
    notFound()
  }

  // Check if token is expired
  if (document.share_link_expires_at) {
    const expiresAt = new Date(document.share_link_expires_at)
    if (expiresAt < new Date()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600">
              This document link has expired. Please contact the sender for a new link.
            </p>
          </div>
        </div>
      )
    }
  }

  // Check if already signed
  if (document.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Signed</h1>
          <p className="text-gray-600">
            This document has already been signed.
          </p>
        </div>
      </div>
    )
  }

  return <SignaturePageClient document={document} leadId={document.lead_id} />
}
