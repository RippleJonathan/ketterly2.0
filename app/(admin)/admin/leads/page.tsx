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

  // Check role-based permissions
  const userRole = userData.role || ''
  const canSeeAllLeads = ['admin', 'super_admin', 'office', 'sales_manager', 'production_manager'].includes(userRole)
  const isSalesRole = userRole === 'sales'
  const isMarketingRole = userRole === 'marketing'
  
  // Check if user is location-scoped (not admin/super_admin)
  const isCompanyAdmin = ['admin', 'super_admin'].includes(userRole)
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
  
  // Build query with location and role-based filtering
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
    // Non-admins can only see leads from their assigned locations
    // Also exclude leads without a location_id (null)
    query = query.in('location_id', userLocationIds).not('location_id', 'is', null)
  } else if (!isCompanyAdmin) {
    // User has no location assignments - show no leads
    query = query.eq('location_id', '00000000-0000-0000-0000-000000000000') // Impossible UUID
  }
  
  // Add assignment filter based on role
  if (isSalesRole) {
    // Sales reps can only see leads where they are the sales rep
    query = query.eq('sales_rep_id', user.id)
  } else if (isMarketingRole) {
    // Marketing reps can only see leads where they are the marketing rep
    query = query.eq('marketing_rep_id', user.id)
  }
  // Managers, office, and admin see all leads (filtered by location above if applicable)
  
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
