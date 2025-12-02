// Quote React Query hooks for Ketterly CRM
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  updateQuoteLineItems,
  duplicateQuote,
  markQuoteAsSent,
  acceptQuote,
  declineQuote,
  deleteQuote,
} from '@/lib/api/quotes'
import {
  Quote,
  QuoteUpdate,
  QuoteWithRelations,
  QuoteFilters,
  LineItemFormData,
} from '@/lib/types/quotes'
import { toast } from 'sonner'

/**
 * Hook to fetch all quotes with optional filters
 */
export function useQuotes(filters?: QuoteFilters) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['quotes', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) throw new Error('No company found')
      const result = await getQuotes(company.id, filters)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    enabled: !!company?.id,
  })
}

/**
 * Hook to fetch a single quote by ID
 */
export function useQuote(quoteId: string | undefined) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!company?.id || !quoteId) throw new Error('Missing required parameters')
      const result = await getQuote(company.id, quoteId)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    enabled: !!company?.id && !!quoteId,
  })
}

/**
 * Hook to create a new quote
 */
export function useCreateQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leadId,
      quoteData,
      createdBy,
    }: {
      leadId: string
      quoteData: {
        option_label?: string
        tax_rate: number
        discount_amount: number
        payment_terms: string
        notes?: string
        valid_until: Date
        line_items: LineItemFormData[]
      }
      createdBy: string
    }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await createQuote(company.id, leadId, quoteData, createdBy)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      if (data?.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
      }
      toast.success('Quote created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create quote: ${error.message}`)
    },
  })
}

/**
 * Hook to update a quote
 */
export function useUpdateQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      quoteId,
      updates,
    }: {
      quoteId: string
      updates: QuoteUpdate
    }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await updateQuote(company.id, quoteId, updates)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', data?.id] })
      if (data?.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
      }
      toast.success('Quote updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update quote: ${error.message}`)
    },
  })
}

/**
 * Hook to update quote line items
 */
export function useUpdateQuoteLineItems() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      quoteId,
      lineItems,
    }: {
      quoteId: string
      lineItems: LineItemFormData[]
    }) => {
      const result = await updateQuoteLineItems(quoteId, lineItems)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific quote
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] })
      // Invalidate all quotes lists to update totals on estimates tab
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      toast.success('Line items updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line items: ${error.message}`)
    },
  })
}

/**
 * Hook to duplicate a quote
 */
export function useDuplicateQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      quoteId,
      createdBy,
    }: {
      quoteId: string
      createdBy: string
    }) => {
      if (!company?.id) throw new Error('No company found')
      const result = await duplicateQuote(company.id, quoteId, createdBy)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      toast.success('Quote duplicated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate quote: ${error.message}`)
    },
  })
}

/**
 * Hook to mark quote as sent
 */
export function useMarkQuoteAsSent() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!company?.id) throw new Error('No company found')
      const result = await markQuoteAsSent(company.id, quoteId)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', data?.id] })
      toast.success('Quote marked as sent')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update quote: ${error.message}`)
    },
  })
}

/**
 * Hook to accept a quote
 */
export function useAcceptQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!company?.id) throw new Error('No company found')
      const result = await acceptQuote(company.id, quoteId)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', data?.id] })
      if (data?.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
        queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
        queryClient.invalidateQueries({ queryKey: ['activities', data.lead_id] })
      }
      toast.success('Quote accepted! Project created.')
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept quote: ${error.message}`)
    },
  })
}

/**
 * Hook to decline a quote
 */
export function useDeclineQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!company?.id) throw new Error('No company found')
      const result = await declineQuote(company.id, quoteId)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', data?.id] })
      toast.success('Quote declined')
    },
    onError: (error: Error) => {
      toast.error(`Failed to decline quote: ${error.message}`)
    },
  })
}

/**
 * Hook to delete a quote
 */
export function useDeleteQuote() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!company?.id) throw new Error('No company found')
      const result = await deleteQuote(company.id, quoteId)
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      toast.success('Quote deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete quote: ${error.message}`)
    },
  })
}

/**
 * Hook to generate a share link for a quote
 */
export function useGenerateQuoteShareLink() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ quoteId, expiresInDays }: { quoteId: string; expiresInDays?: number }) => {
      if (!company?.id) throw new Error('No company found')
      
      const { generateQuoteShareToken } = await import('@/lib/api/quotes')
      const result = await generateQuoteShareToken(company.id, quoteId, expiresInDays)
      
      if (result.error) {
        const msg = typeof result.error === 'string' ? result.error : result.error.message
        throw new Error(msg)
      }
      
      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] })
      toast.success('Share link generated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate share link: ${error.message}`)
    },
  })
}

/**
 * Hook to send quote email to customer
 */
export function useSendQuoteEmail() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!company?.id) throw new Error('No company found')
      
      const response = await fetch(`/api/quotes/${quoteId}/send-email`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      return result
    },
    onSuccess: (data, quoteId) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
      toast.success('Quote sent successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
