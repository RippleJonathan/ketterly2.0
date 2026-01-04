require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPermissionColumns() {
  console.log('🔍 Checking permission columns in user_permissions table...\n')

  // Query the table schema
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error querying table:', error)
    return
  }

  // Get column names from the result
  const columns = data && data[0] ? Object.keys(data[0]) : []
  
  console.log(`Found ${columns.length} columns in user_permissions:\n`)
  
  // All permissions that should exist (from the trigger)
  const expectedPermissions = [
    // Core permissions
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
    'can_manage_commissions',
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
    'can_view_calendar',
    'can_create_consultations',
    'can_create_production_events',
    'can_edit_all_events',
    'can_manage_recurring_events',
    // Tab permissions
    'can_view_lead_details',
    'can_view_lead_checklist',
    'can_view_lead_measurements',
    'can_view_lead_estimates',
    'can_view_lead_orders',
    'can_view_lead_photos',
    'can_view_lead_notes',
    'can_view_lead_documents',
    'can_view_lead_payments',
    'can_view_lead_financials',
    'can_view_lead_commissions'
  ]

  const missingPermissions = expectedPermissions.filter(perm => !columns.includes(perm))
  const existingPermissions = expectedPermissions.filter(perm => columns.includes(perm))

  console.log(`✅ Existing permissions (${existingPermissions.length}):\n`)
  existingPermissions.forEach(perm => console.log(`  - ${perm}`))

  console.log(`\n❌ Missing permissions (${missingPermissions.length}):\n`)
  missingPermissions.forEach(perm => console.log(`  - ${perm}`))

  console.log(`\n📊 Summary:`)
  console.log(`  Total expected: ${expectedPermissions.length}`)
  console.log(`  Existing: ${existingPermissions.length}`)
  console.log(`  Missing: ${missingPermissions.length}`)
  
  if (missingPermissions.length > 0) {
    console.log('\n💡 You need to add these missing columns to user_permissions table!')
  } else {
    console.log('\n🎉 All permission columns exist!')
  }
}

checkPermissionColumns()
