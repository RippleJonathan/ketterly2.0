// User Management & Permissions Types

export type UserRole = 
  | 'super_admin'      // Ketterly platform admin only
  | 'admin'            // Company owner/administrator - full access
  | 'office'           // Office staff - quotes, invoices, customers, scheduling
  | 'sales_manager'    // Sales team lead - manage sales team & leads
  | 'sales'            // Sales rep - leads, quotes, customer-facing
  | 'production'       // Production/crew - work orders, photos, status updates
  | 'marketing'        // Marketing team - leads, analytics, reports

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
  role: UserRole // Deprecated - use company_role_id
  company_role_id: string | null // References company_roles.id
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
  company_role?: CompanyRole | null
}

export interface UserInsert {
  id: string // From auth.users
  company_id: string
  email: string
  full_name: string
  role: UserRole // Deprecated - use company_role_id
  company_role_id?: string | null
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
  role?: UserRole // Deprecated - use company_role_id
  company_role_id?: string | null
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

export interface UserWithRelations extends Omit<User, 'commission_plan' | 'permissions' | 'foreman' | 'company_role'> {
  commission_plan: CommissionPlan | null
  permissions: UserPermissions | null
  foreman: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null
  company_role: CompanyRole | null
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
  
  // Commissions
  can_view_own_commissions: boolean
  can_view_all_commissions: boolean
  can_create_commissions: boolean
  can_edit_commissions: boolean
  can_delete_commissions: boolean
  can_mark_commissions_paid: boolean
  
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
  
  // Commissions
  can_view_own_commissions?: boolean
  can_view_all_commissions?: boolean
  can_create_commissions?: boolean
  can_edit_commissions?: boolean
  can_delete_commissions?: boolean
  can_mark_commissions_paid?: boolean
  
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
  'can_view_own_commissions',
  'can_view_all_commissions',
  'can_create_commissions',
  'can_edit_commissions',
  'can_delete_commissions',
  'can_mark_commissions_paid',
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
  can_view_own_commissions: 'View Own Commissions',
  can_view_all_commissions: 'View All Commissions',
  can_create_commissions: 'Create Commissions',
  can_edit_commissions: 'Edit Commissions',
  can_delete_commissions: 'Delete Commissions',
  can_mark_commissions_paid: 'Mark Commissions as Paid',
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
  'Commissions': [
    'can_view_own_commissions',
    'can_view_all_commissions',
    'can_create_commissions',
    'can_edit_commissions',
    'can_delete_commissions',
    'can_mark_commissions_paid',
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
// DEFAULT ROLE PERMISSIONS
// =====================================================

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Partial<Record<PermissionKey, boolean>>> = {
  // Super Admin - Ketterly platform access only (not selectable by companies)
  super_admin: {
    // All permissions = true (handled by RLS, not permission checks)
  },

  // Admin - Company Owner/Administrator (Full Access)
  admin: {
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
    // Work Orders & Crew
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
    // Commissions
    can_view_commissions: true,
    can_manage_commissions: true,
    can_mark_commissions_paid: true,
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
  },

  // Office - Office Staff (Quotes, Invoices, Customers, Scheduling)
  office: {
    // Leads & Projects
    can_view_leads: true,
    can_create_leads: true,
    can_edit_leads: true,
    can_delete_leads: false,
    can_view_all_leads: true,
    // Quotes
    can_view_quotes: true,
    can_create_quotes: true,
    can_edit_quotes: true,
    can_delete_quotes: false,
    can_approve_quotes: false,  // Only admin/sales_manager
    can_send_quotes: true,
    // Invoices & Payments
    can_view_invoices: true,
    can_create_invoices: true,
    can_edit_invoices: true,
    can_delete_invoices: false,
    can_record_payments: true,
    can_void_payments: false,   // Only admin
    // Material Orders
    can_view_material_orders: true,
    can_create_material_orders: true,
    can_edit_material_orders: true,
    can_delete_material_orders: false,
    can_mark_orders_paid: false,  // Only admin
    // Work Orders & Crew
    can_view_work_orders: true,
    can_create_work_orders: true,
    can_edit_work_orders: true,
    can_delete_work_orders: false,
    can_assign_crew: true,
    // Customers
    can_view_customers: true,
    can_create_customers: true,
    can_edit_customers: true,
    can_delete_customers: false,
    // Financials & Reports
    can_view_financials: false,
    can_view_profit_margins: false,
    can_view_commission_reports: false,
    can_export_reports: true,
    // Commissions
    can_view_commissions: true,
    can_manage_commissions: true,
    can_mark_commissions_paid: true,
    // Users & Settings
    can_view_users: true,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_manage_permissions: false,
    can_edit_company_settings: false,
    // Production
    can_upload_photos: false,
    can_update_project_status: true,
    can_view_project_timeline: true,
  },

  // Sales Manager - Sales Team Lead (Manage Sales Team & Leads)
  sales_manager: {
    // Leads & Projects
    can_view_leads: true,
    can_create_leads: true,
    can_edit_leads: true,
    can_delete_leads: true,
    can_view_all_leads: true,     // Can see all team leads
    // Quotes
    can_view_quotes: true,
    can_create_quotes: true,
    can_edit_quotes: true,
    can_delete_quotes: true,
    can_approve_quotes: true,     // Can approve team quotes
    can_send_quotes: true,
    // Invoices & Payments
    can_view_invoices: true,
    can_create_invoices: false,
    can_edit_invoices: false,
    can_delete_invoices: false,
    can_record_payments: false,
    can_void_payments: false,
    // Material Orders
    can_view_material_orders: true,
    can_create_material_orders: false,
    can_edit_material_orders: false,
    can_delete_material_orders: false,
    can_mark_orders_paid: false,
    // Work Orders & Crew
    can_view_work_orders: true,
    can_create_work_orders: false,
    can_edit_work_orders: false,
    can_delete_work_orders: false,
    can_assign_crew: false,
    // Customers
    can_view_customers: true,
    can_create_customers: true,
    can_edit_customers: true,
    can_delete_customers: false,
    // Financials & Reports
    can_view_financials: true,
    can_view_profit_margins: true,
    can_view_commission_reports: true,  // Can see team commissions
    can_export_reports: true,
    // Commissions
    can_view_commissions: true,
    can_manage_commissions: true,
    can_mark_commissions_paid: false,
    // Users & Settings
    can_view_users: true,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_manage_permissions: false,
    can_edit_company_settings: false,
    // Production
    can_upload_photos: false,
    can_update_project_status: false,
    can_view_project_timeline: true,
  },

  // Sales - Sales Representative (Leads, Quotes, Customer-Facing)
  sales: {
    // Leads & Projects
    can_view_leads: true,
    can_create_leads: true,
    can_edit_leads: true,
    can_delete_leads: false,
    can_view_all_leads: false,    // Only see assigned leads
    // Quotes
    can_view_quotes: true,
    can_create_quotes: true,
    can_edit_quotes: true,
    can_delete_quotes: false,
    can_approve_quotes: false,    // Needs manager approval
    can_send_quotes: true,
    // Invoices & Payments
    can_view_invoices: true,
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
    // Work Orders & Crew
    can_view_work_orders: false,
    can_create_work_orders: false,
    can_edit_work_orders: false,
    can_delete_work_orders: false,
    can_assign_crew: false,
    // Customers
    can_view_customers: true,
    can_create_customers: true,
    can_edit_customers: true,
    can_delete_customers: false,
    // Financials & Reports
    can_view_financials: false,
    can_view_profit_margins: false,
    can_view_commission_reports: true,  // Can see own commissions
    can_export_reports: true,
    // Users & Settings
    can_view_users: true,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_manage_permissions: false,
    can_edit_company_settings: false,
    // Production
    can_upload_photos: false,
    can_update_project_status: false,
    can_view_project_timeline: true,
  },

  // Production - Production/Crew (Work Orders, Photos, Status Updates)
  production: {
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
    can_view_material_orders: true,   // Need to see what materials are coming
    can_create_material_orders: false,
    can_edit_material_orders: false,
    can_delete_material_orders: false,
    can_mark_orders_paid: false,
    // Work Orders & Crew
    can_view_work_orders: true,       // See assigned work orders
    can_create_work_orders: false,
    can_edit_work_orders: true,       // Update work order details
    can_delete_work_orders: false,
    can_assign_crew: false,
    // Customers
    can_view_customers: true,         // See customer info for jobs
    can_create_customers: false,
    can_edit_customers: false,
    can_delete_customers: false,
    // Financials & Reports
    can_view_financials: false,
    can_view_profit_margins: false,
    can_view_commission_reports: false,
    can_export_reports: false,
    // Commissions
    can_view_commissions: false,
    can_manage_commissions: false,
    can_mark_commissions_paid: false,
    // Commissions
    can_view_commissions: true,          // View own commissions
    can_manage_commissions: false,
    can_mark_commissions_paid: false,
    // Users & Settings
    can_view_users: true,             // See crew members
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_manage_permissions: false,
    can_edit_company_settings: false,
    // Production
    can_upload_photos: true,          // Upload project photos
    can_update_project_status: true,  // Update project progress
    can_view_project_timeline: true,  // See project schedule
  },

  // Marketing - Marketing Team (Leads, Analytics, Reports)
  marketing: {
    // Leads & Projects
    can_view_leads: true,
    can_create_leads: true,           // Create leads from campaigns
    can_edit_leads: true,
    can_delete_leads: false,
    can_view_all_leads: true,         // See all leads for analytics
    // Quotes
    can_view_quotes: true,            // Track conversion rates
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
    // Work Orders & Crew
    can_view_work_orders: false,
    can_create_work_orders: false,
    can_edit_work_orders: false,
    can_delete_work_orders: false,
    can_assign_crew: false,
    // Customers
    can_view_customers: true,         // Customer demographics/analytics
    can_create_customers: true,
    can_edit_customers: false,
    can_delete_customers: false,
    // Financials & Reports
    can_view_financials: true,        // Marketing ROI metrics
    can_view_profit_margins: false,
    can_view_commission_reports: false,
    can_export_reports: true,         // Export analytics
    // Commissions
    can_view_commissions: false,
    can_manage_commissions: false,
    can_mark_commissions_paid: false,
    // Users & Settings
    can_view_users: true,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false,
    can_manage_permissions: false,
    can_edit_company_settings: false,
    // Production
    can_upload_photos: false,
    can_update_project_status: false,
    can_view_project_timeline: false,
  },
}

// Helper function to get role display name
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  office: 'Office Staff',
  sales_manager: 'Sales Manager',
  sales: 'Sales Rep',
  production: 'Production/Crew',
  marketing: 'Marketing',
}

// Helper function to get role description
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Ketterly platform administrator (not selectable)',
  admin: 'Company owner/administrator with full access to all features',
  office: 'Office staff managing quotes, invoices, customers, and scheduling',
  sales_manager: 'Sales team lead managing sales reps and overseeing all leads',
  sales: 'Sales representative managing assigned leads and creating quotes',
  production: 'Production crew members updating work orders and project status',
  marketing: 'Marketing team creating campaigns and analyzing lead performance',
}

// =====================================================
// COMPANY ROLES (Custom Role System)
// =====================================================

export interface CompanyRole {
  id: string
  company_id: string
  role_name: string // Unique snake_case identifier (e.g., 'project_manager')
  display_name: string // User-friendly name (e.g., 'Project Manager')
  description: string | null
  permissions: Partial<UserPermissions> // JSONB column with all permissions
  is_system_role: boolean // True for default roles (cannot be deleted)
  is_active: boolean
  user_count: number // Cached count via trigger
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CompanyRoleInsert {
  company_id: string
  role_name: string
  display_name: string
  description?: string | null
  permissions: Partial<UserPermissions>
  is_system_role?: boolean
  is_active?: boolean
  created_by?: string | null
}

export interface CompanyRoleUpdate {
  display_name?: string
  description?: string | null
  permissions?: Partial<UserPermissions>
  is_active?: boolean
}

export interface CompanyRoleWithUserCount extends CompanyRole {
  user_count: number
}

export interface CompanyRoleFilters {
  is_system_role?: boolean
  is_active?: boolean
  search?: string // Search by display_name or description
}

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
