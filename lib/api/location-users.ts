import { createClient } from '@/lib/supabase/client'
import type { ApiResponse } from '@/lib/types/api'

export type LocationRole = 'location_admin' | 'manager' | 'member'

export interface LocationUser {
  id: string
  location_id: string
  user_id: string
  location_role: LocationRole
  assigned_at: string
  assigned_by: string | null
  
  // Joined data
  users?: {
    full_name: string
    email: string
    role: string
    avatar_url: string | null
  }
}

export interface LocationUserInsert {
  location_id: string
  user_id: string
  location_role: LocationRole
  assigned_by?: string
}

// Get all location-user assignments for a company (for filtering)
export async function getAllLocationUsers(companyId: string): Promise<ApiResponse<LocationUser[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .select(`
        *,
        locations!inner (
          company_id
        )
      `)
      .eq('locations.company_id', companyId)
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching all location users:', error)
    return { data: null, error: error.message || 'Failed to fetch location users' }
  }
}

// Get all users assigned to a location
export async function getLocationUsers(locationId: string): Promise<ApiResponse<LocationUser[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .select(`
        *,
        users (
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .eq('location_id', locationId)
      .order('location_role', { ascending: true })
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching location users:', error)
    return { data: null, error: error.message || 'Failed to fetch location users' }
  }
}

// Get all locations for a user
export async function getUserLocations(userId: string): Promise<ApiResponse<LocationUser[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .select(`
        *,
        locations (
          id,
          name,
          city,
          state,
          is_primary
        )
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('Error fetching user locations:', error)
    return { data: null, error: error.message || 'Failed to fetch user locations' }
  }
}

// Assign user to location
export async function assignUserToLocation(
  assignment: LocationUserInsert
): Promise<ApiResponse<LocationUser>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .insert(assignment)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error assigning user to location:', error)
    return { data: null, error: error.message || 'Failed to assign user to location' }
  }
}

// Update user's location role
export async function updateLocationUserRole(
  locationUserId: string,
  newRole: LocationRole
): Promise<ApiResponse<LocationUser>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .update({ location_role: newRole })
      .eq('id', locationUserId)
      .select()
      .single()
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error updating location user role:', error)
    return { data: null, error: error.message || 'Failed to update role' }
  }
}

// Remove user from location
export async function removeUserFromLocation(
  locationUserId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('location_users')
      .delete()
      .eq('id', locationUserId)
    
    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Error removing user from location:', error)
    return { data: null, error: error.message || 'Failed to remove user from location' }
  }
}

// Check if user is location admin
export async function isLocationAdmin(
  userId: string,
  locationId: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('location_users')
      .select('location_role')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .eq('location_role', 'location_admin')
      .maybeSingle()
    
    return !error && data !== null
  } catch (error) {
    return false
  }
}
