import { Suspense } from 'react'
import NotificationsClient from './notifications-client'

export const dynamic = 'force-dynamic'

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <NotificationsClient />
    </Suspense>
  )
}
