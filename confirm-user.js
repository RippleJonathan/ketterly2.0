require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function confirmUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = 'demo@rippleroofing.com'

  console.log(`Confirming email for: ${email}`)

  // Get the user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.find(u => u.email === email)
  
  if (!user) {
    console.error('User not found with email:', email)
    return
  }

  console.log('Found user:', user.id)

  // Update user to confirm email
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  )

  if (error) {
    console.error('Error confirming user:', error)
  } else {
    console.log('✅ User email confirmed successfully!')
    console.log('You can now login with:')
    console.log('  Email:', email)
    console.log('  Password: demo123')
  }
}

confirmUser().catch(console.error)
