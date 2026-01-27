// API functions for supplier documents

import { createClient } from '@/lib/supabase/client'
import { 
  SupplierDocument, 
  SupplierDocumentInsert, 
  SupplierDocumentUpdate, 
  SupplierDocumentFilters 
} from '@/lib/types/supplier-documents'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

/**
 * Get all documents for a supplier
 */
export async function getSupplierDocuments(
  companyId: string,
  supplierId: string,
  filters?: SupplierDocumentFilters
): Promise<ApiResponse<SupplierDocument[]>> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('supplier_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('supplier_id', supplierId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type)
    }

    if (filters?.expired === true) {
      // Get documents where expiration_date < today
      const today = new Date().toISOString().split('T')[0]
      query = query.lt('expiration_date', today).not('expiration_date', 'is', null)
    } else if (filters?.expired === false) {
      // Get documents where expiration_date >= today OR null
      const today = new Date().toISOString().split('T')[0]
      query = query.or(`expiration_date.gte.${today},expiration_date.is.null`)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch supplier documents:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single document by ID
 */
export async function getSupplierDocument(
  companyId: string,
  documentId: string
): Promise<ApiResponse<SupplierDocument>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch supplier document:', error)
    return createErrorResponse(error)
  }
}

/**
 * Upload a document to Supabase Storage and create database record
 */
export async function uploadSupplierDocument(
  companyId: string,
  supplierId: string,
  file: File,
  metadata: {
    document_type: SupplierDocumentInsert['document_type']
    title: string
    notes?: string
    expiration_date?: string
  }
): Promise<ApiResponse<SupplierDocument>> {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${companyId}/suppliers/${supplierId}/${fileName}`

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('supplier-documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Create database record
    const documentData: SupplierDocumentInsert = {
      company_id: companyId,
      supplier_id: supplierId,
      document_type: metadata.document_type,
      title: metadata.title,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      notes: metadata.notes || null,
      expiration_date: metadata.expiration_date || null,
      uploaded_by: user.id,
    }

    const { data, error } = await supabase
      .from('supplier_documents')
      .insert(documentData)
      .select()
      .single()

    if (error) {
      // Rollback: delete uploaded file
      await supabase.storage.from('supplier-documents').remove([filePath])
      throw error
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to upload supplier document:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update document metadata (not the file itself)
 */
export async function updateSupplierDocument(
  companyId: string,
  documentId: string,
  updates: SupplierDocumentUpdate
): Promise<ApiResponse<SupplierDocument>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('supplier_documents')
      .update(updates)
      .eq('id', documentId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update supplier document:', error)
    return createErrorResponse(error)
  }
}

/**
 * Delete a document (soft delete in DB, hard delete from storage)
 */
export async function deleteSupplierDocument(
  companyId: string,
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    // Get document to get file path
    const { data: document, error: fetchError } = await supabase
      .from('supplier_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .single()

    if (fetchError) throw fetchError

    // Soft delete from database
    const { error: deleteError } = await supabase
      .from('supplier_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('company_id', companyId)

    if (deleteError) throw deleteError

    // Hard delete from storage
    const { error: storageError } = await supabase.storage
      .from('supplier-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError)
      // Don't throw - database record is already marked deleted
    }

    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete supplier document:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get signed URL for downloading a document
 */
export async function getDocumentDownloadUrl(
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<ApiResponse<string>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('supplier-documents')
      .createSignedUrl(filePath, expiresIn)

    if (error) throw error
    if (!data?.signedUrl) throw new Error('Failed to generate download URL')

    return { data: data.signedUrl, error: null }
  } catch (error: any) {
    console.error('Failed to get download URL:', error)
    return createErrorResponse(error)
  }
}
