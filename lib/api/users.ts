// User Management API Functions
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  User,
  UserInsert,
  UserUpdate,
  UserWithRelations,
  UserFilters,
  UserFormData,
  InviteUserData,
} from '@/lib/types/users'

// =====================================================
// GET USERS
// =====================================================

export async function getUsers(
  companyId: string,
  filters?: UserFilters
): Promise<ApiResponse<UserWithRelations[]>> {
  const supabase = createClient()
  console.log('getUsers called with company_id:', companyId)
  try {
    let query = supabase
      .from('users')
      .select(`
        *,
        commission_plan:commission_plans!commission_plan_id(*),
        permissions:user_permissions(*)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })

    // Apply filters
    if (filters?.role) {
      query = query.eq('role', filters.role)
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    if (filters?.crew_role) {
      query = query.eq('crew_role', filters.crew_role)
    }
    if (filters?.has_commission_plan !== undefined) {
      if (filters.has_commission_plan) {
        query = query.not('commission_plan_id', 'is', null)
      } else {
        query = query.is('commission_plan_id', null)
      }
    }
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('getUsers error:', error)
      throw error
    }
    
    console.log(`getUsers found ${data?.length || 0} users for company ${companyId}`)
    if (data && data.length > 0) {
      console.log('Users:', data.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, deleted_at: u.deleted_at })))
    }
    
    return { data: data as UserWithRelations[], error: null, count: count || undefined }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET USER BY ID
// =====================================================

export async function getUserById(
  userId: string,
  companyId: string
): Promise<ApiResponse<UserWithRelations>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        commission_plan:commission_plans!commission_plan_id(*),
        permissions:user_permissions(*),
        foreman:users!foreman_id(id, full_name, avatar_url)
      `)
      .eq('id', userId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data: data as UserWithRelations, error: null }
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET CURRENT USER
// =====================================================

export async function getCurrentUser(): Promise<ApiResponse<UserWithRelations>> {
  const supabase = createClient()
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authData.user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        commission_plan:commission_plans!commission_plan_id(*),
        permissions:user_permissions(*),
        foreman:users!foreman_id(id, full_name, avatar_url)
      `)
      .eq('id', authData.user.id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data: data as UserWithRelations, error: null }
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE USER
// =====================================================

export async function createUser(
  companyId: string,
  userData: UserFormData
): Promise<ApiResponse<User>> {
  try {
    // Call server-side API route to create user (requires service role)
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        company_id: companyId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user')
    }

    return { data: result.data, error: null }
  } catch (error) {
    console.error('Failed to create user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// INVITE USER (Create without password, send invite email)
// =====================================================

export async function inviteUser(
  companyId: string,
  inviteData: InviteUserData
): Promise<ApiResponse<User>> {
  const supabase = createClient()
  try {
    // Step 1: Create auth user with invite
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      inviteData.email,
      {
        data: {
          full_name: inviteData.full_name,
        },
      }
    )

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to invite user')

    // Step 2: Create user record
    const userInsert: UserInsert = {
      id: authData.user.id,
      company_id: companyId,
      email: inviteData.email,
      full_name: inviteData.full_name,
      role: inviteData.role,
      commission_plan_id: inviteData.commission_plan_id || null,
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userInsert)
      .select()
      .single()

    if (userError) throw userError

    // Step 3: Apply role template if specified
    if (inviteData.role_template_id) {
      const { error: templateError } = await supabase.rpc('apply_role_template', {
        p_user_id: user.id,
        p_template_id: inviteData.role_template_id,
      })
      if (templateError) console.error('Failed to apply role template:', templateError)
    }

    return { data: user, error: null }
  } catch (error) {
    console.error('Failed to invite user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE USER
// =====================================================

export async function updateUser(
  userId: string,
  companyId: string,
  updates: UserUpdate
): Promise<ApiResponse<User>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to update user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DELETE USER (Soft delete)
// =====================================================

export async function deleteUser(
  userId: string,
  companyId: string
): Promise<ApiResponse<void>> {
  const supabase = createClient()
  try {
    // Soft delete the user
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('company_id', companyId)

    if (error) throw error

    // Remove user from all location assignments
    const { error: locationError } = await supabase
      .from('location_users')
      .delete()
      .eq('user_id', userId)

    if (locationError) {
      console.error('Failed to remove user from locations:', locationError)
      // Don't fail the whole operation, just log the error
    }

    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to delete user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DEACTIVATE USER
// =====================================================

export async function deactivateUser(
  userId: string,
  companyId: string
): Promise<ApiResponse<User>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to deactivate user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// REACTIVATE USER
// =====================================================

export async function reactivateUser(
  userId: string,
  companyId: string
): Promise<ApiResponse<User>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to reactivate user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPLOAD AVATAR
// =====================================================

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<ApiResponse<string>> {
  const supabase = createClient()
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath)

    // Update user record with avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { data: publicUrl, error: null }
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DELETE AVATAR
// =====================================================

export async function deleteAvatar(userId: string): Promise<ApiResponse<void>> {
  const supabase = createClient()
  try {
    // Get current avatar URL to extract filename
    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    if (user?.avatar_url) {
      // Extract filename from URL
      const urlParts = user.avatar_url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `avatars/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('user-avatars')
        .remove([filePath])

      if (deleteError) console.error('Failed to delete file from storage:', deleteError)
    }

    // Update user record to remove avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to delete avatar:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET FOREMEN (for crew assignment)
// =====================================================

export async function getForemen(companyId: string): Promise<ApiResponse<User[]>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, phone')
      .eq('company_id', companyId)
      .eq('crew_role', 'foreman')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })

    if (error) throw error
    return { data: data as User[], error: null }
  } catch (error) {
    console.error('Failed to fetch foremen:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET CREW MEMBERS (laborers under a foreman)
// =====================================================

export async function getCrewMembers(
  companyId: string,
  foremanId: string
): Promise<ApiResponse<User[]>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .eq('foreman_id', foremanId)
      .eq('crew_role', 'laborer')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })

    if (error) throw error
    return { data: data as User[], error: null }
  } catch (error) {
    console.error('Failed to fetch crew members:', error)
    return createErrorResponse(error)
  }
}
