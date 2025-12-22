import { useQuery } from '@tanstack/react-query'
import { useCurrentCompany } from './use-current-company'
import { useCurrentUser } from './use-current-user'
import {
  getDashboardStats,
  getPipelineMetrics,
  getRevenueByMonth,
  getUpcomingEvents,
  getRecentActivity,
} from '@/lib/api/dashboard'

/**
 * Hook to fetch comprehensive dashboard statistics
 */
export function useDashboardStats() {
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data

  return useQuery({
    queryKey: ['dashboard-stats', company?.id, user?.id],
    queryFn: () => getDashboardStats(company!.id, user?.id),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // Refresh every 2 minutes
  })
}

/**
 * Hook to fetch sales pipeline metrics
 */
export function usePipelineMetrics() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['pipeline-metrics', company?.id],
    queryFn: () => getPipelineMetrics(company!.id),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // Refresh every 5 minutes
  })
}

/**
 * Hook to fetch revenue by month
 */
export function useRevenueByMonth() {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['revenue-by-month', company?.id],
    queryFn: () => getRevenueByMonth(company!.id),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 10, // Refresh every 10 minutes
  })
}

/**
 * Hook to fetch upcoming events
 * @param myEventsOnly - If true, only fetch events assigned to current user
 */
export function useUpcomingEvents(myEventsOnly = false, limit = 5) {
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data

  return useQuery({
    queryKey: ['upcoming-events', company?.id, myEventsOnly ? user?.id : 'all', limit],
    queryFn: () => getUpcomingEvents(company!.id, myEventsOnly ? user?.id : undefined, limit),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 1, // Refresh every minute
  })
}

/**
 * Hook to fetch recent activity feed
 */
export function useRecentActivity(limit = 10) {
  const { data: company } = useCurrentCompany()

  return useQuery({
    queryKey: ['recent-activity', company?.id, limit],
    queryFn: () => getRecentActivity(company!.id, limit),
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // Refresh every 2 minutes
  })
}
