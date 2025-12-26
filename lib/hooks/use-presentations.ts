/**
 * Ketterly CRM - Presentation System React Query Hooks
 * Custom hooks for managing presentation state with React Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPresentationTemplates,
  getActivePresentationTemplates,
  getPresentationTemplate,
  createPresentationTemplate,
  updatePresentationTemplate,
  deletePresentationTemplate,
  getPresentationSlides,
  createPresentationSlide,
  updatePresentationSlide,
  deletePresentationSlide,
  reorderPresentationSlides,
  getPresentationMedia,
  createPresentationMedia,
  deletePresentationMedia,
  getPresentationSessions,
  getPresentationSession,
  updatePresentationSession,
  completePresentationSession,
  abandonPresentationSession,
  startPresentation,
} from '@/lib/api/presentations'
import type {
  PresentationTemplateInsert,
  PresentationTemplateUpdate,
  PresentationSlideInsert,
  PresentationSlideUpdate,
  PresentationMediaInsert,
  PresentationSessionUpdate,
  FlowType,
  PricingOption,
} from '@/lib/types/presentations'

// =============================================
// PRESENTATION TEMPLATES HOOKS
// =============================================

export function usePresentationTemplates(companyId: string) {
  return useQuery({
    queryKey: ['presentation-templates', companyId],
    queryFn: async () => {
      const { data, error } = await getPresentationTemplates(companyId)
      if (error) throw error
      return data
    },
    enabled: !!companyId,
  })
}

export function useActivePresentationTemplates(companyId: string) {
  return useQuery({
    queryKey: ['presentation-templates', 'active', companyId],
    queryFn: async () => {
      const { data, error } = await getActivePresentationTemplates(companyId)
      if (error) throw error
      return data
    },
    enabled: !!companyId,
  })
}

export function usePresentationTemplate(templateId: string) {
  return useQuery({
    queryKey: ['presentation-template', templateId],
    queryFn: async () => {
      const { data, error } = await getPresentationTemplate(templateId)
      if (error) throw error
      return data
    },
    enabled: !!templateId,
  })
}

export function useCreatePresentationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: PresentationTemplateInsert) => createPresentationTemplate(template),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-templates', variables.company_id] })
        toast.success('Presentation template created successfully')
      } else if (result.error) {
        toast.error('Failed to create presentation template')
      }
    },
  })
}

export function useUpdatePresentationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, updates }: { templateId: string; updates: PresentationTemplateUpdate }) =>
      updatePresentationTemplate(templateId, updates),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-template', variables.templateId] })
        queryClient.invalidateQueries({ queryKey: ['presentation-templates'] })
        toast.success('Presentation template updated successfully')
      } else if (result.error) {
        toast.error('Failed to update presentation template')
      }
    },
  })
}

export function useDeletePresentationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deletePresentationTemplate(templateId),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['presentation-templates'] })
        toast.success('Presentation template deleted successfully')
      } else {
        toast.error('Failed to delete presentation template')
      }
    },
  })
}

// =============================================
// PRESENTATION SLIDES HOOKS
// =============================================

export function usePresentationSlides(templateId: string) {
  return useQuery({
    queryKey: ['presentation-slides', templateId],
    queryFn: async () => {
      const { data, error } = await getPresentationSlides(templateId)
      if (error) throw error
      return data
    },
    enabled: !!templateId,
  })
}

export function useCreatePresentationSlide() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slide: PresentationSlideInsert) => createPresentationSlide(slide),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-slides', variables.template_id] })
        queryClient.invalidateQueries({ queryKey: ['presentation-template', variables.template_id] })
        toast.success('Slide added successfully')
      } else if (result.error) {
        toast.error('Failed to add slide')
      }
    },
  })
}

export function useUpdatePresentationSlide() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slideId, updates }: { slideId: string; updates: PresentationSlideUpdate }) =>
      updatePresentationSlide(slideId, updates),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-slides'] })
        toast.success('Slide updated successfully')
      } else if (result.error) {
        toast.error('Failed to update slide')
      }
    },
  })
}

export function useDeletePresentationSlide() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slideId: string) => deletePresentationSlide(slideId),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['presentation-slides'] })
        toast.success('Slide deleted successfully')
      } else {
        toast.error('Failed to delete slide')
      }
    },
  })
}

export function useReorderPresentationSlides() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, slideOrders }: { templateId: string; slideOrders: { id: string; order: number }[] }) =>
      reorderPresentationSlides(templateId, slideOrders),
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['presentation-slides', variables.templateId] })
        toast.success('Slides reordered successfully')
      } else {
        toast.error('Failed to reorder slides')
      }
    },
  })
}

// =============================================
// PRESENTATION MEDIA HOOKS
// =============================================

export function usePresentationMedia(companyId: string) {
  return useQuery({
    queryKey: ['presentation-media', companyId],
    queryFn: async () => {
      const { data, error } = await getPresentationMedia(companyId)
      if (error) throw error
      return data
    },
    enabled: !!companyId,
  })
}

export function useCreatePresentationMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (media: PresentationMediaInsert) => createPresentationMedia(media),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-media', variables.company_id] })
        toast.success('Media uploaded successfully')
      } else if (result.error) {
        toast.error('Failed to upload media')
      }
    },
  })
}

export function useDeletePresentationMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mediaId: string) => deletePresentationMedia(mediaId),
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['presentation-media'] })
        toast.success('Media deleted successfully')
      } else {
        toast.error('Failed to delete media')
      }
    },
  })
}

// =============================================
// PRESENTATION SESSIONS HOOKS
// =============================================

export function usePresentationSessions(leadId: string) {
  return useQuery({
    queryKey: ['presentation-sessions', leadId],
    queryFn: async () => {
      const { data, error } = await getPresentationSessions(leadId)
      if (error) throw error
      return data
    },
    enabled: !!leadId,
  })
}

export function usePresentationSession(sessionId: string) {
  return useQuery({
    queryKey: ['presentation-session', sessionId],
    queryFn: async () => {
      const { data, error } = await getPresentationSession(sessionId)
      if (error) throw error
      return data
    },
    enabled: !!sessionId,
  })
}

export function useUpdatePresentationSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, updates }: { sessionId: string; updates: PresentationSessionUpdate }) =>
      updatePresentationSession(sessionId, updates),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-session', variables.sessionId] })
      }
    },
    onError: (error) => {
      console.error('Failed to update presentation session:', error)
    },
  })
}

export function useCompletePresentationSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, contractSigned }: { sessionId: string; contractSigned?: boolean }) =>
      completePresentationSession(sessionId, contractSigned),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-session', variables.sessionId] })
        queryClient.invalidateQueries({ queryKey: ['presentation-sessions'] })
        toast.success('Presentation completed')
      } else if (result.error) {
        toast.error('Failed to complete presentation')
      }
    },
  })
}

export function useAbandonPresentationSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => abandonPresentationSession(sessionId),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-session', variables] })
        queryClient.invalidateQueries({ queryKey: ['presentation-sessions'] })
      }
    },
  })
}

// =============================================
// START PRESENTATION (Main Hook)
// =============================================

export function useStartPresentation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      templateId,
      leadId,
      flowType,
      estimateIds,
      presentedBy,
    }: {
      companyId: string
      templateId: string
      leadId: string
      flowType: FlowType
      estimateIds: string[]
      presentedBy?: string
    }) => startPresentation(companyId, templateId, leadId, flowType, estimateIds, presentedBy),
    onSuccess: (result, variables) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: ['presentation-sessions', variables.leadId] })
        // Don't show toast - presentation will open immediately
      } else if (result.error) {
        toast.error('Failed to start presentation. Please try again.')
      }
    },
  })
}

// =============================================
// HELPER HOOKS FOR PRESENTATION STATE
// =============================================

/**
 * Hook to update the selected pricing option during presentation
 */
export function useUpdatePricingSelection() {
  const updateSession = useUpdatePresentationSession()

  return useMutation({
    mutationFn: ({
      sessionId,
      estimateId,
      option,
    }: {
      sessionId: string
      estimateId: string
      option: PricingOption
    }) =>
      updateSession.mutateAsync({
        sessionId,
        updates: {
          selected_estimate_id: estimateId,
          selected_option: option,
        },
      }),
  })
}
