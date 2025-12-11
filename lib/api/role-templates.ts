// Role Templates API Functions
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  RoleTemplate,
  RoleTemplateInsert,
  RoleTemplateUpdate,
  UserPermissions,
} from '@/lib/types/users'

// =====================================================
// GET ROLE TEMPLATES
// =====================================================

export async function getRoleTemplates(
  companyId: string,
  includeInactive = false
): Promise<ApiResponse<RoleTemplate[]>> {
  const supabase = createClient()
  try {
    let query = supabase
      .from('role_permission_templates')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as RoleTemplate[], error: null, count: count || undefined }
  } catch (error) {
    console.error('Failed to fetch role templates:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GET ROLE TEMPLATE BY ID
// =====================================================

export async function getRoleTemplateById(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to fetch role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE ROLE TEMPLATE
// =====================================================

export async function createRoleTemplate(
  companyId: string,
  template: RoleTemplateInsert,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('role_permission_templates')
      .insert({
        ...template,
        company_id: companyId,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to create role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE ROLE TEMPLATE
// =====================================================

export async function updateRoleTemplate(
  templateId: string,
  companyId: string,
  updates: RoleTemplateUpdate
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('role_permission_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to update role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DELETE ROLE TEMPLATE (Soft delete)
// =====================================================

export async function deleteRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<void>> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('role_permission_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to delete role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DEACTIVATE ROLE TEMPLATE
// =====================================================

export async function deactivateRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('role_permission_templates')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to deactivate role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// REACTIVATE ROLE TEMPLATE
// =====================================================

export async function reactivateRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('role_permission_templates')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to reactivate role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// APPLY ROLE TEMPLATE TO USER
// =====================================================

export async function applyRoleTemplate(
  userId: string,
  templateId: string
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    // Step 1: Get template with all permission columns
    const { data: template, error: templateError } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('id', templateId)
      .is('deleted_at', null)
      .single()

    if (templateError) throw templateError

    // Step 2: Extract permission fields (all fields starting with 'can_')
    const permissionUpdates: Record<string, boolean> = {}
    Object.keys(template).forEach((key) => {
      if (key.startsWith('can_')) {
        permissionUpdates[key] = template[key]
      }
    })

    // Step 3: Update user permissions with template permissions
    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        ...permissionUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to apply role template:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// APPLY ROLE TEMPLATE TO MULTIPLE USERS
// =====================================================

export async function applyRoleTemplateToMultiple(
  userIds: string[],
  templateId: string
): Promise<ApiResponse<number>> {
  const supabase = createClient()
  try {
    // Step 1: Get template with all permission columns
    const { data: template, error: templateError } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('id', templateId)
      .is('deleted_at', null)
      .single()

    if (templateError) throw templateError

    // Step 2: Extract permission fields (all fields starting with 'can_')
    const permissionUpdates: Record<string, boolean> = {}
    Object.keys(template).forEach((key) => {
      if (key.startsWith('can_')) {
        permissionUpdates[key] = template[key]
      }
    })

    // Step 3: Update all users' permissions
    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        ...permissionUpdates,
        updated_at: new Date().toISOString(),
      })
      .in('user_id', userIds)
      .select('id')

    if (error) throw error
    return { data: data?.length || 0, error: null }
  } catch (error) {
    console.error('Failed to apply role template to multiple users:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CREATE TEMPLATE FROM USER'S PERMISSIONS
// =====================================================

export async function createTemplateFromUser(
  companyId: string,
  userId: string,
  templateName: string,
  templateDescription: string | null,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    // Step 1: Get user's current permissions
    const { data: userPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (permError) throw permError

    // Step 2: Get user's role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Step 3: Extract only permission fields (exclude id, user_id, timestamps)
    const { id, user_id, created_at, updated_at, ...permissionFields } = userPermissions

    // Step 4: Create template
    const { data: template, error: createError } = await supabase
      .from('role_permission_templates')
      .insert({
        company_id: companyId,
        name: templateName,
        description: templateDescription,
        base_role: user.role,
        default_permissions: permissionFields,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (createError) throw createError
    return { data: template, error: null }
  } catch (error) {
    console.error('Failed to create template from user:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// DUPLICATE ROLE TEMPLATE
// =====================================================

export async function duplicateRoleTemplate(
  templateId: string,
  companyId: string,
  newName: string,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  const supabase = createClient()
  try {
    // Step 1: Get original template
    const { data: original, error: fetchError } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (fetchError) throw fetchError

    // Step 2: Create new template with same permissions
    const { data: duplicate, error: createError } = await supabase
      .from('role_permission_templates')
      .insert({
        company_id: companyId,
        name: newName,
        description: `Copy of ${original.name}`,
        base_role: original.base_role,
        default_permissions: original.default_permissions,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (createError) throw createError
    return { data: duplicate, error: null }
  } catch (error) {
    console.error('Failed to duplicate role template:', error)
    return createErrorResponse(error)
  }
}

