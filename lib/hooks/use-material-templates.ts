import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentCompany } from './use-current-company'
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate
} from '@/lib/api/material-templates'
import {
  MaterialTemplateInsert,
  MaterialTemplateUpdate,
  MaterialTemplateFilters
} from '@/lib/types/material-templates'

/**
 * Fetch all material templates
 */
export function useTemplates(filters?: MaterialTemplateFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-templates', company?.id, filters],
    queryFn: () => getTemplates(company!.id, filters),
    enabled: !!company?.id,
  })
}

/**
 * Fetch single template by ID
 */
export function useTemplate(templateId?: string) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['material-templates', company?.id, templateId],
    queryFn: () => getTemplate(company!.id, templateId!),
    enabled: !!company?.id && !!templateId,
  })
}

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: MaterialTemplateInsert) => createTemplate(company!.id, template),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to create template: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-templates', company?.id] })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, updates }: { templateId: string; updates: MaterialTemplateUpdate }) =>
      updateTemplate(company!.id, templateId, updates),
    onSuccess: (response, { templateId }) => {
      if (response.error) {
        toast.error(`Failed to update template: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-templates', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['material-templates', company?.id, templateId] })
      toast.success('Template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteTemplate(company!.id, templateId),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to delete template: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-templates', company?.id] })
      toast.success('Template deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}

/**
 * Duplicate a template
 */
export function useDuplicateTemplate() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      duplicateTemplate(company!.id, templateId, newName),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(`Failed to duplicate template: ${response.error}`)
        return
      }
      
      queryClient.invalidateQueries({ queryKey: ['material-templates', company?.id] })
      toast.success('Template duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate template: ${error.message}`)
    },
  })
}
