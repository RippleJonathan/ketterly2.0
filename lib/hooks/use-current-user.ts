import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface CurrentUser {
  id: string
  company_id: string
  email: string
  full_name: string
  role: string
}

export function useCurrentUser() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: userData } = await supabase
        .from('users')
        .select('id, company_id, email, full_name, role')
        .eq('id', user.id)
        .single()

      return userData as CurrentUser | null
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
