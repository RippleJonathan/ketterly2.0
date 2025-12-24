// Document Library API Functions
import { createClient } from '@/lib/supabase/client'
import {
  GlobalDocument,
  CompanyDocument,
  CompanyDocumentWithUser,
  DocumentLibraryFilters,
  UploadCompanyDocumentData,
  GlobalCompanyDocumentCategory,
} from '@/lib/types/documents'
import { ApiResponse } from '@/lib/types/api'

const supabase = createClient()

// =====================================================
// GLOBAL DOCUMENTS (Read-only for companies)
// =====================================================

export async function getGlobalDocuments(
  filters?: {
    category?: GlobalCompanyDocumentCategory
    tags?: string[]
    search?: string
  }
): Promise<ApiResponse<GlobalDocument[]>> {
  try {
    let query = supabase
      .from('global_documents')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return { data: data as GlobalDocument[], error: null }
  } catch (error: any) {
    console.error('Failed to fetch global documents:', error)
    return { data: null, error }
  }
}

// =====================================================
// COMPANY DOCUMENTS (Full CRUD)
// =====================================================

export async function getCompanyDocuments(
  companyId: string,
  filters?: DocumentLibraryFilters
): Promise<ApiResponse<CompanyDocumentWithUser[]>> {
  try {
    let query = supabase
      .from('company_documents')
      .select(`
        *,
        uploader:users!company_documents_uploaded_by_fkey(full_name, email)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived)
    }

    if (filters?.is_template !== undefined) {
      query = query.eq('is_template', filters.is_template)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return { data: data as CompanyDocumentWithUser[], error: null }
  } catch (error: any) {
    console.error('Failed to fetch company documents:', error)
    return { data: null, error }
  }
}

export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  metadata: UploadCompanyDocumentData
): Promise<ApiResponse<CompanyDocument>> {
  try {
    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/${metadata.category}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-documents')
      .getPublicUrl(fileName)

    // 3. Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // 4. Create database record
    const { data, error } = await supabase
      .from('company_documents')
      .insert({
        company_id: companyId,
        title: metadata.title,
        description: metadata.description || null,
        category: metadata.category,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        tags: metadata.tags || [],
        is_template: metadata.is_template || false,
        template_variables: metadata.template_variables || null,
      })
      .select()
      .single()

    if (error) {
      // Cleanup: delete uploaded file if database insert fails
      await supabase.storage.from('company-documents').remove([fileName])
      throw error
    }

    return { data: data as CompanyDocument, error: null }
  } catch (error: any) {
    console.error('Failed to upload document:', error)
    return { data: null, error }
  }
}

export async function updateCompanyDocument(
  documentId: string,
  updates: Partial<UploadCompanyDocumentData> & { is_archived?: boolean }
): Promise<ApiResponse<CompanyDocument>> {
  try {
    const { data, error } = await supabase
      .from('company_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return { data: data as CompanyDocument, error: null }
  } catch (error: any) {
    console.error('Failed to update document:', error)
    return { data: null, error }
  }
}

export async function deleteCompanyDocument(
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    // Hard delete - permanently remove from database
    const { error } = await supabase
      .from('company_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
    
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete document:', error)
    return { data: null, error }
  }
}

export async function archiveCompanyDocument(
  documentId: string,
  archived: boolean = true
): Promise<ApiResponse<CompanyDocument>> {
  return updateCompanyDocument(documentId, { is_archived: archived })
}

// Helper: Download document
export function downloadDocument(fileUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.href = fileUrl
  link.download = fileName
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
