'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to get the current user's company
 * Returns the company associated with the logged-in user
 */
export function useCurrentCompany() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['current-company'],
    queryFn: async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Not authenticated')
      }

      // Get user data with company
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          company_id,
          companies (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            contact_email,
            contact_phone,
            address,
            city,
            state,
            zip,
            subscription_tier,
            subscription_status,
            onboarding_completed,
            contract_terms,
            replacement_warranty_years,
            repair_warranty_years,
            tax_rate
          )
        `)
        .eq('id', user.id)
        .single()

      if (error) throw error
      if (!userData?.companies) throw new Error('No company found')

      // Return the company data (arrays are for joins, but we have single company)
      const company = Array.isArray(userData.companies) 
        ? userData.companies[0] 
        : userData.companies

      return company
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  })
}
