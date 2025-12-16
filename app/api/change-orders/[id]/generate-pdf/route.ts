import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { ChangeOrderPDF } from '@/components/admin/pdf/change-order-pdf'

/**
 * GET /api/change-orders/[id]/generate-pdf
 * 
 * Server-side PDF generation for change orders
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch change order with relations
    const { data: changeOrder, error: changeOrderError } = await supabase
      .from('change_orders')
      .select(`
        *,
        lead:leads!change_orders_lead_id_fkey(full_name, email),
        quote:quotes!change_orders_quote_id_fkey(quote_number, title),
        approved_by_user:users!change_orders_approved_by_fkey(full_name),
        created_by_user:users!change_orders_created_by_fkey(full_name)
      `)
      .eq('id', id)
      .single()

    if (changeOrderError || !changeOrder) {
      return new NextResponse('Change order not found', { status: 404 })
    }

    // Fetch company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', changeOrder.company_id)
      .single()

    if (companyError || !company) {
      return new NextResponse('Company not found', { status: 404 })
    }

    // Build company address
    const addressParts = [
      company.address,
      company.city && company.state ? `${company.city}, ${company.state}` : company.city || company.state,
      company.zip
    ].filter(Boolean)
    const companyAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

    // Extract relations (handle Supabase's array wrapping)
    const lead = Array.isArray(changeOrder.lead) ? changeOrder.lead[0] : changeOrder.lead
    const quote = Array.isArray(changeOrder.quote) ? changeOrder.quote[0] : changeOrder.quote
    const approvedByUser = Array.isArray(changeOrder.approved_by_user) 
      ? changeOrder.approved_by_user[0] 
      : changeOrder.approved_by_user

    // Prepare change order with relations
    const changeOrderWithRelations = {
      ...changeOrder,
      lead,
      quote,
      approved_by_user: approvedByUser,
    }

    // Generate PDF using React PDF template
    const pdfDoc = pdf(
      createElement(ChangeOrderPDF, {
        changeOrder: changeOrderWithRelations,
        companyName: company.name,
        companyLogo: company.logo_url || undefined,
        companyAddress: companyAddress,
        companyPhone: company.contact_phone || undefined,
        companyEmail: company.contact_email || undefined,
      }) as any
    )

    // Convert to blob/buffer
    const blob = await pdfDoc.toBlob()
    const buffer = await blob.arrayBuffer()

    // Return PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="change-order-${changeOrder.change_order_number}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating change order PDF:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
