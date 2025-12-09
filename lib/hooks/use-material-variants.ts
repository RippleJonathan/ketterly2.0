// Material Variants React Query Hooks
// Custom hooks for managing material variants with React Query

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import {
  getMaterialVariants,
  getAllCompanyVariants,
  getMaterialVariant,
  createMaterialVariant,
  updateMaterialVariant,
  deleteMaterialVariant,
  setDefaultVariant,
  getDefaultVariant,
  bulkCreateVariants,
  reorderVariants,
} from '@/lib/api/material-variants'
import type {
  MaterialVariantInsert,
  MaterialVariantUpdate,
  MaterialVariantFilters,
} from '@/lib/types/material-variants'
import { toast } from 'sonner'

/**
 * Hook to get all variants for a specific material
 */
export function useMaterialVariants(
  materialId: string,
  filters?: MaterialVariantFilters
) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-variants', company?.id, materialId, filters],
    queryFn: async () => {
      if (!company?.id) throw new Error('No company ID')
      const result = await getMaterialVariants(company.id, materialId, filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!company?.id && !!materialId,
  })
}

/**
 * Hook to get all variants across all materials for the company
 */
export function useAllCompanyVariants(filters?: MaterialVariantFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['company-variants', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) throw new Error('No company ID')
      const result = await getAllCompanyVariants(company.id, filters)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!company?.id,
  })
}

/**
 * Hook to get a single variant by ID
 */
export function useMaterialVariant(variantId: string | null) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-variant', company?.id, variantId],
    queryFn: async () => {
      if (!company?.id || !variantId) throw new Error('Missing required IDs')
      const result = await getMaterialVariant(company.id, variantId)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!company?.id && !!variantId,
  })
}

/**
 * Hook to get the default variant for a material
 */
export function useDefaultVariant(materialId: string | null) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['default-variant', company?.id, materialId],
    queryFn: async () => {
      if (!company?.id || !materialId) throw new Error('Missing required IDs')
      const result = await getDefaultVariant(company.id, materialId)
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!company?.id && !!materialId,
  })
}

/**
 * Hook to create a new material variant
 */
export function useCreateMaterialVariant() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variant: MaterialVariantInsert) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await createMaterialVariant(company.id, variant)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, data.material_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['company-variants', company?.id],
      })
      toast.success('Variant created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create variant: ${error.message}`)
    },
  })
}

/**
 * Hook to update a material variant
 */
export function useUpdateMaterialVariant() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      variantId,
      updates,
    }: {
      variantId: string
      updates: MaterialVariantUpdate
    }) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await updateMaterialVariant(company.id, variantId, updates)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variant', company?.id, data.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, data.material_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['company-variants', company?.id],
      })
      toast.success('Variant updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update variant: ${error.message}`)
    },
  })
}

/**
 * Hook to delete a material variant
 */
export function useDeleteMaterialVariant() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variantId: string) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await deleteMaterialVariant(company.id, variantId)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, data.material_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['company-variants', company?.id],
      })
      toast.success('Variant deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete variant: ${error.message}`)
    },
  })
}

/**
 * Hook to set a variant as default
 */
export function useSetDefaultVariant() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      materialId,
      variantId,
    }: {
      materialId: string
      variantId: string
    }) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await setDefaultVariant(company.id, materialId, variantId)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, data.material_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['default-variant', company?.id, data.material_id],
      })
      toast.success('Default variant updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to set default variant: ${error.message}`)
    },
  })
}

/**
 * Hook to bulk create variants
 */
export function useBulkCreateVariants() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      materialId,
      variants,
    }: {
      materialId: string
      variants: Omit<MaterialVariantInsert, 'material_id'>[]
    }) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await bulkCreateVariants(company.id, materialId, variants)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, variables.materialId],
      })
      queryClient.invalidateQueries({
        queryKey: ['company-variants', company?.id],
      })
      toast.success(`${data.length} variants created successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create variants: ${error.message}`)
    },
  })
}

/**
 * Hook to reorder variants
 */
export function useReorderVariants() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      materialId,
      variantIds,
    }: {
      materialId: string
      variantIds: string[]
    }) => {
      if (!company?.id) throw new Error('No company ID')
      const result = await reorderVariants(company.id, materialId, variantIds)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['material-variants', company?.id, variables.materialId],
      })
      toast.success('Variants reordered successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder variants: ${error.message}`)
    },
  })
}
