import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/types/users'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated and get their company
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Current user company_id:', currentUser.company_id)

    // Only admins can create users
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role, phone, commission_plan_id, role_template_id } = body

    // Create admin client with service role
    const adminClient = createAdminClient()

    // Step 1: Create auth user
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    })

    if (createError) {
      console.error('Failed to create auth user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Step 2: Create user record in users table (use admin client to bypass RLS)
    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        company_id: currentUser.company_id,
        email,
        full_name,
        role: role || 'user',
        phone: phone || null,
        commission_plan_id: commission_plan_id || null,
        is_active: true,
      })
      .select()
      .single()

    console.log('Created user:', newUser)
    console.log('User company_id:', newUser?.company_id)

    if (insertError) {
      console.error('Failed to create user record:', insertError)
      // Cleanup: delete auth user if database insert fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // Step 3: Apply role template or default permissions
    let permissionsToApply = null

    if (role_template_id && role_template_id !== 'none') {
      // Use custom role template if provided
      const { data: template } = await adminClient
        .from('role_templates')
        .select('permissions')
        .eq('id', role_template_id)
        .single()

      if (template?.permissions) {
        permissionsToApply = template.permissions
      }
    } else {
      // Apply default permissions based on role
      const userRole = (role || 'sales') as UserRole
      permissionsToApply = DEFAULT_ROLE_PERMISSIONS[userRole]
    }

    // Insert permissions if we have any
    if (permissionsToApply) {
      await adminClient
        .from('user_permissions')
        .upsert({
          user_id: newUser.id,
          ...permissionsToApply,
        }, {
          onConflict: 'user_id'
        })
    }

    return NextResponse.json({ data: newUser, error: null }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
