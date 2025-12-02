import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeadForm } from '@/components/admin/leads/lead-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function NewLeadPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/leads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Lead</h1>
          <p className="text-gray-600 mt-1">
            Create a new lead to track in your pipeline
          </p>
        </div>
      </div>
      
      <LeadForm mode="create" />
    </div>
  )
}
