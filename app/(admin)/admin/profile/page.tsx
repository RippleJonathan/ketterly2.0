import { Suspense } from 'react'
import ProfileClient from './profile-client'

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ProfileClient />
    </Suspense>
  )
}
