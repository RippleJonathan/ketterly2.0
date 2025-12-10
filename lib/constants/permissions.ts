// Re-export permission constants from types
export { PERMISSION_CATEGORIES, type PermissionKey } from '@/lib/types/users'

// Import for compatibility checks
import { PERMISSION_LABELS as LABELS_FROM_TYPES } from '@/lib/types/users'

// Re-export the labels  
export const PERMISSION_LABELS = LABELS_FROM_TYPES

// Legacy exports for backward compatibility (kept for reference)
const PERMISSION_CATEGORIES_OLD: Record<string, string[]> = {
  'Leads & Projects': [
    'view_leads',
    'create_leads',
    'edit_leads',
    'delete_leads',
    'assign_leads',
  ],
  'Quotes': [
    'view_quotes',
    'create_quotes',
    'edit_quotes',
    'delete_quotes',
    'approve_quotes',
    'send_quotes',
  ],
  'Invoices & Payments': [
    'view_invoices',
    'create_invoices',
    'edit_invoices',
    'delete_invoices',
    'process_payments',
    'issue_refunds',
  ],
  'Material Orders': [
    'view_material_orders',
    'create_material_orders',
    'edit_material_orders',
    'delete_material_orders',
    'approve_material_orders',
  ],
  'Work Orders & Crew': [
    'view_work_orders',
    'create_work_orders',
    'assign_work_orders',
    'manage_crew',
    'manage_schedule',
  ],
  'Customers': [
    'view_customers',
    'edit_customers',
    'delete_customers',
    'export_customer_data',
  ],
  'Financials & Reports': [
    'view_financial_reports',
    'view_commission_reports',
    'export_financial_data',
    'manage_tax_settings',
  ],
  'Users & Settings': [
    'view_users',
    'create_users',
    'edit_users',
    'delete_users',
    'manage_permissions',
    'manage_company_settings',
  ],
  'Production': [
    'view_production',
    'update_production',
    'approve_production',
  ],
}
