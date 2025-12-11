// Permission Helper Utilities
import { UserPermissions, PermissionKey } from '@/lib/types/users'

/**
 * Check if user has a specific permission
 * @param permissions - User's permissions object
 * @param permission - Permission key to check
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(
  permissions: UserPermissions | null | undefined,
  permission: PermissionKey
): boolean {
  if (!permissions) return false
  return permissions[permission] === true
}

/**
 * Check if user has ALL of the specified permissions
 * @param permissions - User's permissions object
 * @param requiredPermissions - Array of permission keys to check
 * @returns true if user has all permissions, false otherwise
 */
export function hasAllPermissions(
  permissions: UserPermissions | null | undefined,
  requiredPermissions: PermissionKey[]
): boolean {
  if (!permissions) return false
  return requiredPermissions.every((perm) => permissions[perm] === true)
}

/**
 * Check if user has ANY of the specified permissions
 * @param permissions - User's permissions object
 * @param requiredPermissions - Array of permission keys to check
 * @returns true if user has at least one permission, false otherwise
 */
export function hasAnyPermission(
  permissions: UserPermissions | null | undefined,
  requiredPermissions: PermissionKey[]
): boolean {
  if (!permissions) return false
  return requiredPermissions.some((perm) => permissions[perm] === true)
}

/**
 * Get a list of permissions the user has
 * @param permissions - User's permissions object
 * @returns Array of permission keys user has
 */
export function getGrantedPermissions(
  permissions: UserPermissions | null | undefined
): PermissionKey[] {
  if (!permissions) return []
  
  return (Object.entries(permissions) as [string, boolean][])
    .filter(([key, value]) => 
      value === true && 
      key !== 'id' && 
      key !== 'user_id' && 
      key !== 'created_at' && 
      key !== 'updated_at'
    )
    .map(([key]) => key as PermissionKey)
}

/**
 * Get a list of permissions the user does NOT have
 * @param permissions - User's permissions object
 * @returns Array of permission keys user does not have
 */
export function getMissingPermissions(
  permissions: UserPermissions | null | undefined,
  allPermissions: PermissionKey[]
): PermissionKey[] {
  if (!permissions) return allPermissions
  
  return allPermissions.filter((perm) => permissions[perm] !== true)
}

/**
 * Count how many permissions user has
 * @param permissions - User's permissions object
 * @returns Number of enabled permissions
 */
export function countPermissions(
  permissions: UserPermissions | null | undefined
): number {
  return getGrantedPermissions(permissions).length
}

/**
 * Check if user has full access (all permissions)
 * @param permissions - User's permissions object
 * @param allPermissions - Array of all available permission keys
 * @returns true if user has all permissions
 */
export function hasFullAccess(
  permissions: UserPermissions | null | undefined,
  allPermissions: PermissionKey[]
): boolean {
  return hasAllPermissions(permissions, allPermissions)
}

/**
 * Check if user has no permissions
 * @param permissions - User's permissions object
 * @returns true if user has zero permissions
 */
export function hasNoPermissions(
  permissions: UserPermissions | null | undefined
): boolean {
  return countPermissions(permissions) === 0
}

/**
 * Permission check for CRUD operations
 * Returns an object with boolean flags for each CRUD action
 * @param permissions - User's permissions object
 * @param feature - Feature name (e.g., 'leads', 'quotes')
 * @returns Object with view, create, edit, delete flags
 */
export function getCrudPermissions(
  permissions: UserPermissions | null | undefined,
  feature: string
): {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
} {
  if (!permissions) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    }
  }

  return {
    canView: hasPermission(permissions, `can_view_${feature}` as PermissionKey),
    canCreate: hasPermission(permissions, `can_create_${feature}` as PermissionKey),
    canEdit: hasPermission(permissions, `can_edit_${feature}` as PermissionKey),
    canDelete: hasPermission(permissions, `can_delete_${feature}` as PermissionKey),
  }
}

/**
 * Check if user can perform basic read-only operations
 * @param permissions - User's permissions object
 * @param feature - Feature name
 * @returns true if user can view the feature
 */
export function canViewFeature(
  permissions: UserPermissions | null | undefined,
  feature: string
): boolean {
  return hasPermission(permissions, `can_view_${feature}` as PermissionKey)
}

/**
 * Check if user can perform any write operations on a feature
 * @param permissions - User's permissions object
 * @param feature - Feature name
 * @returns true if user can create, edit, or delete
 */
export function canModifyFeature(
  permissions: UserPermissions | null | undefined,
  feature: string
): boolean {
  return hasAnyPermission(permissions, [
    `can_create_${feature}` as PermissionKey,
    `can_edit_${feature}` as PermissionKey,
    `can_delete_${feature}` as PermissionKey,
  ])
}
