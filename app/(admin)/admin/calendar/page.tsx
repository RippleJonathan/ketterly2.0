import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CalendarPageClient } from '@/components/admin/calendar/calendar-page-client'

export const metadata = {
  title: 'Calendar | Ketterly',
  description: 'Schedule and manage appointments, consultations, and production events',
}

export default async function CalendarPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user data with permissions
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      permissions:user_permissions(*)
    `)
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // Check if user has calendar view permission
  if (!userData.permissions?.can_view_calendar) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading calendar...</div>}>
        <CalendarPageClient
          userId={user.id}
          canCreateConsultations={userData.permissions?.can_create_consultations || false}
          canCreateProductionEvents={userData.permissions?.can_create_production_events || false}
          canEditAllEvents={userData.permissions?.can_edit_all_events || false}
          canManageRecurring={userData.permissions?.can_manage_recurring_events || false}
        />
      </Suspense>
    </div>
  )
}
