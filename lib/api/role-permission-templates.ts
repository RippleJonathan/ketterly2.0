/**
 * API Functions for Role Permission Templates
 * 
 * This module provides functions to fetch and update role permission templates.
 * Role templates define the default permissions for each role within a company.
 */

import { createClient } from '@/lib/supabase/client'
import { UserRole, PermissionKey } from '@/lib/types/users'
import { ApiResponse } from '@/lib/types/api'

// =====================================================
// TYPES
// =====================================================

export interface RolePermissionTemplate {
  id: string
  company_id: string
  role: UserRole
  
  // All 44 permissions
  can_view_leads: boolean
  can_create_leads: boolean
  can_edit_leads: boolean
  can_delete_leads: boolean
  can_view_all_leads: boolean
  
  can_view_quotes: boolean
  can_create_quotes: boolean
  can_edit_quotes: boolean
  can_delete_quotes: boolean
  can_approve_quotes: boolean
  can_send_quotes: boolean
  
  can_view_invoices: boolean
  can_create_invoices: boolean
  can_edit_invoices: boolean
  can_delete_invoices: boolean
  can_record_payments: boolean
  can_void_payments: boolean
  
  can_view_material_orders: boolean
  can_create_material_orders: boolean
  can_edit_material_orders: boolean
  can_delete_material_orders: boolean
  can_mark_orders_paid: boolean
  
  can_view_work_orders: boolean
  can_create_work_orders: boolean
  can_edit_work_orders: boolean
  can_delete_work_orders: boolean
  can_assign_crew: boolean
  
  can_view_customers: boolean
  can_create_customers: boolean
  can_edit_customers: boolean
  can_delete_customers: boolean
  
  can_view_financials: boolean
  can_view_profit_margins: boolean
  can_view_commission_reports: boolean
  can_export_reports: boolean
  
  can_view_users: boolean
  can_create_users: boolean
  can_edit_users: boolean
  can_delete_users: boolean
  can_manage_permissions: boolean
  can_edit_company_settings: boolean
  
  can_upload_photos: boolean
  can_update_project_status: boolean
  can_view_project_timeline: boolean
  
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RolePermissions = Omit<
  RolePermissionTemplate, 
  'id' | 'company_id' | 'role' | 'created_at' | 'updated_at' | 'deleted_at'
>

// =====================================================
// API FUNCTIONS
// =====================================================

/**
 * Fetch all role templates for a company
 */
export async function getRolePermissionTemplates(
  companyId: string
): Promise<ApiResponse<RolePermissionTemplate[]>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('role', { ascending: true })

    if (error) throw error

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Failed to fetch role templates:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch role templates')
    }
  }
}

/**
 * Fetch a single role template by role
 */
export async function getRolePermissionTemplate(
  companyId: string,
  role: UserRole
): Promise<ApiResponse<RolePermissionTemplate>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('role', role)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error(`Failed to fetch ${role} role template:`, error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch role template')
    }
  }
}

/**
 * Update permissions for a role template
 */
export async function updateRolePermissionTemplate(
  companyId: string,
  role: UserRole,
  permissions: Partial<RolePermissions>
): Promise<ApiResponse<RolePermissionTemplate>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('role_permission_templates')
      .update(permissions)
      .eq('company_id', companyId)
      .eq('role', role)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error(`Failed to update ${role} role template:`, error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to update role template')
    }
  }
}

/**
 * Create default role templates for a new company
 * This is called during company signup/onboarding
 */
export async function createDefaultRolePermissionTemplates(
  companyId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    // Call the database function to seed templates
    const { error } = await supabase.rpc('seed_role_permission_templates', {
      p_company_id: companyId
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    console.error('Failed to create default role templates:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to create default role templates')
    }
  }
}

/**
 * Get permissions for a specific role (used when creating new users)
 */
export async function getRolePermissions(
  companyId: string,
  role: UserRole
): Promise<ApiResponse<RolePermissions>> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('role_permission_templates')
      .select(`
        can_view_leads, can_create_leads, can_edit_leads, can_delete_leads, can_view_all_leads,
        can_view_quotes, can_create_quotes, can_edit_quotes, can_delete_quotes, can_approve_quotes, can_send_quotes,
        can_view_invoices, can_create_invoices, can_edit_invoices, can_delete_invoices, can_record_payments, can_void_payments,
        can_view_material_orders, can_create_material_orders, can_edit_material_orders, can_delete_material_orders, can_mark_orders_paid,
        can_view_work_orders, can_create_work_orders, can_edit_work_orders, can_delete_work_orders, can_assign_crew,
        can_view_customers, can_create_customers, can_edit_customers, can_delete_customers,
        can_view_financials, can_view_profit_margins, can_view_commission_reports, can_export_reports,
        can_view_users, can_create_users, can_edit_users, can_delete_users, can_manage_permissions, can_edit_company_settings,
        can_upload_photos, can_update_project_status, can_view_project_timeline
      `)
      .eq('company_id', companyId)
      .eq('role', role)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    return { data: data as RolePermissions, error: null }
  } catch (error) {
    console.error(`Failed to fetch permissions for ${role}:`, error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to fetch role permissions')
    }
  }
}

/**
 * Reset a role template to default permissions
 */
export async function resetRolePermissionTemplate(
  companyId: string,
  role: UserRole
): Promise<ApiResponse<RolePermissionTemplate>> {
  try {
    const supabase = createClient()
    
    // Delete the existing template
    await supabase
      .from('role_permission_templates')
      .delete()
      .eq('company_id', companyId)
      .eq('role', role)

    // Re-seed just this role
    const { error: seedError } = await supabase.rpc('seed_role_permission_templates', {
      p_company_id: companyId
    })

    if (seedError) throw seedError

    // Fetch the newly created template
    const { data, error } = await supabase
      .from('role_permission_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('role', role)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error(`Failed to reset ${role} role template:`, error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to reset role template')
    }
  }
}
