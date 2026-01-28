import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/types/users'
import { getRolePermissions } from '@/lib/api/role-permission-templates'
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

    // Check permissions: admins, super_admins, and office users can create users
    const allowedRoles = ['admin', 'super_admin', 'office']
    if (!allowedRoles.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, role, phone, commission_plan_id, role_template_id, default_location_id } = body

    // Additional validation for office users
    if (currentUser.role === 'office') {
      // Office users cannot create admin or office users
      if (role === 'admin' || role === 'super_admin' || role === 'office') {
        return NextResponse.json({ 
          error: 'Office users can only create sales, sales_manager, and staff users' 
        }, { status: 403 })
      }
      
      // TODO: Validate that default_location_id is in the office user's managed locations
      // This will be enforced by RLS policies on location_users table
    }

    // Create admin client with service role
    const adminClient = createAdminClient()

    // Step 1: Invite user by email (sends invitation email)
    const { data: authData, error: createError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
        },
      }
    )

    if (createError) {
      console.error('Failed to invite user:', createError)
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
        role: role || 'sales',
        phone: phone || null,
        commission_plan_id: commission_plan_id || null,
        default_location_id: default_location_id || null,
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

    // Step 3: Apply permissions from company_roles
    const userRole = (role || 'sales') as UserRole
    let permissionsToApply = null

    // Get permissions from company_roles table based on role
    const { data: companyRole } = await supabase
      .from('company_roles')
      .select('permissions')
      .eq('company_id', currentUser.company_id)
      .eq('role_name', userRole)
      .is('deleted_at', null)
      .single()

    if (companyRole && companyRole.permissions) {
      // company_roles stores permissions as JSONB
      permissionsToApply = companyRole.permissions
    } else {
      // Fallback to DEFAULT_ROLE_PERMISSIONS if role doesn't exist
      console.warn(`No company role found for ${userRole}, using defaults`)
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

    // Step 4: Add user to location_users table if they have a default_location_id
    if (default_location_id) {
      await adminClient
        .from('location_users')
        .insert({
          user_id: newUser.id,
          location_id: default_location_id,
          assigned_by: authUser.id,
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
