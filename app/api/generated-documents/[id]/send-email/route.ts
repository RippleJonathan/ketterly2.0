import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

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

    const company = userData.companies as any

    // Get generated document with lead info
    const { data: document, error: docError } = await supabase
      .from('generated_documents')
      .select(`
        *,
        template:document_templates!generated_documents_template_id_fkey(name),
        lead:leads!generated_documents_lead_id_fkey(id, full_name, email, phone, address, city, state, zip)
      `)
      .eq('id', documentId)
      .eq('company_id', userData.company_id)
      .single()

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return NextResponse.json({ error: docError?.message || 'Document not found' }, { status: 404 })
    }

    // Check if lead has an email
    if (!document.lead?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Create share link for the document
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign/${document.share_token}`

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid ${company.primary_color || '#2563eb'};
      margin-bottom: 30px;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 10px;
    }
    .content {
      padding: 20px 0;
    }
    .document-info {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 20px;
      margin: 24px 0;
      border-radius: 8px;
    }
    .document-title {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .document-desc {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
    .button {
      display: inline-block;
      background: ${company.primary_color || '#2563eb'};
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .signature {
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" class="logo">` : ''}
    <h1 style="color: ${company.primary_color || '#2563eb'}; margin: 0;">Document Ready for Review</h1>
  </div>

  <div class="content">
    <p>Hello ${document.lead.full_name || 'Customer'},</p>
    
    <p>${userData.full_name} from ${company.name} has shared a document with you for your review${document.requires_signature ? ' and signature' : ''}.</p>
    
    <div class="document-info">
      <p class="document-title">${document.title}</p>
      ${document.description ? `<p class="document-desc">${document.description}</p>` : ''}
    </div>

    ${document.requires_signature ? `
      <p><strong>This document requires your signature.</strong> Click the button below to view and sign the document:</p>
    ` : `
      <p>Click the button below to view the document:</p>
    `}

    <div style="text-align: center;">
      <a href="${shareUrl}" class="button">
        ${document.requires_signature ? 'View & Sign Document' : 'View Document'}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Or copy this link: <a href="${shareUrl}">${shareUrl}</a>
    </p>

    <p>If you have any questions, please don't hesitate to reach out.</p>

    <div class="signature">
      <p style="margin: 0;">Best regards,</p>
      <p style="margin: 5px 0;"><strong>${userData.full_name}</strong></p>
      <p style="margin: 0; color: #6b7280;">${company.name}</p>
      ${company.contact_phone ? `<p style="margin: 0; color: #6b7280;">${company.contact_phone}</p>` : ''}
      <p style="margin: 0; color: #6b7280;">${userData.email}</p>
    </div>
  </div>

  <div class="footer">
    <p>This is an automated message from ${company.name}. Please do not reply to this email.</p>
  </div>
</body>
</html>
`

    // Send email
    const result = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || `${company.name} <noreply@ketterly.com>`,
      to: document.lead.email,
      replyTo: userData.email,
      subject: `${document.requires_signature ? 'Please Sign' : 'New Document'}: ${document.title}`,
      html: emailHtml,
    })

    if (!result.success) {
      const errorMsg = (result as any).error?.message || 'Failed to send email'
      console.error('Email send error:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Update last_emailed_at
    await supabase
      .from('generated_documents')
      .update({ last_emailed_at: new Date().toISOString() })
      .eq('id', documentId)

    console.log('✅ Generated document email sent successfully:', result.data?.id)
    return NextResponse.json({ success: true, emailId: result.data?.id })

  } catch (error: any) {
    console.error('Send generated document email error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
