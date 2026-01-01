import { createAdminClient } from '@/lib/supabase/admin'
import { LeadsTable } from '@/components/admin/leads/leads-table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LeadsPage() {
  // Use regular client for auth check
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get user's company and check location assignments
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (userDataError || !userData) {
    console.error('Failed to fetch user data:', userDataError)
    redirect('/login')
  }

  // Check if user is location-scoped (not admin/super_admin)
  const isCompanyAdmin = ['admin', 'super_admin'].includes(userData.role || '')
  let userLocationIds: string[] = []
  
  if (!isCompanyAdmin) {
    // Get user's assigned locations
    const { data: locationUsers } = await supabase
      .from('location_users')
      .select('location_id')
      .eq('user_id', user.id)
    
    userLocationIds = locationUsers?.map(lu => lu.location_id) || []
  }

  // Use admin client to fetch leads (since RLS is disabled temporarily)
  const adminClient = createAdminClient()
  
  // Build query with location filtering
  let query = adminClient
    .from('leads')
    .select(`
      *,
      sales_rep_user:sales_rep_id(id, full_name, email),
      marketing_rep_user:marketing_rep_id(id, full_name, email),
      sales_manager_user:sales_manager_id(id, full_name, email),
      production_manager_user:production_manager_id(id, full_name, email),
      created_user:created_by(id, full_name, email)
    `)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
  
  // Add location filter for location-scoped users
  if (!isCompanyAdmin && userLocationIds.length > 0) {
    query = query.in('location_id', userLocationIds)
  }
  
  const { data: leads, error: leadsError } = await query.order('created_at', { ascending: false })

  if (leadsError) {
    console.error('Failed to fetch leads:', leadsError)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            Manage and track your sales leads
          </p>
        </div>
        <Link href="/admin/leads/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </Link>
      </div>

      {/* Leads Table */}
      <LeadsTable initialData={leads || []} />
    </div>
  )
}
