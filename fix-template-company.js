/**
 * Fix Template Company ID
 * 
 * This script updates the presentation template to use the correct company_id
 * for your logged-in user.
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixTemplateCompany() {
  console.log('🔍 Checking presentation template and user company...\n')

  try {
    // 1. Get the template
    const { data: template, error: templateError } = await supabase
      .from('presentation_templates')
      .select('*')
      .eq('name', 'Standard Sales Presentation')
      .single()

    if (templateError || !template) {
      console.error('❌ Template not found:', templateError?.message)
      console.log('\n💡 Make sure you ran the sample_presentation_template.sql script')
      return
    }

    console.log('✅ Found template:')
    console.log(`   ID: ${template.id}`)
    console.log(`   Name: ${template.name}`)
    console.log(`   Company ID: ${template.company_id}`)
    console.log(`   Is Active: ${template.is_active}`)
    console.log()

    // 2. Get the first user from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError || !authUsers?.users?.length) {
      console.error('❌ No users found:', authError?.message)
      return
    }

    const firstAuthUser = authUsers.users[0]
    console.log('✅ Found auth user:')
    console.log(`   ID: ${firstAuthUser.id}`)
    console.log(`   Email: ${firstAuthUser.email}`)
    console.log()

    // 3. Get the user's company from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, companies(*)')
      .eq('id', firstAuthUser.id)
      .single()

    if (userError || !userData) {
      console.error('❌ User data not found:', userError?.message)
      return
    }

    console.log('✅ User company:')
    console.log(`   Company ID: ${userData.company_id}`)
    console.log(`   Company Name: ${userData.companies?.name}`)
    console.log()

    // 4. Check if template company matches user company
    if (template.company_id === userData.company_id) {
      console.log('✅ Template company ID already matches user company ID!')
      console.log('   No update needed.')
      
      if (!template.is_active) {
        console.log('\n⚠️  Template is not active. Activating...')
        const { error: activateError } = await supabase
          .from('presentation_templates')
          .update({ is_active: true })
          .eq('id', template.id)
        
        if (activateError) {
          console.error('❌ Failed to activate:', activateError.message)
        } else {
          console.log('✅ Template activated!')
        }
      }
      
      return
    }

    // 5. Update template to use correct company_id
    console.log('⚠️  Company ID mismatch! Updating template...')
    const { error: updateError } = await supabase
      .from('presentation_templates')
      .update({ 
        company_id: userData.company_id,
        is_active: true 
      })
      .eq('id', template.id)

    if (updateError) {
      console.error('❌ Failed to update template:', updateError.message)
      return
    }

    console.log('✅ Template updated successfully!')
    console.log(`   Old Company ID: ${template.company_id}`)
    console.log(`   New Company ID: ${userData.company_id}`)
    console.log()
    console.log('🎉 Done! The template should now appear in the Present modal.')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

fixTemplateCompany()
