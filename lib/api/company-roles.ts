// Company Roles API Functions
// Manages custom roles for each company with CRUD operations

import { createClient } from '@/lib/supabase/client'
import { createErrorResponse, createSuccessResponse, type ApiResponse } from '@/lib/types/api'
import type { 
  CompanyRole, 
  CompanyRoleInsert, 
  CompanyRoleUpdate,
  CompanyRoleFilters 
} from '@/lib/types/users'

/**
 * Get all company roles for a specific company
 */
export async function getCompanyRoles(
  companyId: string,
  filters?: CompanyRoleFilters
): Promise<ApiResponse<CompanyRole[]>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('company_roles')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('is_system_role', { ascending: false }) // System roles first
      .order('display_name', { ascending: true })

    // Apply filters
    if (filters?.is_system_role !== undefined) {
      query = query.eq('is_system_role', filters.is_system_role)
    }
    
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    
    if (filters?.search) {
      query = query.or(`display_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error

    return createSuccessResponse(data, count ?? undefined)
  } catch (error) {
    console.error('Failed to fetch company roles:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get a single company role by ID
 */
export async function getCompanyRoleById(
  roleId: string
): Promise<ApiResponse<CompanyRole>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('company_roles')
      .select('*')
      .eq('id', roleId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    if (!data) throw new Error('Role not found')

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Failed to fetch company role:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create a new custom company role
 */
export async function createCompanyRole(
  role: CompanyRoleInsert
): Promise<ApiResponse<CompanyRole>> {
  try {
    const supabase = createClient()

    // Validate role_name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(role.role_name)) {
      throw new Error('Role name must be in snake_case format (e.g., project_manager)')
    }

    const { data, error } = await supabase
      .from('company_roles')
      .insert(role)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A role with this name already exists in your company')
      }
      throw error
    }

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Failed to create company role:', error)
    return createErrorResponse(error)
  }
}

/**
 * Update an existing company role
 * Note: System roles can only have their permissions updated, not name/description
 */
export async function updateCompanyRole(
  roleId: string,
  updates: CompanyRoleUpdate
): Promise<ApiResponse<CompanyRole>> {
  try {
    const supabase = createClient()

    // First, check if this is a system role
    const { data: existingRole } = await supabase
      .from('company_roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single()

    if (existingRole?.is_system_role) {
      // System roles can only update permissions
      if (updates.display_name || updates.description) {
        throw new Error('Cannot modify name or description of system roles. Only permissions can be updated.')
      }
    }

    const { data, error } = await supabase
      .from('company_roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Failed to update company role:', error)
    return createErrorResponse(error)
  }
}

/**
 * Soft delete a company role
 * Note: Cannot delete system roles
 */
export async function deleteCompanyRole(
  roleId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    // Check if this is a system role
    const { data: role } = await supabase
      .from('company_roles')
      .select('is_system_role, user_count, display_name')
      .eq('id', roleId)
      .single()

    if (!role) {
      throw new Error('Role not found')
    }

    if (role.is_system_role) {
      throw new Error('Cannot delete system roles')
    }

    if (role.user_count > 0) {
      throw new Error(`Cannot delete role "${role.display_name}" because ${role.user_count} user(s) are assigned to it. Reassign users first.`)
    }

    const { error } = await supabase
      .from('company_roles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', roleId)

    if (error) throw error

    return createSuccessResponse(undefined)
  } catch (error) {
    console.error('Failed to delete company role:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get role with user count (useful for admin UI)
 */
export async function getCompanyRolesWithUserCounts(
  companyId: string
): Promise<ApiResponse<CompanyRole[]>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('company_roles')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('is_system_role', { ascending: false })
      .order('user_count', { ascending: false })

    if (error) throw error

    return createSuccessResponse(data)
  } catch (error) {
    console.error('Failed to fetch roles with user counts:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create default roles for a new company
 * This should be called during company onboarding
 */
export async function createDefaultRoles(
  companyId: string,
  createdBy: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    // Call the database function to create default roles
    const { error } = await supabase.rpc('create_default_company_roles', {
      p_company_id: companyId,
      p_created_by: createdBy
    })

    if (error) throw error

    return createSuccessResponse(undefined)
  } catch (error) {
    console.error('Failed to create default roles:', error)
    return createErrorResponse(error)
  }
}

/**
 * Duplicate an existing role (useful for creating variations)
 */
export async function duplicateCompanyRole(
  sourceRoleId: string,
  newRoleName: string,
  newDisplayName: string
): Promise<ApiResponse<CompanyRole>> {
  try {
    const supabase = createClient()

    // Get the source role
    const { data: sourceRole, error: fetchError } = await supabase
      .from('company_roles')
      .select('company_id, description, permissions, created_by')
      .eq('id', sourceRoleId)
      .single()

    if (fetchError) throw fetchError

    // Create the new role with copied permissions
    const newRole: CompanyRoleInsert = {
      company_id: sourceRole.company_id,
      role_name: newRoleName,
      display_name: newDisplayName,
      description: sourceRole.description ? `${sourceRole.description} (copy)` : null,
      permissions: sourceRole.permissions,
      is_system_role: false,
      created_by: sourceRole.created_by
    }

    return await createCompanyRole(newRole)
  } catch (error) {
    console.error('Failed to duplicate company role:', error)
    return createErrorResponse(error)
  }
}
