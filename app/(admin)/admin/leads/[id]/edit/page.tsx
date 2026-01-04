import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { LeadForm } from '@/components/admin/leads/lead-form'
import { DeleteLeadButton } from '@/components/admin/leads/delete-lead-button'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface EditLeadPageProps {
  params: Promise<{ id: string }>
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // Use admin client to fetch lead
  const adminClient = createAdminClient()
  
  const result = await adminClient
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .single()
  
  const { data: lead, error } = result as any

  if (error || !lead) {
    notFound()
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Lead</h1>
          <p className="text-gray-600 mt-1">
            Update information for {lead.full_name}
          </p>
        </div>
        <DeleteLeadButton leadId={id} leadName={lead.full_name} />
      </div>
      
      <LeadForm mode="edit" lead={lead as any} />
    </div>
  )
}
