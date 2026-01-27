// React Query hooks for supplier documents

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'
import {
  getSupplierDocuments,
  getSupplierDocument,
  uploadSupplierDocument,
  updateSupplierDocument,
  deleteSupplierDocument,
  getDocumentDownloadUrl,
} from '@/lib/api/supplier-documents'
import {
  SupplierDocumentInsert,
  SupplierDocumentUpdate,
  SupplierDocumentFilters,
} from '@/lib/types/supplier-documents'
import { toast } from 'sonner'

export function useSupplierDocuments(
  supplierId: string,
  filters?: SupplierDocumentFilters
) {
  const { data: userResponse } = useCurrentUser()
  const user = userResponse?.data

  return useQuery({
    queryKey: ['supplier-documents', user?.company_id, supplierId, filters],
    queryFn: () => getSupplierDocuments(user!.company_id, supplierId, filters),
    enabled: !!user?.company_id && !!supplierId,
  })
}

export function useSupplierDocument(documentId: string) {
  const { data: userResponse } = useCurrentUser()
  const user = userResponse?.data

  return useQuery({
    queryKey: ['supplier-document', user?.company_id, documentId],
    queryFn: () => getSupplierDocument(user!.company_id, documentId),
    enabled: !!user?.company_id && !!documentId,
  })
}

export function useUploadSupplierDocument(supplierId: string) {
  const { data: userResponse } = useCurrentUser()
  const user = userResponse?.data
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      file: File
      metadata: {
        document_type: SupplierDocumentInsert['document_type']
        title: string
        notes?: string
        expiration_date?: string
      }
    }) =>
      uploadSupplierDocument(
        user!.company_id,
        supplierId,
        params.file,
        params.metadata
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-documents', user?.company_id, supplierId],
      })
      toast.success('Document uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`)
    },
  })
}

export function useUpdateSupplierDocument() {
  const { data: userResponse } = useCurrentUser()
  const user = userResponse?.data
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      documentId: string
      updates: SupplierDocumentUpdate
    }) =>
      updateSupplierDocument(user!.company_id, params.documentId, params.updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-document', user?.company_id, variables.documentId],
      })
      queryClient.invalidateQueries({
        queryKey: ['supplier-documents', user?.company_id],
      })
      toast.success('Document updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`)
    },
  })
}

export function useDeleteSupplierDocument() {
  const { data: userResponse } = useCurrentUser()
  const user = userResponse?.data
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) =>
      deleteSupplierDocument(user!.company_id, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-documents', user?.company_id],
      })
      toast.success('Document deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`)
    },
  })
}

export function useDocumentDownloadUrl(filePath: string | null) {
  return useQuery({
    queryKey: ['document-download-url', filePath],
    queryFn: () => getDocumentDownloadUrl(filePath!),
    enabled: !!filePath,
    staleTime: 1000 * 60 * 50, // 50 minutes (URLs expire in 1 hour)
  })
}
