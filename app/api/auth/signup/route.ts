import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, email, fullName, companyName } = await request.json()

    // Validate inputs
    if (!userId || !email || !fullName || !companyName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Check if company exists by email
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id, name')
      .eq('contact_email', email.toLowerCase())
      .single()

    let companyId: string

    if (existingCompany) {
      // Joining existing company
      companyId = existingCompany.id
    } else {
      // Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companyName.toLowerCase().replace(/\s+/g, '-'),
          contact_email: email,
          subscription_tier: 'trial',
          subscription_status: 'active',
        })
        .select()
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return NextResponse.json(
          { message: `Failed to create company: ${companyError.message}` },
          { status: 500 }
        )
      }
      companyId = newCompany.id
    }

    // Create user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: companyId,
        email,
        full_name: fullName,
        role: 'admin', // First user of a company is admin
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { message: `Failed to create user: ${userError.message}` },
        { status: 500 }
      )
    }

    // Create default permissions for the user
    const { error: permissionsError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        company_id: companyId,
        // Grant all permissions to admin
        can_view_leads: true,
        can_create_leads: true,
        can_edit_leads: true,
        can_delete_leads: true,
        can_view_all_leads: true,
        can_view_quotes: true,
        can_create_quotes: true,
        can_edit_quotes: true,
        can_delete_quotes: true,
        can_approve_quotes: true,
        can_send_quotes: true,
      })

    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError)
      // Don't fail the signup if permissions fail, just log it
    }

    return NextResponse.json({ 
      success: true, 
      companyId,
      companyName: existingCompany ? existingCompany.name : companyName,
      isExistingCompany: !!existingCompany
    })
  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
