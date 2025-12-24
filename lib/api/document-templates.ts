// Document Templates API
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'
import { DocumentTemplate, DocumentCategory } from '@/lib/types/document-builder'

const supabase = createClient()

// Get all templates (global + company-specific)
export async function getDocumentTemplates(
  companyId: string,
  category?: DocumentCategory
): Promise<ApiResponse<DocumentTemplate[]>> {
  try {
    let query = supabase
      .from('document_templates')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error
    return { data: data as DocumentTemplate[], error: null }
  } catch (error: any) {
    console.error('Failed to get document templates:', error)
    return { data: null, error }
  }
}

// Get single template by ID
export async function getDocumentTemplate(
  templateId: string
): Promise<ApiResponse<DocumentTemplate>> {
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data: data as DocumentTemplate, error: null }
  } catch (error: any) {
    console.error('Failed to get document template:', error)
    return { data: null, error }
  }
}

// Create a new template
export async function createDocumentTemplate(
  companyId: string,
  template: {
    name: string
    description?: string
    category: DocumentCategory
    sections: any[]
  },
  userId: string
): Promise<ApiResponse<DocumentTemplate>> {
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        company_id: companyId,
        name: template.name,
        description: template.description || null,
        category: template.category,
        sections: template.sections,
        is_global: false,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as DocumentTemplate, error: null }
  } catch (error: any) {
    console.error('Failed to create document template:', error)
    return { data: null, error }
  }
}

// Duplicate a template
export async function duplicateDocumentTemplate(
  templateId: string,
  companyId: string,
  newName: string,
  userId: string
): Promise<ApiResponse<DocumentTemplate>> {
  try {
    // Get original template
    const { data: original, error: fetchError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (fetchError) throw fetchError

    // Create duplicate
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        company_id: companyId,
        name: newName,
        description: original.description,
        category: original.category,
        sections: original.sections,
        page_size: original.page_size,
        margins: original.margins,
        is_global: false,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as DocumentTemplate, error: null }
  } catch (error: any) {
    console.error('Failed to duplicate document template:', error)
    return { data: null, error }
  }
}

// Update template
export async function updateDocumentTemplate(
  templateId: string,
  updates: {
    name?: string
    description?: string
    sections?: any[]
    is_active?: boolean
  }
): Promise<ApiResponse<DocumentTemplate>> {
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return { data: data as DocumentTemplate, error: null }
  } catch (error: any) {
    console.error('Failed to update document template:', error)
    return { data: null, error }
  }
}

// Delete template (soft delete)
export async function deleteDocumentTemplate(
  templateId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', templateId)

    if (error) throw error
    return { data: undefined, error: null }
  } catch (error: any) {
    console.error('Failed to delete document template:', error)
    return { data: null, error }
  }
}
