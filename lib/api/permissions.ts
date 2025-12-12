// Permissions Management API Functions
import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  UserPermissions,
  UserPermissionsUpdate,
  PermissionKey,
  DEFAULT_ROLE_PERMISSIONS,
  UserRole,
} from '@/lib/types/users'

// =====================================================
// GET USER PERMISSIONS
// =====================================================

export async function getUserPermissions(
  userId: string
): Promise<ApiResponse<UserPermissions | null>> {
  const supabase = createClient()
  try {
    // First, try to get existing permissions from user_permissions table
    const { data: existingPermissions, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    // If user has permissions in database, return them
    if (existingPermissions) {
      return { data: existingPermissions, error: null }
    }

    // If no permissions exist, load from company_roles based on user's role
    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .single()

    if (!userData) {
      return { data: null, error: null }
    }

    // Get permissions from company_roles
    const { data: companyRole } = await supabase
      .from('company_roles')
      .select('permissions')
      .eq('company_id', userData.company_id)
      .eq('role_name', userData.role)
      .is('deleted_at', null)
      .single()

    if (companyRole && companyRole.permissions) {
      // Return permissions from company_roles (as UserPermissions type)
      return { 
        data: {
          user_id: userId,
          ...companyRole.permissions
        } as UserPermissions, 
        error: null 
      }
    }

    // Final fallback: use DEFAULT_ROLE_PERMISSIONS
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userData.role as UserRole]
    if (defaultPerms) {
      return { 
        data: {
          user_id: userId,
          ...defaultPerms
        } as UserPermissions, 
        error: null 
      }
    }

    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to fetch user permissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// UPDATE USER PERMISSIONS
// =====================================================

export async function updateUserPermissions(
  userId: string,
  permissions: UserPermissionsUpdate
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    // Use upsert to insert if doesn't exist, update if it does
    const { data, error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        ...permissions,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to update permissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// COPY PERMISSIONS FROM ONE USER TO ANOTHER
// =====================================================

export async function copyPermissions(
  fromUserId: string,
  toUserId: string
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    // Step 1: Get source user's permissions
    const { data: sourcePermissions, error: fetchError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', fromUserId)
      .single()

    if (fetchError) throw fetchError

    // Step 2: Extract only permission fields (exclude id, user_id, timestamps)
    const { id, user_id, created_at, updated_at, ...permissionFields } = sourcePermissions

    // Step 3: Update target user's permissions (or insert if not exists)
    const { data: existingPerms } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', toUserId)
      .maybeSingle()

    let data, error

    if (existingPerms) {
      // Update existing permissions
      const result = await supabase
        .from('user_permissions')
        .update({
          ...permissionFields,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', toUserId)
        .select()
        .single()
      
      data = result.data
      error = result.error
    } else {
      // Insert new permissions
      const result = await supabase
        .from('user_permissions')
        .insert({
          user_id: toUserId,
          ...permissionFields,
        })
        .select()
        .single()
      
      data = result.data
      error = result.error
    }

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to copy permissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// GRANT ALL PERMISSIONS (Make admin)
// =====================================================

export async function grantAllPermissions(
  userId: string
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    // Get all permission keys and set to true
    const allPermissions: UserPermissionsUpdate = {
      // Leads & Projects
      can_view_leads: true,
      can_create_leads: true,
      can_edit_leads: true,
      can_delete_leads: true,
      can_view_all_leads: true,
      
      // Quotes
      can_view_quotes: true,
      can_create_quotes: true,
      can_edit_quotes: true,
      can_delete_quotes: true,
      can_approve_quotes: true,
      can_send_quotes: true,
      
      // Invoices & Payments
      can_view_invoices: true,
      can_create_invoices: true,
      can_edit_invoices: true,
      can_delete_invoices: true,
      can_record_payments: true,
      can_void_payments: true,
      
      // Material Orders
      can_view_material_orders: true,
      can_create_material_orders: true,
      can_edit_material_orders: true,
      can_delete_material_orders: true,
      can_mark_orders_paid: true,
      
      // Work Orders
      can_view_work_orders: true,
      can_create_work_orders: true,
      can_edit_work_orders: true,
      can_delete_work_orders: true,
      can_assign_crew: true,
      
      // Customers
      can_view_customers: true,
      can_create_customers: true,
      can_edit_customers: true,
      can_delete_customers: true,
      
      // Financials & Reports
      can_view_financials: true,
      can_view_profit_margins: true,
      can_view_commission_reports: true,
      can_export_reports: true,
      
      // Users & Settings
      can_view_users: true,
      can_create_users: true,
      can_edit_users: true,
      can_delete_users: true,
      can_manage_permissions: true,
      can_edit_company_settings: true,
      
      // Production
      can_upload_photos: true,
      can_update_project_status: true,
      can_view_project_timeline: true,
    }

    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        ...allPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to grant all permissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// REVOKE ALL PERMISSIONS
// =====================================================

export async function revokeAllPermissions(
  userId: string
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    // Set all permissions to false
    const noPermissions: UserPermissionsUpdate = {
      // Leads & Projects
      can_view_leads: false,
      can_create_leads: false,
      can_edit_leads: false,
      can_delete_leads: false,
      can_view_all_leads: false,
      
      // Quotes
      can_view_quotes: false,
      can_create_quotes: false,
      can_edit_quotes: false,
      can_delete_quotes: false,
      can_approve_quotes: false,
      can_send_quotes: false,
      
      // Invoices & Payments
      can_view_invoices: false,
      can_create_invoices: false,
      can_edit_invoices: false,
      can_delete_invoices: false,
      can_record_payments: false,
      can_void_payments: false,
      
      // Material Orders
      can_view_material_orders: false,
      can_create_material_orders: false,
      can_edit_material_orders: false,
      can_delete_material_orders: false,
      can_mark_orders_paid: false,
      
      // Work Orders
      can_view_work_orders: false,
      can_create_work_orders: false,
      can_edit_work_orders: false,
      can_delete_work_orders: false,
      can_assign_crew: false,
      
      // Customers
      can_view_customers: false,
      can_create_customers: false,
      can_edit_customers: false,
      can_delete_customers: false,
      
      // Financials & Reports
      can_view_financials: false,
      can_view_profit_margins: false,
      can_view_commission_reports: false,
      can_export_reports: false,
      
      // Users & Settings
      can_view_users: false,
      can_create_users: false,
      can_edit_users: false,
      can_delete_users: false,
      can_manage_permissions: false,
      can_edit_company_settings: false,
      
      // Production
      can_upload_photos: false,
      can_update_project_status: false,
      can_view_project_timeline: false,
    }

    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        ...noPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to revoke all permissions:', error)
    return createErrorResponse(error)
  }
}

// =====================================================
// CHECK PERMISSION (Helper for UI)
// =====================================================

export async function checkPermission(
  userId: string,
  permission: PermissionKey
): Promise<boolean> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(permission)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data?.[permission] === true
  } catch (error) {
    console.error('Failed to check permission:', error)
    return false
  }
}

// =====================================================
// CHECK MULTIPLE PERMISSIONS (Returns object with results)
// =====================================================

export async function checkPermissions(
  userId: string,
  permissions: PermissionKey[]
): Promise<Record<PermissionKey, boolean>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(permissions.join(','))
      .eq('user_id', userId)
      .single()

    if (error) throw error

    const results: Record<PermissionKey, boolean> = {} as Record<PermissionKey, boolean>
    permissions.forEach(perm => {
      results[perm] = data?.[perm] === true
    })
    return results
  } catch (error) {
    console.error('Failed to check permissions:', error)
    // Return all false on error
    const results: Record<PermissionKey, boolean> = {} as Record<PermissionKey, boolean>
    permissions.forEach(perm => {
      results[perm] = false
    })
    return results
  }
}

// =====================================================
// BULK UPDATE PERMISSIONS (Update multiple at once)
// =====================================================

export async function bulkUpdatePermissions(
  userId: string,
  permissions: Partial<Record<PermissionKey, boolean>>
): Promise<ApiResponse<UserPermissions>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .update({
        ...permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Failed to bulk update permissions:', error)
    return createErrorResponse(error)
  }
}
