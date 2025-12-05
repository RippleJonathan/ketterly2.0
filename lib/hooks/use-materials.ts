import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getMaterials,
  getMaterial,
  searchMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  deactivateMaterial,
  getTemplateMaterials,
  addMaterialToTemplate,
  updateTemplateMaterial,
  removeMaterialFromTemplate,
  bulkAddMaterialsToTemplate
} from '@/lib/api/materials'
import {
  MaterialFilters,
  MaterialInsert,
  MaterialUpdate,
  TemplateMaterialInsert,
  TemplateMaterialUpdate
} from '@/lib/types/materials'
import { useCurrentCompany } from './use-current-company'

/**
 * Get all materials with optional filters
 */
export function useMaterials(filters?: MaterialFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['materials', company?.id, filters],
    queryFn: () => getMaterials(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Get a single material by ID
 */
export function useMaterial(materialId: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['materials', company?.id, materialId],
    queryFn: () => getMaterial(company!.id, materialId),
    enabled: !!company?.id && !!materialId,
  })
}

/**
 * Search materials for autocomplete
 */
export function useSearchMaterials(query: string, enabled: boolean = true) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['materials', 'search', company?.id, query],
    queryFn: () => searchMaterials(company!.id, query),
    enabled: !!company?.id && enabled && query.length >= 2,
  })
}

/**
 * Create a new material
 */
export function useCreateMaterial() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (material: MaterialInsert) => createMaterial(company!.id, material),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] })
      toast.success('Material created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create material: ${error.message}`)
    },
  })
}

/**
 * Update a material
 */
export function useUpdateMaterial() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ materialId, updates }: { materialId: string; updates: MaterialUpdate }) =>
      updateMaterial(company!.id, materialId, updates),
    onSuccess: (_, { materialId }) => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id, materialId] })
      toast.success('Material updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update material: ${error.message}`)
    },
  })
}

/**
 * Delete a material
 */
export function useDeleteMaterial() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (materialId: string) => deleteMaterial(company!.id, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] })
      toast.success('Material deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete material: ${error.message}`)
    },
  })
}

/**
 * Deactivate a material
 */
export function useDeactivateMaterial() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (materialId: string) => deactivateMaterial(company!.id, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', company?.id] })
      toast.success('Material deactivated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate material: ${error.message}`)
    },
  })
}

// ==============================================
// TEMPLATE MATERIALS HOOKS
// ==============================================

/**
 * Get all materials for a template
 */
export function useTemplateMaterials(templateId: string) {
  return useQuery({
    queryKey: ['template-materials', templateId],
    queryFn: () => getTemplateMaterials(templateId),
    enabled: !!templateId,
  })
}

/**
 * Add material to template
 */
export function useAddMaterialToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TemplateMaterialInsert) => addMaterialToTemplate(data),
    onSuccess: (_, { template_id }) => {
      queryClient.invalidateQueries({ queryKey: ['template-materials', template_id] })
      toast.success('Material added to template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add material: ${error.message}`)
    },
  })
}

/**
 * Update material in template
 */
export function useUpdateTemplateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates, templateId }: { id: string; updates: TemplateMaterialUpdate; templateId: string }) =>
      updateTemplateMaterial(id, updates),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-materials', templateId] })
      toast.success('Template material updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`)
    },
  })
}

/**
 * Remove material from template
 */
export function useRemoveMaterialFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, templateId }: { id: string; templateId: string }) =>
      removeMaterialFromTemplate(id),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-materials', templateId] })
      toast.success('Material removed from template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove material: ${error.message}`)
    },
  })
}

/**
 * Bulk add materials to template
 */
export function useBulkAddMaterialsToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, materials }: {
      templateId: string
      materials: Array<{ material_id: string; per_square: number; description?: string }>
    }) => bulkAddMaterialsToTemplate(templateId, materials),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-materials', templateId] })
      toast.success('Materials added to template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add materials: ${error.message}`)
    },
  })
}
