import { Suspense } from 'react'
import SettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <SettingsClient />
    </Suspense>
  )
}
