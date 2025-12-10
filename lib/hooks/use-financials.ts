import { useQuery } from '@tanstack/react-query'
import { getLeadFinancials } from '@/lib/api/financials'

export function useLeadFinancials(leadId: string) {
  return useQuery({
    queryKey: ['lead-financials', leadId],
    queryFn: () => getLeadFinancials(leadId),
    enabled: !!leadId,
    staleTime: 0, // Always refetch when invalidated
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  })
}
