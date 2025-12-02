import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, companyId, email, fullName } = await request.json()

    // Validate inputs
    if (!userId || !companyId || !email || !fullName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Insert user record (using any to bypass type issues with admin client)
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        company_id: companyId,
        email,
        full_name: fullName,
        role: 'admin',
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
