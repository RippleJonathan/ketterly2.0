/**
 * React Query hooks for materials library
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchMaterials,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type MaterialFormData,
} from '@/lib/api/materials'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'

/**
 * Hook to search materials (for autocomplete)
 */
export function useSearchMaterials(query: string, category?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['materials-search', company?.id, query, category],
    queryFn: () => searchMaterials(company!.id, query, category),
    enabled: !!company?.id && query.length >= 2,
  })
}

/**
 * Hook to get all materials
 */
export function useMaterials(category?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['materials', company?.id, category],
    queryFn: () => getMaterials(company!.id, category),
    enabled: !!company?.id,
  })
}

/**
 * Hook to create material
 */
export function useCreateMaterial() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MaterialFormData) => createMaterial(company!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material created successfully')
    },
    onError: (error: Error) => {
      console.error('Error creating material:', error)
      toast.error(`Failed to create material: ${error.message}`)
    },
  })
}

/**
 * Hook to update material
 */
export function useUpdateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ materialId, data }: { materialId: string; data: Partial<MaterialFormData> }) =>
      updateMaterial(materialId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material updated successfully')
    },
    onError: (error: Error) => {
      console.error('Error updating material:', error)
      toast.error(`Failed to update material: ${error.message}`)
    },
  })
}

/**
 * Hook to delete material
 */
export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (materialId: string) => deleteMaterial(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Error deleting material:', error)
      toast.error(`Failed to delete material: ${error.message}`)
    },
  })
}
