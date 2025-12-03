/**
 * React Query hooks for lead photos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLeadPhotos,
  uploadLeadPhoto,
  deleteLeadPhoto,
  updatePhotoMetadata,
  getPhotosByCategory,
  type PhotoUploadData,
} from '@/lib/api/photos'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'

/**
 * Get all photos for a lead
 */
export function useLeadPhotos(leadId: string) {
  return useQuery({
    queryKey: ['lead-photos', leadId],
    queryFn: () => getLeadPhotos(leadId),
    enabled: !!leadId,
  })
}

/**
 * Get photos by category
 */
export function usePhotosByCategory(leadId: string, category: string) {
  return useQuery({
    queryKey: ['lead-photos', leadId, category],
    queryFn: () => getPhotosByCategory(leadId, category),
    enabled: !!leadId && !!category,
  })
}

/**
 * Upload a photo
 */
export function useUploadPhoto(leadId: string) {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<PhotoUploadData, 'leadId' | 'companyId'>) => {
      if (!company?.id) throw new Error('No company found')
      
      const result = await uploadLeadPhoto({
        ...data,
        leadId,
        companyId: company.id,
      })

      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-photos', leadId] })
      toast.success('Photo uploaded successfully')
    },
    onError: (error: Error) => {
      console.error('Upload error:', error)
      toast.error(`Failed to upload photo: ${error.message}`)
    },
  })
}

/**
 * Update photo metadata
 */
export function useUpdatePhoto(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, updates }: { photoId: string; updates: { category?: string; caption?: string } }) =>
      updatePhotoMetadata(photoId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-photos', leadId] })
      toast.success('Photo updated successfully')
    },
    onError: (error: Error) => {
      console.error('Update error:', error)
      toast.error(`Failed to update photo: ${error.message}`)
    },
  })
}

/**
 * Delete a photo
 */
export function useDeletePhoto(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, fileUrl }: { photoId: string; fileUrl: string }) =>
      deleteLeadPhoto(photoId, fileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-photos', leadId] })
      toast.success('Photo deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Delete error:', error)
      toast.error(`Failed to delete photo: ${error.message}`)
    },
  })
}
