import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import { createClient } from '@/lib/supabase/client'
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile,
  getSignatureFields,
  createSignatureFields,
  getSignatures,
  createSignature,
  getShareLinkByToken,
  createShareLink,
  revokeShareLink,
  incrementShareLinkViews,
  trackDocumentView,
} from '@/lib/api/documents'
import {
  DocumentInsert,
  DocumentUpdate,
  DocumentFilters,
  DocumentSignatureFieldInsert,
  DocumentSignatureInsert,
  DocumentShareLinkInsert,
} from '@/lib/types/documents'
import { toast } from 'sonner'

// =============================================
// DOCUMENTS
// =============================================

/**
 * Get all documents for a lead
 */
export function useDocuments(leadId: string, filters?: DocumentFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['documents', company?.id, leadId, filters],
    queryFn: () => getDocuments(company!.id, leadId, filters),
    enabled: !!company?.id && !!leadId,
  })
}

/**
 * Get a single document by ID
 */
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => getDocument(documentId),
    enabled: !!documentId,
  })
}

/**
 * Upload and create a document
 */
export function useUploadDocument() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      leadId,
      file,
      documentData,
    }: {
      leadId: string
      file: File
      documentData: Omit<DocumentInsert, 'file_url' | 'file_name' | 'file_size' | 'mime_type'>
    }) => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Step 1: Upload file to storage
      const uploadResult = await uploadDocumentFile(company!.id, leadId, file)
      if (uploadResult.error) throw uploadResult.error

      // Step 2: Create document record
      const document: DocumentInsert = {
        ...documentData,
        file_url: uploadResult.data!.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      }

      const result = await createDocument(document)
      if (result.error) throw result.error

      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', company?.id, variables.leadId] })
      toast.success('Document uploaded successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to upload document:', error)
      toast.error(`Failed to upload document: ${error.message}`)
    },
  })
}

/**
 * Create a document record (without uploading a file - for generated PDFs)
 */
export function useCreateDocument() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (document: DocumentInsert) => {
      const result = await createDocument(document)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', company?.id, data.lead_id] })
      toast.success('Document created successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to create document:', error)
      toast.error(`Failed to create document: ${error.message}`)
    },
  })
}

/**
 * Update a document
 */
export function useUpdateDocument() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      documentId,
      updates,
    }: {
      documentId: string
      updates: DocumentUpdate
    }) => {
      const result = await updateDocument(documentId, updates)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', company?.id, data.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.id] })
      toast.success('Document updated successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to update document:', error)
      toast.error(`Failed to update document: ${error.message}`)
    },
  })
}

/**
 * Delete a document
 */
export function useDeleteDocument() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      documentId,
      leadId,
    }: {
      documentId: string
      leadId: string
    }) => {
      const result = await deleteDocument(documentId)
      if (result.error) throw result.error
      return { documentId, leadId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', company?.id, data.leadId] })
      toast.success('Document deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to delete document:', error)
      toast.error(`Failed to delete document: ${error.message}`)
    },
  })
}

// =============================================
// SIGNATURE FIELDS
// =============================================

/**
 * Get signature fields for a document
 */
export function useSignatureFields(documentId: string) {
  return useQuery({
    queryKey: ['signature-fields', documentId],
    queryFn: () => getSignatureFields(documentId),
    enabled: !!documentId,
  })
}

/**
 * Create signature fields
 */
export function useCreateSignatureFields() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fields: DocumentSignatureFieldInsert[]) => {
      const result = await createSignatureFields(fields)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['signature-fields', data[0].document_id] })
      }
      toast.success('Signature fields created')
    },
    onError: (error: Error) => {
      console.error('Failed to create signature fields:', error)
      toast.error(`Failed to create signature fields: ${error.message}`)
    },
  })
}

// =============================================
// SIGNATURES
// =============================================

/**
 * Get signatures for a document
 */
export function useSignatures(documentId: string) {
  return useQuery({
    queryKey: ['signatures', documentId],
    queryFn: () => getSignatures(documentId),
    enabled: !!documentId,
  })
}

/**
 * Create a signature
 */
export function useCreateSignature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (signature: DocumentSignatureInsert) => {
      const result = await createSignature(signature)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signatures', data.document_id] })
      queryClient.invalidateQueries({ queryKey: ['documents', data.document_id] })
      toast.success('Signature saved')
    },
    onError: (error: Error) => {
      console.error('Failed to save signature:', error)
      toast.error(`Failed to save signature: ${error.message}`)
    },
  })
}

// =============================================
// SHARE LINKS
// =============================================

/**
 * Get share link by token (public - no auth required)
 */
export function useShareLink(shareToken: string) {
  return useQuery({
    queryKey: ['share-link', shareToken],
    queryFn: () => getShareLinkByToken(shareToken),
    enabled: !!shareToken,
    retry: false,
  })
}

/**
 * Create a share link
 */
export function useCreateShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shareLink: DocumentShareLinkInsert) => {
      const result = await createShareLink(shareLink)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', data.document_id] })
      toast.success('Share link created')
    },
    onError: (error: Error) => {
      console.error('Failed to create share link:', error)
      toast.error(`Failed to create share link: ${error.message}`)
    },
  })
}

/**
 * Revoke a share link
 */
export function useRevokeShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shareLinkId,
      documentId,
    }: {
      shareLinkId: string
      documentId: string
    }) => {
      const result = await revokeShareLink(shareLinkId)
      if (result.error) throw result.error
      return { shareLinkId, documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', data.documentId] })
      toast.success('Share link revoked')
    },
    onError: (error: Error) => {
      console.error('Failed to revoke share link:', error)
      toast.error(`Failed to revoke share link: ${error.message}`)
    },
  })
}

/**
 * Track share link view
 */
export function useTrackShareLinkView() {
  return useMutation({
    mutationFn: async ({
      shareLinkId,
      documentId,
      ipAddress,
      userAgent,
    }: {
      shareLinkId: string
      documentId: string
      ipAddress?: string
      userAgent?: string
    }) => {
      // Increment view count
      await incrementShareLinkViews(shareLinkId)

      // Track view
      await trackDocumentView(documentId, shareLinkId, ipAddress, userAgent)
    },
  })
}
