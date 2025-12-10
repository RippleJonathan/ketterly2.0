// User Management & Permissions Types

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'user'

export type CommissionType = 
  | 'percentage'      // % of job total
  | 'flat_per_job'    // Fixed amount per completed job
  | 'tiered'          // Different % based on volume
  | 'hourly_plus'     // Hourly wage + commission
  | 'salary_plus'     // Salary + commission

export type CalculateOn = 'revenue' | 'profit' | 'collected'
export type PaidWhen = 'signed' | 'deposit' | 'completed' | 'collected'
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'held' | 'voided'

// =====================================================
// USERS
// =====================================================

export interface User {
  id: string
  company_id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  
  // Commission & Pay
  commission_plan_id: string | null
  hire_date: string | null
  
  // Personal
  date_of_birth: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  bio: string | null
  
  // Professional
  specialties: string[] | null
  certifications: string[] | null
  assigned_territories: string[] | null
  
  // Crew fields (from production system)
  crew_role: 'foreman' | 'laborer' | 'none' | null
  foreman_id: string | null
  
  // Metadata
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations (optional)
  commission_plan?: CommissionPlan | null
  permissions?: UserPermissions
  foreman?: User
}

export interface UserInsert {
  id: string // From auth.users
  company_id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string | null
  avatar_url?: string | null
  commission_plan_id?: string | null
  hire_date?: string | null
  date_of_birth?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  bio?: string | null
  specialties?: string[] | null
  certifications?: string[] | null
  assigned_territories?: string[] | null
  crew_role?: 'foreman' | 'laborer' | 'none' | null
  foreman_id?: string | null
}

export interface UserUpdate {
  full_name?: string
  role?: UserRole
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  commission_plan_id?: string | null
  hire_date?: string | null
  date_of_birth?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  bio?: string | null
  specialties?: string[] | null
  certifications?: string[] | null
  assigned_territories?: string[] | null
  crew_role?: 'foreman' | 'laborer' | 'none' | null
  foreman_id?: string | null
}

export interface UserWithRelations extends Omit<User, 'commission_plan' | 'permissions' | 'foreman'> {
  commission_plan: CommissionPlan | null
  permissions: UserPermissions | null
  foreman: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface UserFilters {
  role?: UserRole
  is_active?: boolean
  crew_role?: 'foreman' | 'laborer' | 'none'
  has_commission_plan?: boolean
  search?: string // Search by name, email, phone
}

// =====================================================
// COMMISSION PLANS
// =====================================================

export interface TierStructure {
  min: number
  max: number | null
  rate: number
}

export interface CommissionPlan {
  id: string
  company_id: string
  name: string
  plan_name?: string // Alias for name
  description: string | null
  is_active: boolean
  
  // Commission structure
  commission_type: CommissionType
  commission_rate: number | null // For percentage type
  percentage_rate?: number | null // Alias for commission_rate
  flat_amount: number | null // For flat_per_job type
  tier_structure: TierStructure[] | null // For tiered type
  tiers?: TierStructure[] | null // Alias for tier_structure
  
  // Base compensation
  hourly_rate: number | null
  salary_amount: number | null
  
  // Calculation settings
  calculate_on: CalculateOn
  paid_when: PaidWhen
  
  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CommissionPlanInsert {
  company_id: string
  name: string
  description?: string | null
  is_active?: boolean
  commission_type: CommissionType
  commission_rate?: number | null
  flat_amount?: number | null
  tier_structure?: TierStructure[] | null
  hourly_rate?: number | null
  salary_amount?: number | null
  calculate_on?: CalculateOn
  paid_when?: PaidWhen
  created_by?: string | null
}

export interface CommissionPlanUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
  commission_type?: CommissionType
  commission_rate?: number | null
  flat_amount?: number | null
  tier_structure?: TierStructure[] | null
  hourly_rate?: number | null
  salary_amount?: number | null
  calculate_on?: CalculateOn
  paid_when?: PaidWhen
}

// =====================================================
// PERMISSIONS
// =====================================================

export interface UserPermissions {
  id: string
  user_id: string
  
  // Leads & Projects
  can_view_leads: boolean
  can_create_leads: boolean
  can_edit_leads: boolean
  can_delete_leads: boolean
  can_view_all_leads: boolean
  
  // Quotes
  can_view_quotes: boolean
  can_create_quotes: boolean
  can_edit_quotes: boolean
  can_delete_quotes: boolean
  can_approve_quotes: boolean
  can_send_quotes: boolean
  
  // Invoices & Payments
  can_view_invoices: boolean
  can_create_invoices: boolean
  can_edit_invoices: boolean
  can_delete_invoices: boolean
  can_record_payments: boolean
  can_void_payments: boolean
  
  // Material Orders
  can_view_material_orders: boolean
  can_create_material_orders: boolean
  can_edit_material_orders: boolean
  can_delete_material_orders: boolean
  can_mark_orders_paid: boolean
  
  // Work Orders
  can_view_work_orders: boolean
  can_create_work_orders: boolean
  can_edit_work_orders: boolean
  can_delete_work_orders: boolean
  can_assign_crew: boolean
  
  // Customers
  can_view_customers: boolean
  can_create_customers: boolean
  can_edit_customers: boolean
  can_delete_customers: boolean
  
  // Financials & Reports
  can_view_financials: boolean
  can_view_profit_margins: boolean
  can_view_commission_reports: boolean
  can_export_reports: boolean
  
  // Users & Settings
  can_view_users: boolean
  can_create_users: boolean
  can_edit_users: boolean
  can_delete_users: boolean
  can_manage_permissions: boolean
  can_edit_company_settings: boolean
  
  // Production
  can_upload_photos: boolean
  can_update_project_status: boolean
  can_view_project_timeline: boolean
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface UserPermissionsUpdate {
  // Leads & Projects
  can_view_leads?: boolean
  can_create_leads?: boolean
  can_edit_leads?: boolean
  can_delete_leads?: boolean
  can_view_all_leads?: boolean
  
  // Quotes
  can_view_quotes?: boolean
  can_create_quotes?: boolean
  can_edit_quotes?: boolean
  can_delete_quotes?: boolean
  can_approve_quotes?: boolean
  can_send_quotes?: boolean
  
  // Invoices & Payments
  can_view_invoices?: boolean
  can_create_invoices?: boolean
  can_edit_invoices?: boolean
  can_delete_invoices?: boolean
  can_record_payments?: boolean
  can_void_payments?: boolean
  
  // Material Orders
  can_view_material_orders?: boolean
  can_create_material_orders?: boolean
  can_edit_material_orders?: boolean
  can_delete_material_orders?: boolean
  can_mark_orders_paid?: boolean
  
  // Work Orders
  can_view_work_orders?: boolean
  can_create_work_orders?: boolean
  can_edit_work_orders?: boolean
  can_delete_work_orders?: boolean
  can_assign_crew?: boolean
  
  // Customers
  can_view_customers?: boolean
  can_create_customers?: boolean
  can_edit_customers?: boolean
  can_delete_customers?: boolean
  
  // Financials & Reports
  can_view_financials?: boolean
  can_view_profit_margins?: boolean
  can_view_commission_reports?: boolean
  can_export_reports?: boolean
  
  // Users & Settings
  can_view_users?: boolean
  can_create_users?: boolean
  can_edit_users?: boolean
  can_delete_users?: boolean
  can_manage_permissions?: boolean
  can_edit_company_settings?: boolean
  
  // Production
  can_upload_photos?: boolean
  can_update_project_status?: boolean
  can_view_project_timeline?: boolean
}

// Helper to convert permissions object to array of permission names
export type PermissionKey = keyof Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export const ALL_PERMISSIONS: PermissionKey[] = [
  'can_view_leads',
  'can_create_leads',
  'can_edit_leads',
  'can_delete_leads',
  'can_view_all_leads',
  'can_view_quotes',
  'can_create_quotes',
  'can_edit_quotes',
  'can_delete_quotes',
  'can_approve_quotes',
  'can_send_quotes',
  'can_view_invoices',
  'can_create_invoices',
  'can_edit_invoices',
  'can_delete_invoices',
  'can_record_payments',
  'can_void_payments',
  'can_view_material_orders',
  'can_create_material_orders',
  'can_edit_material_orders',
  'can_delete_material_orders',
  'can_mark_orders_paid',
  'can_view_work_orders',
  'can_create_work_orders',
  'can_edit_work_orders',
  'can_delete_work_orders',
  'can_assign_crew',
  'can_view_customers',
  'can_create_customers',
  'can_edit_customers',
  'can_delete_customers',
  'can_view_financials',
  'can_view_profit_margins',
  'can_view_commission_reports',
  'can_export_reports',
  'can_view_users',
  'can_create_users',
  'can_edit_users',
  'can_delete_users',
  'can_manage_permissions',
  'can_edit_company_settings',
  'can_upload_photos',
  'can_update_project_status',
  'can_view_project_timeline',
]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view_leads: 'View Leads',
  can_create_leads: 'Create Leads',
  can_edit_leads: 'Edit Leads',
  can_delete_leads: 'Delete Leads',
  can_view_all_leads: 'View All Leads (not just assigned)',
  can_view_quotes: 'View Quotes',
  can_create_quotes: 'Create Quotes',
  can_edit_quotes: 'Edit Quotes',
  can_delete_quotes: 'Delete Quotes',
  can_approve_quotes: 'Approve Quotes',
  can_send_quotes: 'Send Quotes to Customers',
  can_view_invoices: 'View Invoices',
  can_create_invoices: 'Create Invoices',
  can_edit_invoices: 'Edit Invoices',
  can_delete_invoices: 'Delete Invoices',
  can_record_payments: 'Record Payments',
  can_void_payments: 'Void Payments',
  can_view_material_orders: 'View Material Orders',
  can_create_material_orders: 'Create Material Orders',
  can_edit_material_orders: 'Edit Material Orders',
  can_delete_material_orders: 'Delete Material Orders',
  can_mark_orders_paid: 'Mark Orders as Paid',
  can_view_work_orders: 'View Work Orders',
  can_create_work_orders: 'Create Work Orders',
  can_edit_work_orders: 'Edit Work Orders',
  can_delete_work_orders: 'Delete Work Orders',
  can_assign_crew: 'Assign Crew to Projects',
  can_view_customers: 'View Customers',
  can_create_customers: 'Create Customers',
  can_edit_customers: 'Edit Customers',
  can_delete_customers: 'Delete Customers',
  can_view_financials: 'View Financials & Profitability',
  can_view_profit_margins: 'View Profit Margins',
  can_view_commission_reports: 'View Commission Reports',
  can_export_reports: 'Export Reports',
  can_view_users: 'View Users',
  can_create_users: 'Create Users',
  can_edit_users: 'Edit Users',
  can_delete_users: 'Delete Users',
  can_manage_permissions: 'Manage User Permissions',
  can_edit_company_settings: 'Edit Company Settings',
  can_upload_photos: 'Upload Project Photos',
  can_update_project_status: 'Update Project Status',
  can_view_project_timeline: 'View Project Timeline',
}

// Group permissions by category for UI
export const PERMISSION_CATEGORIES = {
  'Leads & Projects': [
    'can_view_leads',
    'can_create_leads',
    'can_edit_leads',
    'can_delete_leads',
    'can_view_all_leads',
  ],
  'Quotes': [
    'can_view_quotes',
    'can_create_quotes',
    'can_edit_quotes',
    'can_delete_quotes',
    'can_approve_quotes',
    'can_send_quotes',
  ],
  'Invoices & Payments': [
    'can_view_invoices',
    'can_create_invoices',
    'can_edit_invoices',
    'can_delete_invoices',
    'can_record_payments',
    'can_void_payments',
  ],
  'Material Orders': [
    'can_view_material_orders',
    'can_create_material_orders',
    'can_edit_material_orders',
    'can_delete_material_orders',
    'can_mark_orders_paid',
  ],
  'Work Orders & Crew': [
    'can_view_work_orders',
    'can_create_work_orders',
    'can_edit_work_orders',
    'can_delete_work_orders',
    'can_assign_crew',
  ],
  'Customers': [
    'can_view_customers',
    'can_create_customers',
    'can_edit_customers',
    'can_delete_customers',
  ],
  'Financials & Reports': [
    'can_view_financials',
    'can_view_profit_margins',
    'can_view_commission_reports',
    'can_export_reports',
  ],
  'Users & Settings': [
    'can_view_users',
    'can_create_users',
    'can_edit_users',
    'can_delete_users',
    'can_manage_permissions',
    'can_edit_company_settings',
  ],
  'Production': [
    'can_upload_photos',
    'can_update_project_status',
    'can_view_project_timeline',
  ],
} as const

// =====================================================
// ROLE TEMPLATES
// =====================================================

export interface RoleTemplate {
  id: string
  company_id: string
  name: string
  template_name?: string // Alias for name
  description: string | null
  base_role: UserRole
  default_permissions: Partial<UserPermissions>
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface RoleTemplateInsert {
  company_id: string
  name: string
  description?: string | null
  base_role: UserRole
  default_permissions: Partial<UserPermissions>
  is_active?: boolean
  created_by?: string | null
}

export interface RoleTemplateUpdate {
  name?: string
  description?: string | null
  base_role?: UserRole
  default_permissions?: Partial<UserPermissions>
  is_active?: boolean
}

// =====================================================
// COMMISSIONS
// =====================================================

export interface UserCommission {
  id: string
  company_id: string
  user_id: string
  lead_id: string
  commission_plan_id: string | null
  
  calculated_amount: number
  paid_amount: number
  
  job_revenue: number | null
  job_profit: number | null
  job_collected: number | null
  
  status: CommissionStatus
  paid_date: string | null
  notes: string | null
  
  created_at: string
  updated_at: string
  
  // Relations
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  lead?: {
    id: string
    lead_number: string
    full_name: string
    address: string
  }
  commission_plan?: CommissionPlan
}

export interface UserCommissionInsert {
  company_id: string
  user_id: string
  lead_id: string
  commission_plan_id?: string | null
  calculated_amount: number
  paid_amount?: number
  job_revenue?: number | null
  job_profit?: number | null
  job_collected?: number | null
  status?: CommissionStatus
  paid_date?: string | null
  notes?: string | null
}

export interface UserCommissionUpdate {
  calculated_amount?: number
  paid_amount?: number
  status?: CommissionStatus
  paid_date?: string | null
  notes?: string | null
}

// =====================================================
// API TYPES
// =====================================================

export interface UserFormData {
  email: string
  full_name: string
  password: string
  role: UserRole
  phone?: string
  commission_plan_id?: string
  hire_date?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  bio?: string
  specialties?: string[]
  certifications?: string[]
  assigned_territories?: string[]
  crew_role?: 'foreman' | 'laborer' | 'none'
  foreman_id?: string
  
  // Apply permissions from template?
  role_template_id?: string
}

export interface InviteUserData {
  email: string
  full_name: string
  role: UserRole
  role_template_id?: string
  commission_plan_id?: string
  send_invite_email?: boolean
}
