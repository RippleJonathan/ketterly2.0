import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  DocumentWithRelations,
  DocumentInsert,
  DocumentUpdate,
  DocumentFilters,
  DocumentSignatureField,
  DocumentSignatureFieldInsert,
  DocumentSignature,
  DocumentSignatureInsert,
  DocumentShareLink,
  DocumentShareLinkInsert,
  DocumentShareLinkUpdate,
  DocumentView,
} from '@/lib/types/documents'

const supabase = createClient()

// =============================================
// DOCUMENTS
// =============================================

/**
 * Get all documents for a lead
 */
export async function getDocuments(
  companyId: string,
  leadId: string,
  filters?: DocumentFilters
): Promise<ApiResponse<DocumentWithRelations[]>> {
  try {
    let query = supabase
      .from('documents')
      .select(`
        *,
        lead:leads(full_name, email),
        uploaded_by_user:users(full_name)
      `)
      .eq('company_id', companyId)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.document_type) {
      if (Array.isArray(filters.document_type)) {
        query = query.in('document_type', filters.document_type)
      } else {
        query = query.eq('document_type', filters.document_type)
      }
    }

    if (filters?.requires_signature !== undefined) {
      query = query.eq('requires_signature', filters.requires_signature)
    }

    if (filters?.signature_status) {
      query = query.eq('signature_status', filters.signature_status)
    }

    if (filters?.visible_to_customer !== undefined) {
      query = query.eq('visible_to_customer', filters.visible_to_customer)
    }

    if (filters?.quote_id) {
      query = query.eq('quote_id', filters.quote_id)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], error: null, count: count || undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  documentId: string
): Promise<ApiResponse<DocumentWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        lead:leads(full_name, email, phone, address, city, state, zip),
        uploaded_by_user:users(full_name),
        signature_fields:document_signature_fields(*),
        signatures:document_signatures(*),
        share_links:document_share_links(*)
      `)
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a new document record
 */
export async function createDocument(
  document: DocumentInsert
): Promise<ApiResponse<DocumentWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select(`
        *,
        lead:leads(full_name, email),
        uploaded_by_user:users(full_name)
      `)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  documentId: string,
  updates: DocumentUpdate
): Promise<ApiResponse<DocumentWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select(`
        *,
        lead:leads(full_name, email),
        uploaded_by_user:users(full_name)
      `)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Soft delete a document
 */
export async function deleteDocument(
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadDocumentFile(
  companyId: string,
  leadId: string,
  file: File
): Promise<ApiResponse<{ path: string }>> {
  try {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${companyId}/${leadId}/${timestamp}_${randomStr}_${sanitizedFileName}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting if file exists
      })

    if (error) throw error

    return {
      data: {
        path: data.path,
      },
      error: null,
    }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a signed URL for a private document
 */
export async function getDocumentSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn)

    if (error) throw error
    return { data: data.signedUrl, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// SIGNATURE FIELDS
// =============================================

/**
 * Get signature fields for a document
 */
export async function getSignatureFields(
  documentId: string
): Promise<ApiResponse<DocumentSignatureField[]>> {
  try {
    const { data, error } = await supabase
      .from('document_signature_fields')
      .select('*')
      .eq('document_id', documentId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create signature fields for a document
 */
export async function createSignatureFields(
  fields: DocumentSignatureFieldInsert[]
): Promise<ApiResponse<DocumentSignatureField[]>> {
  try {
    const { data, error } = await supabase
      .from('document_signature_fields')
      .insert(fields)
      .select()

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// SIGNATURES
// =============================================

/**
 * Get signatures for a document
 */
export async function getSignatures(
  documentId: string
): Promise<ApiResponse<DocumentSignature[]>> {
  try {
    const { data, error } = await supabase
      .from('document_signatures')
      .select(`
        *,
        signature_field:document_signature_fields(*)
      `)
      .eq('document_id', documentId)
      .order('signed_at', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a signature
 */
export async function createSignature(
  signature: DocumentSignatureInsert
): Promise<ApiResponse<DocumentSignature>> {
  try {
    const { data, error } = await supabase
      .from('document_signatures')
      .insert(signature)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// SHARE LINKS
// =============================================

/**
 * Get share link by token
 */
export async function getShareLinkByToken(
  shareToken: string
): Promise<ApiResponse<DocumentShareLink>> {
  try {
    const { data, error } = await supabase
      .from('document_share_links')
      .select(`
        *,
        document:documents(
          *,
          lead:leads(full_name, email, phone)
        )
      `)
      .eq('share_token', shareToken)
      .is('revoked_at', null)
      .single()

    if (error) throw error

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        data: null,
        error: { message: 'Share link has expired', code: 'LINK_EXPIRED' },
      }
    }

    // Check view limit
    if (data.max_views && data.view_count >= data.max_views) {
      return {
        data: null,
        error: { message: 'Share link view limit exceeded', code: 'VIEW_LIMIT_EXCEEDED' },
      }
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create a share link
 */
export async function createShareLink(
  shareLink: DocumentShareLinkInsert
): Promise<ApiResponse<DocumentShareLink>> {
  try {
    const { data, error } = await supabase
      .from('document_share_links')
      .insert(shareLink)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update a share link
 */
export async function updateShareLink(
  shareLinkId: string,
  updates: DocumentShareLinkUpdate
): Promise<ApiResponse<DocumentShareLink>> {
  try {
    const { data, error } = await supabase
      .from('document_share_links')
      .update(updates)
      .eq('id', shareLinkId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Increment view count for a share link
 */
export async function incrementShareLinkViews(
  shareLinkId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.rpc('increment_share_link_views', {
      link_id: shareLinkId,
    })

    // If RPC doesn't exist, use manual update
    if (error?.code === '42883') {
      const { data: link } = await supabase
        .from('document_share_links')
        .select('view_count')
        .eq('id', shareLinkId)
        .single()

      if (link) {
        await supabase
          .from('document_share_links')
          .update({
            view_count: (link.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('id', shareLinkId)
      }
    } else if (error) {
      throw error
    }

    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(
  shareLinkId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('document_share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', shareLinkId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// DOCUMENT VIEWS
// =============================================

/**
 * Track a document view
 */
export async function trackDocumentView(
  documentId: string,
  shareLinkId?: string | null,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<ApiResponse<DocumentView>> {
  try {
    const { data, error } = await supabase
      .from('document_views')
      .insert({
        document_id: documentId,
        share_link_id: shareLinkId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get document views
 */
export async function getDocumentViews(
  documentId: string
): Promise<ApiResponse<DocumentView[]>> {
  try {
    const { data, error } = await supabase
      .from('document_views')
      .select('*')
      .eq('document_id', documentId)
      .order('viewed_at', { ascending: false })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
