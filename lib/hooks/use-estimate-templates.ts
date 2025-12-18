// Estimate Template React Query Hooks
// Mirror of use-material-templates.ts for estimate templates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getEstimateTemplates,
  getEstimateTemplate,
  createEstimateTemplate,
  updateEstimateTemplate,
  deleteEstimateTemplate,
  getTemplateEstimateItems,
  addMaterialToEstimateTemplate,
  bulkAddMaterialsToEstimateTemplate,
  updateTemplateEstimateItem,
  removeMaterialFromEstimateTemplate,
  reorderTemplateEstimateItems,
  getEstimateTemplateCalculations,
} from '@/lib/api/estimate-templates'
import {
  EstimateTemplateInsert,
  EstimateTemplateUpdate,
  TemplateEstimateItemInsert,
  TemplateEstimateItemUpdate,
} from '@/lib/types/estimate-templates'
import { useCurrentCompany } from './use-current-company'

// =====================================================
// ESTIMATE TEMPLATES
// =====================================================

export function useEstimateTemplates(filters?: {
  category?: string
  includeDeleted?: boolean
}) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['estimate-templates', company?.id, filters],
    queryFn: () => getEstimateTemplates(company!.id, filters),
    enabled: !!company?.id,
  })
}

export function useEstimateTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['estimate-template', templateId],
    queryFn: () => getEstimateTemplate(templateId!),
    enabled: !!templateId,
  })
}

export function useCreateEstimateTemplate() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (template: EstimateTemplateInsert) =>
      createEstimateTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates', company?.id] })
      toast.success('Template created successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

export function useUpdateEstimateTemplate() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: ({ templateId, updates }: { 
      templateId: string
      updates: EstimateTemplateUpdate 
    }) => updateEstimateTemplate(templateId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['estimate-template', variables.templateId] })
      toast.success('Template updated successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

export function useDeleteEstimateTemplate() {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()

  return useMutation({
    mutationFn: (templateId: string) => deleteEstimateTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-templates', company?.id] })
      toast.success('Template deleted successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

// =====================================================
// TEMPLATE ESTIMATE ITEMS
// =====================================================

export function useTemplateEstimateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-estimate-items', templateId],
    queryFn: () => getTemplateEstimateItems(templateId!),
    enabled: !!templateId,
  })
}

export function useAddMaterialToEstimateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: TemplateEstimateItemInsert) =>
      addMaterialToEstimateTemplate(item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-estimate-items', variables.template_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-template', variables.template_id] 
      })
      toast.success('Material added to template')
    },
    onError: (error: any) => {
      toast.error(`Failed to add material: ${error.message}`)
    },
  })
}

export function useBulkAddMaterialsToEstimateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      templateId, 
      materials 
    }: {
      templateId: string
      materials: Array<{
        material_id: string
        per_square: number
        description?: string
      }>
    }) => bulkAddMaterialsToEstimateTemplate(templateId, materials),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-estimate-items', variables.templateId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-template', variables.templateId] 
      })
      toast.success('Materials added to template')
    },
    onError: (error: any) => {
      toast.error(`Failed to add materials: ${error.message}`)
    },
  })
}

export function useUpdateTemplateEstimateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      itemId, 
      templateId,
      updates 
    }: { 
      itemId: string
      templateId: string
      updates: TemplateEstimateItemUpdate 
    }) => updateTemplateEstimateItem(itemId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-estimate-items', variables.templateId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-template', variables.templateId] 
      })
      toast.success('Item updated')
    },
    onError: (error: any) => {
      toast.error(`Failed to update item: ${error.message}`)
    },
  })
}

export function useRemoveMaterialFromEstimateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      itemId, 
      templateId 
    }: { 
      itemId: string
      templateId: string 
    }) => removeMaterialFromEstimateTemplate(itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-estimate-items', variables.templateId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-template', variables.templateId] 
      })
      toast.success('Material removed from template')
    },
    onError: (error: any) => {
      toast.error(`Failed to remove material: ${error.message}`)
    },
  })
}

export function useReorderTemplateEstimateItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      templateId,
      items 
    }: { 
      templateId: string
      items: Array<{ id: string; sort_order: number }> 
    }) => reorderTemplateEstimateItems(items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-estimate-items', variables.templateId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-template', variables.templateId] 
      })
    },
  })
}

export function useEstimateTemplateCalculations(templateId?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['estimate-template-calculations', company?.id, templateId],
    queryFn: () => getEstimateTemplateCalculations(company!.id, templateId),
    enabled: !!company?.id,
  })
}
