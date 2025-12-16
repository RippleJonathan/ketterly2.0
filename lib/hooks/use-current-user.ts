import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/lib/api/users'

export interface CurrentUser {
  id: string
  company_id: string
  email: string
  full_name: string
  role: string
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Check if current user has admin or office role
 */
export function useIsAdminOrOffice() {
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  return user?.role === 'admin' || user?.role === 'office'
}
