import { useQuery } from '@tanstack/react-query';
import { getDoorKnockAnalytics, getDoorKnockActivity, type DoorKnockAnalyticsFilters } from '@/lib/api/door-knock-analytics';

export function useDoorKnockAnalytics(companyId: string, filters: DoorKnockAnalyticsFilters = {}) {
  return useQuery({
    queryKey: ['door-knock-analytics', companyId, filters],
    queryFn: () => getDoorKnockAnalytics(companyId, filters),
    enabled: !!companyId,
  });
}

export function useDoorKnockActivity(companyId: string, filters: DoorKnockAnalyticsFilters = {}) {
  return useQuery({
    queryKey: ['door-knock-activity', companyId, filters],
    queryFn: () => getDoorKnockActivity(companyId, filters),
    enabled: !!companyId,
  });
}
