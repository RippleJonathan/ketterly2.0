/**
 * Add missing commission permission columns
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function addPermissionColumns() {
  console.log('🔧 Adding missing commission permission columns...\n')
  
  try {
    // Add columns
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.user_permissions 
        ADD COLUMN IF NOT EXISTS can_approve_commissions BOOLEAN DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS can_view_all_commissions BOOLEAN DEFAULT false NOT NULL;
      `
    })
    
    if (alterError) {
      console.error('❌ Error adding columns:', alterError.message)
      return
    }
    
    console.log('✅ Columns added successfully')
    
    // Grant to admin/office users
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE public.user_permissions 
        SET 
          can_approve_commissions = true,
          can_view_all_commissions = true
        WHERE user_id IN (
          SELECT id FROM public.users 
          WHERE role IN ('admin', 'office', 'super_admin')
        );
      `
    })
    
    if (updateError) {
      console.error('❌ Error updating permissions:', updateError.message)
      return
    }
    
    console.log('✅ Admin/office permissions granted')
    
    // Verify
    const { data: columns } = await supabase
      .from('user_permissions')
      .select('can_approve_commissions, can_view_all_commissions')
      .limit(1)
    
    if (columns && columns.length > 0) {
      console.log('✅ Verification successful - columns exist')
    }
    
    console.log('\n🎉 Migration complete! Refresh your browser.')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

addPermissionColumns()
