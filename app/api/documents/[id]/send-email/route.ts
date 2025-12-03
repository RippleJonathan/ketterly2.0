import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDocumentToCustomer } from '@/lib/email/notifications'
import { getDocumentSignedUrl } from '@/lib/api/documents'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details with company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id, companies(*)')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: userError?.message || 'User not found' }, { status: 404 })
    }

    // Get document with lead info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        lead:leads(id, full_name, email, phone)
      `)
      .eq('id', documentId)
      .eq('company_id', userData.company_id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: docError?.message || 'Document not found' }, { status: 404 })
    }

    // Check if lead has an email
    if (!document.lead?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Get signed URL and fetch file as buffer for email attachment
    const { data: signedUrl, error: urlError } = await getDocumentSignedUrl(document.file_url)
    if (urlError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    // Fetch the file as a buffer
    const fileResponse = await fetch(signedUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch document file' }, { status: 500 })
    }
    const fileBuffer = await fileResponse.arrayBuffer()

    // Send email with document attachment
    const result = await sendDocumentToCustomer(
      document,
      document.lead,
      userData.companies as any,
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
      },
      fileBuffer
    )

    if (!result.success) {
      const errMsg = 'error' in result ? (result as any).error?.message || 'Failed to send email' : 'Failed to send email'
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send document email error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
