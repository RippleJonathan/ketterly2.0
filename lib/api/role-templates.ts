// Role Templates API Functions - DEPRECATED
// This file is kept for backwards compatibility but all functions return empty/error responses
// The role_permission_templates table has been removed in favor of company_roles
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  RoleTemplate,
  RoleTemplateInsert,
  RoleTemplateUpdate,
  UserPermissions,
} from '@/lib/types/users'

// =====================================================
// GET ROLE TEMPLATES - DEPRECATED
// =====================================================

export async function getRoleTemplates(
  companyId: string,
  includeInactive = false
): Promise<ApiResponse<RoleTemplate[]>> {
  // Return empty array - table no longer exists
  return { data: [], error: null, count: 0 }
}

// =====================================================
// ALL OTHER FUNCTIONS - DEPRECATED
// =====================================================

export async function getRoleTemplateById(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function createRoleTemplate(
  companyId: string,
  template: RoleTemplateInsert,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function updateRoleTemplate(
  templateId: string,
  companyId: string,
  updates: RoleTemplateUpdate
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function deleteRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<void>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function deactivateRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function reactivateRoleTemplate(
  templateId: string,
  companyId: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function applyRoleTemplate(
  userId: string,
  templateId: string
): Promise<ApiResponse<UserPermissions>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function applyRoleTemplateToMultiple(
  userIds: string[],
  templateId: string
): Promise<ApiResponse<number>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function createTemplateFromUser(
  companyId: string,
  userId: string,
  templateName: string,
  templateDescription: string | null,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}

export async function duplicateRoleTemplate(
  templateId: string,
  companyId: string,
  newName: string,
  createdBy?: string
): Promise<ApiResponse<RoleTemplate>> {
  return { data: null, error: { message: 'Role templates deprecated - use company_roles instead' } }
}


