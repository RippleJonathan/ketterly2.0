import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for PDF generation

interface ScanPage {
  id: string
  imageData: string
  corners: any
  timestamp: number
}

interface ScanRequest {
  leadId: string
  title: string
  pages: ScanPage[]
}

/**
 * API Route: POST /api/documents/scan
 * 
 * Generates PDF from scanned document pages and uploads to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const companyId = userData.company_id

    // Parse request body
    const body: ScanRequest = await request.json()
    const { leadId, title, pages } = body

    if (!leadId || !title || !pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify lead belongs to user's company
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    console.log(`Generating PDF with ${pages.length} pages...`)

    // Generate PDF from scanned pages
    const pdfBuffer = await generatePDFFromPages(pages, title)

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `scan_${timestamp}.pdf`
    const storagePath = `${companyId}/${leadId}/${filename}`

    console.log('Uploading PDF to storage:', storagePath)

    // Upload to Supabase Storage (documents bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload PDF: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('PDF uploaded successfully:', uploadData.path)

    // Create document record in database
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        company_id: companyId,
        lead_id: leadId,
        document_type: 'other',
        title,
        description: `Scanned document with ${pages.length} page${pages.length > 1 ? 's' : ''}`,
        file_url: uploadData.path,
        file_name: filename,
        file_size: pdfBuffer.byteLength,
        mime_type: 'application/pdf',
        uploaded_by: user.id,
        visible_to_customer: false,
        requires_signature: false,
      })
      .select()
      .single()

    if (documentError) {
      console.error('Database error:', documentError)
      
      // Try to clean up uploaded file
      await supabase.storage
        .from('documents')
        .remove([uploadData.path])

      return NextResponse.json(
        { error: `Failed to create document record: ${documentError.message}` },
        { status: 500 }
      )
    }

    console.log('Document record created:', document.id)

    return NextResponse.json({
      success: true,
      document,
      message: 'Document scanned and saved successfully',
    })
  } catch (error) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate PDF from scanned page images with perspective correction
 */
async function generatePDFFromPages(pages: ScanPage[], title: string): Promise<Buffer> {
  // Create new PDF document (A4 size)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // A4 dimensions in mm
  const pageWidth = 210
  const pageHeight = 297

  // Add metadata
  pdf.setProperties({
    title,
    subject: 'Scanned Document',
    creator: 'Ketterly CRM',
    author: 'Ketterly',
  })

  // Process each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    // Add new page for all except first
    if (i > 0) {
      pdf.addPage()
    }

    try {
      // Apply perspective transform and enhancement to the image
      const processedImage = await applyPerspectiveAndEnhance(page)

      // Extract base64 data (remove data URL prefix if present)
      const base64Data = processedImage.includes(',') 
        ? processedImage.split(',')[1] 
        : processedImage

      // Add image to PDF (fit to page)
      pdf.addImage(
        base64Data,
        'JPEG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST' // Use fast compression
      )

      // Add page number at bottom
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(
        `Page ${i + 1} of ${pages.length}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      )
    } catch (error) {
      console.error(`Error adding page ${i + 1}:`, error)
      throw new Error(`Failed to add page ${i + 1} to PDF`)
    }
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))
  
  return pdfBuffer
}

/**
 * Apply perspective transform and image enhancement
 */
async function applyPerspectiveAndEnhance(page: ScanPage): Promise<string> {
  // For server-side processing, we need to use canvas in Node.js
  // Since we can't use canvas on server easily, we'll use the corners data
  // and apply client-side transformation before sending
  
  // For now, just return the image data and enhance brightness/contrast
  // The client should apply perspective transform before sending
  
  return enhanceImageQuality(page.imageData)
}

/**
 * Enhance image quality (brightness, contrast, sharpness)
 */
function enhanceImageQuality(imageData: string): string {
  // This is a placeholder - in a real implementation, you'd use sharp or canvas
  // For now, we'll return the original image
  // The client-side should apply perspective transform before sending
  
  // TODO: Use sharp library for server-side image enhancement
  // - Increase contrast
  // - Sharpen
  // - Adjust brightness
  // - Convert to grayscale if needed
  
  return imageData
}
