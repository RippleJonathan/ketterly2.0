// Check if document templates exist
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTemplates() {
  console.log('Checking for document templates...\n')
  
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`Found ${data?.length || 0} template(s):\n`)
  
  if (data && data.length > 0) {
    data.forEach((template, i) => {
      console.log(`${i + 1}. ${template.name}`)
      console.log(`   Category: ${template.category}`)
      console.log(`   Global: ${template.is_global}`)
      console.log(`   Company ID: ${template.company_id || 'null (global)'}`)
      console.log(`   Sections: ${template.sections?.length || 0}`)
      console.log()
    })
  } else {
    console.log('⚠️  No templates found in database.')
    console.log('\nYou need to run the seed migration:')
    console.log('node run-migration.js supabase/migrations/20241223000003_seed_document_templates.sql')
  }
}

checkTemplates()
