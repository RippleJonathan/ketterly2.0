// Labor Template React Query hooks

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLaborTemplates,
  getLaborTemplate,
  createLaborTemplate,
  updateLaborTemplate,
  deleteLaborTemplate,
  getTemplateLaborItems,
  addLaborItemToTemplate,
  bulkAddLaborItemsToTemplate,
  updateTemplateLaborItem,
  removeLaborItemFromTemplate,
  getLaborTemplateWithItems,
} from '@/lib/api/labor-templates'
import {
  LaborTemplateInsert,
  LaborTemplateUpdate,
  LaborTemplateFilters,
  TemplateLaborItemInsert,
  TemplateLaborItemUpdate,
} from '@/lib/types/labor-templates'
import { useCurrentCompany } from './use-current-company'
import { toast } from 'sonner'

// =====================================================
// QUERIES
// =====================================================

/**
 * Get all labor templates for the current company
 */
export function useLaborTemplates(filters?: LaborTemplateFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['labor-templates', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return { data: [], error: null }
      return await getLaborTemplates(company.id, filters)
    },
    enabled: !!company?.id,
  })
}

/**
 * Get a single labor template by ID
 */
export function useLaborTemplate(templateId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['labor-templates', company?.id, templateId],
    queryFn: async () => {
      if (!company?.id || !templateId) return { data: null, error: null }
      return await getLaborTemplate(company.id, templateId)
    },
    enabled: !!company?.id && !!templateId,
  })
}

/**
 * Get template labor items
 */
export function useTemplateLaborItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-labor-items', templateId],
    queryFn: async () => {
      if (!templateId) return { data: [], error: null }
      return await getTemplateLaborItems(templateId)
    },
    enabled: !!templateId,
  })
}

/**
 * Get template with all its items
 */
export function useLaborTemplateWithItems(templateId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['labor-templates-with-items', company?.id, templateId],
    queryFn: async () => {
      if (!company?.id || !templateId) return { data: null, error: null }
      return await getLaborTemplateWithItems(company.id, templateId)
    },
    enabled: !!company?.id && !!templateId,
  })
}

// =====================================================
// MUTATIONS - TEMPLATES
// =====================================================

/**
 * Create a new labor template
 */
export function useCreateLaborTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template: Omit<LaborTemplateInsert, 'company_id'>) => {
      if (!company?.id) throw new Error('No company found')
      return await createLaborTemplate({
        ...template,
        company_id: company.id,
      })
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`Failed to create template: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['labor-templates', company?.id] })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

/**
 * Update a labor template
 */
export function useUpdateLaborTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string
      updates: LaborTemplateUpdate
    }) => {
      if (!company?.id) throw new Error('No company found')
      return await updateLaborTemplate(company.id, templateId, updates)
    },
    onSuccess: (result, { templateId }) => {
      if (result.error) {
        toast.error(`Failed to update template: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['labor-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['labor-templates', company?.id, templateId] })
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

/**
 * Delete a labor template
 */
export function useDeleteLaborTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!company?.id) throw new Error('No company found')
      return await deleteLaborTemplate(company.id, templateId)
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`Failed to delete template: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['labor-templates', company?.id] })
      toast.success('Template deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

// =====================================================
// MUTATIONS - TEMPLATE ITEMS
// =====================================================

/**
 * Add a labor item to a template
 */
export function useAddLaborItemToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: TemplateLaborItemInsert) => {
      return await addLaborItemToTemplate(item)
    },
    onSuccess: (result, item) => {
      if (result.error) {
        toast.error(`Failed to add item: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['template-labor-items', item.template_id] })
      queryClient.invalidateQueries({ queryKey: ['labor-templates-with-items'] })
      toast.success('Item added to template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`)
    },
  })
}

/**
 * Add multiple labor items to a template in bulk
 */
export function useBulkAddLaborItemsToTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      templateId,
      items,
    }: {
      templateId: string
      items: Omit<TemplateLaborItemInsert, 'template_id'>[]
    }) => {
      return await bulkAddLaborItemsToTemplate(templateId, items)
    },
    onSuccess: (result, { templateId }) => {
      if (result.error) {
        toast.error(`Failed to add items: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['template-labor-items', templateId] })
      queryClient.invalidateQueries({ queryKey: ['labor-templates-with-items'] })
      toast.success(`${result.data?.length || 0} items added to template`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`)
    },
  })
}

/**
 * Update a template labor item
 */
export function useUpdateTemplateLaborItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      templateId,
      updates,
    }: {
      itemId: string
      templateId: string
      updates: TemplateLaborItemUpdate
    }) => {
      return await updateTemplateLaborItem(itemId, updates)
    },
    onSuccess: (result, { templateId }) => {
      if (result.error) {
        toast.error(`Failed to update item: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['template-labor-items', templateId] })
      queryClient.invalidateQueries({ queryKey: ['labor-templates-with-items'] })
      toast.success('Item updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`)
    },
  })
}

/**
 * Remove a labor item from a template
 */
export function useRemoveLaborItemFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, templateId }: { itemId: string; templateId: string }) => {
      return await removeLaborItemFromTemplate(itemId)
    },
    onSuccess: (result, { templateId }) => {
      if (result.error) {
        toast.error(`Failed to remove item: ${result.error.message}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['template-labor-items', templateId] })
      queryClient.invalidateQueries({ queryKey: ['labor-templates-with-items'] })
      toast.success('Item removed from template')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove item: ${error.message}`)
    },
  })
}
