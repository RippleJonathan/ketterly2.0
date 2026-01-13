import { Suspense } from 'react'
import DashboardClient from './dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Ketterly',
  description: 'Your roofing business dashboard',
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <DashboardClient />
    </Suspense>
  )
}
