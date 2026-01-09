import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendExecutedContractToCustomer } from '@/lib/email/notifications'
import { notifyQuoteApproved, notifyContractSigned } from '@/lib/email/user-notifications'
import { getStatusAfterQuoteApproved, getStatusAfterContractSigned } from '@/lib/utils/status-transitions'
import { applyStatusTransition } from '@/lib/api/leads'

/**
 * POST /api/quotes/sign-pdf
 * 
 * Accepts a quote signature, generates a signed PDF, saves it to storage,
 * and updates the quote status to 'accepted' (which triggers lead status update via DB trigger).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      quote_id,
      share_token,
      signer_name,
      signer_email,
      signature_data,
      accepted_terms,
      signer_user_agent,
      signer_type = 'customer', // Default to customer
      signer_title, // Optional, for company reps
    } = body

    // Validate required fields
    if (!quote_id || !share_token || !signer_name || !signer_email || !signature_data || !accepted_terms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with SERVICE ROLE key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1. Fetch and validate the quote via share_token (no embedded relationships)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .eq('share_token', share_token)
      .is('deleted_at', null)
      .single()

    if (quoteError || !quote) {
      console.error('Quote fetch error:', quoteError)
      return NextResponse.json(
        { error: 'Invalid or expired quote share link' },
        { status: 400 }
      )
    }

    // 2. Check quote status
    console.log('Quote status check:', {
      quoteId: quote.id,
      currentStatus: quote.status,
      leadId: quote.lead_id
    })
    
    if (quote.status === 'declined') {
      console.log('Quote declined, rejecting signature')
      return NextResponse.json(
        { error: 'Quote has been declined' },
        { status: 400 }
      )
    }

    console.log('Quote status valid, proceeding with signature insertion')

    // 3. Insert signature record
    console.log('Attempting signature insert for quote:', quote_id)
    
    // Cast to any to bypass TypeScript type checking (quote_signatures doesn't have deleted_at)
    const signatureInsert: any = {
      quote_id,
      company_id: quote.company_id,
      signer_name,
      signer_email,
      signature_data,
      accepted_terms,
      signer_user_agent,
      signer_ip_address: request.headers.get('x-forwarded-for') || null,
      signer_type,
      signer_title,
      deleted_at: null, // Explicitly set to null to avoid any column reference issues
    }
    
    // Debug: Log exactly what we're trying to insert
    console.log('🔍 DEBUG - Signature insert object:', JSON.stringify(signatureInsert, null, 2))
    console.log('🔍 DEBUG - Object keys:', Object.keys(signatureInsert))
    console.log('🔍 DEBUG - Has deleted_at?', 'deleted_at' in signatureInsert)
    
    const { data: signature, error: signatureError } = await supabase
      .from('quote_signatures')
      .insert(signatureInsert)
      .select('id')
      .single()

    if (signatureError) {
      console.error('❌ Signature insert FAILED:', {
        error: signatureError,
        code: signatureError.code,
        message: signatureError.message,
        details: signatureError.details,
        hint: signatureError.hint,
        table: 'quote_signatures',
        fullError: JSON.stringify(signatureError, null, 2)
      })
      return NextResponse.json(
        { 
          error: 'Failed to create signature: ' + signatureError.message,
          code: signatureError.code,
          details: signatureError.details
        },
        { status: 500 }
      )
    }

    console.log('Signature created successfully:', signature.id)

    // Notify team when customer signs (quote approved)
    if (signer_type === 'customer') {
      console.log('[NOTIFICATION] Customer signed - triggering quote approved notifications')
      
      // Automatically update lead status: QUOTE/* -> QUOTE/APPROVED
      await applyStatusTransition(
        quote.company_id,
        quote.lead_id,
        getStatusAfterQuoteApproved()
      )
      
      // Fetch lead to get assigned user and creator
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to, created_by, full_name')
        .eq('id', quote.lead_id)
        .single()
      
      if (lead) {
        // Gather team members to notify (assigned + creator, deduplicated)
        const userIdsToNotify = new Set<string>()
        if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to)
        if (lead.created_by) userIdsToNotify.add(lead.created_by)
        
        // Send notification to team members
        if (userIdsToNotify.size > 0) {
          try {
            await notifyQuoteApproved({
              userIds: Array.from(userIdsToNotify),
              companyId: quote.company_id,
              leadId: quote.lead_id,
              quoteId: quote.id,
              customerName: lead.full_name,
              quoteNumber: quote.quote_number,
              totalAmount: quote.total_amount,
              approvedAt: new Date().toISOString(),
            })
          } catch (err) {
            console.error('[NOTIFICATION] Failed to send quote approved notification:', err)
          }
        }
      }
    }

    // 4. Check if both signatures are now complete
    const { data: allSignatures, error: sigError } = await supabase
      .from('quote_signatures')
      .select('signer_type')
      .eq('quote_id', quote_id)
    
    const hasCustomerSig = allSignatures?.some(s => s.signer_type === 'customer')
    const hasCompanySig = allSignatures?.some(s => s.signer_type === 'company_rep')
    
    console.log('Signature status:', {
      hasCustomerSig,
      hasCompanySig,
      bothComplete: hasCustomerSig && hasCompanySig
    })

    // 5. If both signatures are complete, send executed contract email to customer
    if (hasCustomerSig && hasCompanySig) {
      console.log('[DUAL SIGNATURE] Both signatures complete - sending executed contract email')
      
      // Automatically update lead status: QUOTE/APPROVED -> PRODUCTION/CONTRACT_SIGNED
      await applyStatusTransition(
        quote.company_id,
        quote.lead_id,
        getStatusAfterContractSigned()
      )
      
      // Fetch company and lead data for email
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', quote.company_id)
        .single()
      
      if (companyError) {
        console.error('[DUAL SIGNATURE] Failed to fetch company:', companyError)
      }
      
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', quote.lead_id)
        .single()
      
      if (leadError) {
        console.error('[DUAL SIGNATURE] Failed to fetch lead:', leadError)
      }
      
      if (company && lead) {
        // Attach lead data to quote for email template
        const quoteWithLead = { ...quote, lead }
        
        console.log('[DUAL SIGNATURE] Sending to:', lead.email)
        console.log('[DUAL SIGNATURE] Quote:', quote.quote_number, 'Company:', company.name)
        
        try {
          const emailResult = await sendExecutedContractToCustomer(quoteWithLead, company)
          if ((emailResult as any).success) {
            console.log('[DUAL SIGNATURE] ✅ Executed contract email sent successfully:', (emailResult as any).data)
          } else {
            console.error('[DUAL SIGNATURE] ❌ Failed to send email:', (emailResult as any).error || (emailResult as any).reason)
          }
        } catch (emailError) {
          // Log error but don't fail the signature submission
          console.error('[DUAL SIGNATURE] ❌ Exception sending executed contract email:', emailError)
        }
        
        // Notify team that contract is fully signed
        console.log('[NOTIFICATION] Both signatures complete - triggering contract signed notifications')
        
        // Gather team members to notify (assigned + creator, deduplicated)
        const userIdsToNotify = new Set<string>()
        if (lead.assigned_to) userIdsToNotify.add(lead.assigned_to)
        if (lead.created_by) userIdsToNotify.add(lead.created_by)
        
        // Send notification to each team member
        for (const userId of userIdsToNotify) {
          try {
            await notifyContractSigned({
              userId,
              companyId: quote.company_id,
              leadId: quote.lead_id,
              customerName: lead.full_name,
              contractNumber: quote.quote_number,
              totalAmount: quote.total_amount,
              signedAt: new Date().toISOString(),
            })
          } catch (err) {
            console.error('[NOTIFICATION] Failed to send contract signed notification:', err)
          }
        }
      } else {
        console.error('[DUAL SIGNATURE] Missing company or lead data - cannot send email')
      }
    } else {
      console.log('[DUAL SIGNATURE] Not all signatures complete yet:', { hasCustomerSig, hasCompanySig })
    }

    // The database trigger (handle_quote_acceptance) will automatically:
    // - Update quote status based on which signatures exist
    // - Update lead status to 'production' if both signatures complete
    // - Decline other quotes for the same lead

    // If both signatures are complete, auto-generate invoice with quote PDF
    if (hasCustomerSig && hasCompanySig) {
      console.log('[AUTO-INVOICE] Both signatures complete - generating invoice with quote PDF')
      try {
        // Generate quote PDF
        const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/quotes/${quote_id}/generate-pdf`, {
          headers: {
            'x-internal-key': supabaseServiceKey,
          },
        })

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer()
          const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
          
          // Upload PDF to storage
          const fileName = `quote-${quote.quote_number}-${Date.now()}.pdf`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('quote-pdfs')
            .upload(`${quote.company_id}/${fileName}`, pdfBlob, {
              contentType: 'application/pdf',
              upsert: false,
            })

          if (uploadError) {
            console.error('[AUTO-INVOICE] Failed to upload quote PDF:', uploadError)
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('quote-pdfs')
              .getPublicUrl(uploadData.path)

            console.log('[AUTO-INVOICE] Quote PDF uploaded:', publicUrl)

            // Create invoice with quote PDF attached
            const { data: invoice, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                company_id: quote.company_id,
                lead_id: quote.lead_id,
                quote_id: quote.id,
                invoice_number: `INV-${Date.now()}`, // Temporary - will be replaced by trigger
                invoice_date: new Date().toISOString(),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                subtotal: quote.subtotal || 0,
                tax_amount: quote.tax_amount || 0,
                total_amount: quote.total_amount || 0,
                amount_due: quote.total_amount || 0,
                status: 'draft',
                quote_pdf_url: publicUrl,
                created_by: quote.created_by,
              })
              .select()
              .single()

            if (invoiceError) {
              console.error('[AUTO-INVOICE] Failed to create invoice:', invoiceError)
            } else {
              console.log('[AUTO-INVOICE] ✅ Invoice created with quote PDF:', invoice.invoice_number)
            }
          }
        } else {
          console.error('[AUTO-INVOICE] Failed to generate quote PDF:', await pdfResponse.text())
        }
      } catch (error) {
        console.error('[AUTO-INVOICE] Exception during auto-invoice generation:', error)
      }
    }

    return NextResponse.json({
      success: true,
      signature_id: signature.id,
      message: 'Quote accepted successfully',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
