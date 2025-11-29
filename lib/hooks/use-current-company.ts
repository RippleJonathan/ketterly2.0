'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Company } from '@/lib/types'

export function useCurrentCompany() {
  return useQuery<Company | null>({
    queryKey: ['current-company'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return null

      // Get user's company
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id, companies(*)')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData) return null

      return userData.companies as unknown as Company
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
