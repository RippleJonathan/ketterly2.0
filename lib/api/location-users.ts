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

// =====================================================
// OFFICE MANAGER COMMISSION SETTINGS
// =====================================================

export interface SetLocationOfficeManagerParams {
  locationId: string
  userId: string | null // null to remove
  commissionEnabled?: boolean
  commissionRate?: number | null
  commissionType?: 'percentage' | 'flat_amount'
  flatCommissionAmount?: number | null
  paidWhen?: string
}

/**
 * Set or update the office manager for a location
 * This handles the location_users entry for an office role at a location
 */
export async function setLocationOfficeManager(
  params: SetLocationOfficeManagerParams
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    console.log('🔧 setLocationOfficeManager called with:', params)

    // If userId is null, remove any existing office manager
    if (!params.userId) {
      console.log('⚠️  No userId provided - skipping office manager setup')
      // Don't delete - just clear commission settings
      return { data: undefined, error: null }
    }

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('location_users')
      .select('*')
      .eq('location_id', params.locationId)
      .eq('user_id', params.userId)
      .single()

    console.log('📋 Existing location_users entry:', existing ? 'FOUND' : 'NOT FOUND')

    if (existing) {
      // Update existing entry
      console.log('📝 Updating existing location_users entry')
      const { error } = await supabase
        .from('location_users')
        .update({
          commission_enabled: params.commissionEnabled || false,
          commission_rate: params.commissionType === 'percentage' ? params.commissionRate : null,
          commission_type: params.commissionType || 'percentage',
          flat_commission_amount: params.commissionType === 'flat_amount' ? params.flatCommissionAmount : null,
          paid_when: params.paidWhen || 'when_final_payment',
        })
        .eq('location_id', params.locationId)
        .eq('user_id', params.userId)

      if (error) {
        console.error('❌ Update failed:', error)
        throw error
      }
      console.log('✅ Update successful')
    } else {
      // Create new entry
      console.log('➕ Creating new location_users entry')
      const { error } = await supabase
        .from('location_users')
        .insert({
          location_id: params.locationId,
          user_id: params.userId,
          commission_enabled: params.commissionEnabled || false,
          commission_rate: params.commissionType === 'percentage' ? params.commissionRate : null,
          commission_type: params.commissionType || 'percentage',
          flat_commission_amount: params.commissionType === 'flat_amount' ? params.flatCommissionAmount : null,
          paid_when: params.paidWhen || 'when_final_payment',
        })

      if (error) {
        console.error('❌ Insert failed:', error)
        throw error
      }
      console.log('✅ Insert successful')
    }

    return { data: undefined, error: null }
  } catch (error) {
    console.error('Error setting location office manager:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to set office manager',
    }
  }
}

/**
 * Get the office manager (office role user) for a location
 */
export async function getLocationOfficeManager(
  locationId: string
): Promise<ApiResponse<any>> {
  try {
    const supabase = createClient()

    console.log('🔍 Getting office manager for location:', locationId)

    // Get users with role='office' assigned to this location with commission enabled
    const { data, error } = await supabase
      .from('location_users')
      .select(`
        user_id,
        location_id,
        commission_enabled,
        commission_rate,
        commission_type,
        flat_commission_amount,
        paid_when,
        users:user_id(
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('location_id', locationId)
      .eq('commission_enabled', true)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('❌ Error fetching office manager:', error)
      throw error
    }

    // Filter to only office role users (in case multiple users have commission enabled)
    const officeManager = data?.find((lu: any) => lu.users?.role === 'office') || null

    console.log('📋 Office manager found:', officeManager ? officeManager.users?.full_name : 'NONE')
    console.log('   Data:', officeManager)

    return { data: officeManager, error: null }
  } catch (error) {
    console.error('Error getting location office manager:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get office manager',
    }
  }
}
