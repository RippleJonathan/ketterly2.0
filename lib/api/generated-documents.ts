// Generated Documents API
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'
import { GeneratedDocument, GeneratedDocumentWithRelations, DocumentStatus } from '@/lib/types/document-builder'

const supabase = createClient()

// Get all generated documents for a company
export async function getGeneratedDocuments(
  companyId: string,
  filters?: {
    status?: DocumentStatus
    leadId?: string
    quoteId?: string
  }
): Promise<ApiResponse<GeneratedDocumentWithRelations[]>> {
  try {
    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        lead:leads(full_name, email, phone, address, city, state, zip),
        quote:quotes(quote_number, subtotal, tax_amount, total_amount),
        project:projects(project_number, status),
        template:document_templates(name, category),
        creator:users!generated_documents_created_by_fkey(full_name, email)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.leadId) {
      query = query.eq('lead_id', filters.leadId)
    }
    if (filters?.quoteId) {
      query = query.eq('quote_id', filters.quoteId)
    }

    const { data, error } = await query

    if (error) throw error
    return { data: data as GeneratedDocumentWithRelations[], error: null }
  } catch (error: any) {
    console.error('Failed to get generated documents:', error)
    return { data: null, error }
  }
}

// Get single generated document
export async function getGeneratedDocument(
  documentId: string
): Promise<ApiResponse<GeneratedDocumentWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('generated_documents')
      .select(`
        *,
        lead:leads(full_name, email, phone, property_address, city, state, zip),
        quote:quotes(quote_number, subtotal, tax, total, created_at),
        project:projects(project_number, status, start_date, end_date),
        template:document_templates(name, category),
        creator:users!generated_documents_created_by_fkey(full_name, email)
      `)
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data: data as GeneratedDocumentWithRelations, error: null }
  } catch (error: any) {
    console.error('Failed to get generated document:', error)
    return { data: null, error }
  }
}

// Get document by share token (public access)
export async function getDocumentByToken(
  token: string
): Promise<ApiResponse<GeneratedDocumentWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('generated_documents')
      .select(`
        *,
        lead:leads(full_name, email, phone, property_address),
        quote:quotes(quote_number, total),
        template:document_templates(name, category)
      `)
      .eq('share_token', token)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    // Check if link has expired
    if (data.share_link_expires_at) {
      const expiresAt = new Date(data.share_link_expires_at)
      if (expiresAt < new Date()) {
        throw new Error('This document link has expired')
      }
    }

    return { data: data as GeneratedDocumentWithRelations, error: null }
  } catch (error: any) {
    console.error('Failed to get document by token:', error)
    return { data: null, error }
  }
}

// Create a generated document from template
export async function createGeneratedDocument(
  companyId: string,
  data: {
    templateId: string
    title: string
    leadId?: string
    quoteId?: string
    projectId?: string
  },
  userId: string
): Promise<ApiResponse<GeneratedDocument>> {
  try {
    // Get template sections
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('sections')
      .eq('id', data.templateId)
      .single()

    if (templateError) throw templateError

    // Create document
    const { data: document, error } = await supabase
      .from('generated_documents')
      .insert({
        company_id: companyId,
        template_id: data.templateId,
        lead_id: data.leadId || null,
        quote_id: data.quoteId || null,
        project_id: data.projectId || null,
        title: data.title,
        sections: template.sections,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return { data: document as GeneratedDocument, error: null }
  } catch (error: any) {
    console.error('Failed to create generated document:', error)
    return { data: null, error }
  }
}

// Update document
export async function updateGeneratedDocument(
  documentId: string,
  updates: {
    title?: string
    sections?: any[]
    status?: DocumentStatus
  }
): Promise<ApiResponse<GeneratedDocument>> {
  try {
    const { data, error } = await supabase
      .from('generated_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return { data: data as GeneratedDocument, error: null }
  } catch (error: any) {
    console.error('Failed to update generated document:', error)
    return { data: null, error }
  }
}

// Generate share link
export async function generateDocumentShareLink(
  documentId: string,
  expiresInDays: number = 30
): Promise<ApiResponse<{ shareUrl: string; token: string }>> {
  try {
    const shareToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { error } = await supabase
      .from('generated_documents')
      .update({
        share_token: shareToken,
        share_link_expires_at: expiresAt.toISOString(),
        status: 'sent',
      })
      .eq('id', documentId)

    if (error) throw error

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${shareToken}`
    return { data: { shareUrl, token: shareToken }, error: null }
  } catch (error: any) {
    console.error('Failed to generate share link:', error)
    return { data: null, error }
  }
}

// Save customer signature
export async function saveCustomerSignature(
  documentId: string,
  signatureData: string,
  signerName: string,
  signerEmail: string,
  ipAddress: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('generated_documents')
      .update({
        customer_signature_data: signatureData,
        customer_signed_by_name: signerName,
        customer_signed_by_email: signerEmail,
        customer_signature_ip: ipAddress,
        customer_signed_at: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', documentId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to save customer signature:', error)
    return { data: null, error }
  }
}

// Save company signature
export async function saveCompanySignature(
  documentId: string,
  signatureData: string,
  userId: string,
  ipAddress: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('generated_documents')
      .update({
        company_signature_data: signatureData,
        company_signed_by: userId,
        company_signature_ip: ipAddress,
        company_signed_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to save company signature:', error)
    return { data: null, error }
  }
}

// Delete document
export async function deleteGeneratedDocument(
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('generated_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete generated document:', error)
    return { data: null, error }
  }
}
