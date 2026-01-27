import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/utils/generate-invoice-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Await params in Next.js 15
    const { id } = await params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invoice with all relations including location
    const { data: invoice, error } = await supabase
      .from('customer_invoices')
      .select(
        `
        *,
        companies (*),
        leads:leads!customer_invoices_lead_id_fkey(full_name, email, phone, address, city, state, zip, location_id, locations(id, name, address, city, state, zip, phone, email)),
        quotes (*),
        invoice_line_items (*)
      `
      )
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate HTML
    const html = generateInvoicePDF(invoice as any)

    // Return HTML response - client will handle PDF generation
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
