// Document Builder Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import {
  getDocumentTemplates,
  getDocumentTemplate,
  createDocumentTemplate,
  duplicateDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from '@/lib/api/document-templates'
import {
  getGeneratedDocuments,
  getGeneratedDocument,
  createGeneratedDocument,
  updateGeneratedDocument,
  generateDocumentShareLink,
  deleteGeneratedDocument,
} from '@/lib/api/generated-documents'
import { DocumentCategory, DocumentStatus } from '@/lib/types/document-builder'
import { toast } from 'sonner'

// =====================================================
// DOCUMENT TEMPLATES HOOKS
// =====================================================

export function useDocumentTemplates(category?: DocumentCategory) {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ['document-templates', user?.data?.company_id, category],
    queryFn: () => getDocumentTemplates(user!.data!.company_id, category),
    enabled: !!user?.data?.company_id,
  })
}

export function useDocumentTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['document-template', templateId],
    queryFn: () => getDocumentTemplate(templateId!),
    enabled: !!templateId,
  })
}

export function useCreateDocumentTemplate() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: {
      name: string
      description?: string
      category: DocumentCategory
      sections: any[]
    }) => createDocumentTemplate(user!.data!.company_id, template, user!.data!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

export function useDuplicateDocumentTemplate() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      duplicateDocumentTemplate(templateId, user!.data!.company_id, newName, user!.data!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
      toast.success('Template duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
    },
  })
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, updates }: {
      templateId: string
      updates: {
        name?: string
        description?: string
        sections?: any[]
        is_active?: boolean
      }
    }) => updateDocumentTemplate(templateId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
      queryClient.invalidateQueries({ queryKey: ['document-template', variables.templateId] })
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteDocumentTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
      toast.success('Template deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

// =====================================================
// GENERATED DOCUMENTS HOOKS
// =====================================================

export function useGeneratedDocuments(filters?: {
  status?: DocumentStatus
  leadId?: string
  quoteId?: string
}) {
  const { data: user } = useCurrentUser()

  return useQuery({
    queryKey: ['generated-documents', user?.data?.company_id, filters],
    queryFn: () => getGeneratedDocuments(user!.data!.company_id, filters),
    enabled: !!user?.data?.company_id,
  })
}

export function useGeneratedDocument(documentId: string | null) {
  return useQuery({
    queryKey: ['generated-document', documentId],
    queryFn: () => getGeneratedDocument(documentId!),
    enabled: !!documentId,
  })
}

export function useCreateGeneratedDocument() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      templateId: string
      title: string
      leadId?: string
      quoteId?: string
      projectId?: string
    }) => createGeneratedDocument(user!.data!.company_id, data, user!.data!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] })
      toast.success('Document created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create document: ${error.message}`)
    },
  })
}

export function useUpdateGeneratedDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, updates }: {
      documentId: string
      updates: {
        title?: string
        sections?: any[]
        status?: DocumentStatus
      }
    }) => updateGeneratedDocument(documentId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] })
      queryClient.invalidateQueries({ queryKey: ['generated-document', variables.documentId] })
      toast.success('Document updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`)
    },
  })
}

export function useGenerateDocumentShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, expiresInDays }: { documentId: string; expiresInDays?: number }) =>
      generateDocumentShareLink(documentId, expiresInDays),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-document', variables.documentId] })
      toast.success('Share link generated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate share link: ${error.message}`)
    },
  })
}

export function useDeleteGeneratedDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => deleteGeneratedDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents'] })
      toast.success('Document deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`)
    },
  })
}
