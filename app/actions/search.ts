'use server'

import { createClient } from '@/lib/supabase/server'

export interface SearchResult {
  id: string
  type: 'lead' | 'customer'
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  status?: string
  service_type?: string
}

export interface SearchResponse {
  results: SearchResult[]
  error: string | null
}

/**
 * Global search across leads and customers
 * Searches: full_name, email, phone, address, city
 */
export async function globalSearch(query: string): Promise<SearchResponse> {
  if (!query || query.trim().length < 2) {
    return { results: [], error: null }
  }

  try {
    const supabase = await createClient()

    // Get current user's company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { results: [], error: 'Not authenticated' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return { results: [], error: 'User not found' }
    }

    const searchPattern = `%${query.trim().toLowerCase()}%`

    // Search leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, full_name, email, phone, address, city, state, status, service_type')
      .eq('company_id', userData.company_id)
      .is('deleted_at', null)
      .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},address.ilike.${searchPattern},city.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (leadsError) {
      console.error('Search error:', leadsError)
      return { results: [], error: 'Search failed' }
    }

    // Map results to standardized format
    const results: SearchResult[] = (leads || []).map((lead: any) => ({
      id: lead.id,
      type: 'lead' as const,
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      status: lead.status,
      service_type: lead.service_type,
    }))

    return { results, error: null }
  } catch (error) {
    console.error('Global search error:', error)
    return { results: [], error: 'An unexpected error occurred' }
  }
}
