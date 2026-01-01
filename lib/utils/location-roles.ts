/**
 * Utility functions for mapping company roles to location roles
 * Simplifies the two-role system by auto-deriving location role from company role
 */

import { UserRole } from '@/lib/types/users'

export type LocationRole = 'location_admin' | 'manager' | 'member'

/**
 * Automatically determine location role based on company role
 * 
 * Mapping:
 * - office → location_admin (full location management)
 * - sales_manager, production → manager (team lead)
 * - sales, marketing → member (regular employee)
 * - admin/super_admin → not used (they bypass location restrictions)
 */
export function getLocationRoleFromCompanyRole(companyRole: UserRole): LocationRole {
  switch (companyRole) {
    case 'office':
      return 'location_admin'
    
    case 'sales_manager':
    case 'production':
      return 'manager'
    
    case 'sales':
    case 'marketing':
    case 'admin':
    case 'super_admin':
    default:
      return 'member'
  }
}

/**
 * Get human-readable description of what a company role can do at a location
 */
export function getLocationRoleDescription(companyRole: UserRole): string {
  const locationRole = getLocationRoleFromCompanyRole(companyRole)
  
  switch (locationRole) {
    case 'location_admin':
      return 'Full location management (create users, manage team, settings)'
    case 'manager':
      return 'Team lead (coordinate work, no admin access)'
    case 'member':
      return 'Regular employee (work leads, quotes, projects)'
  }
}
