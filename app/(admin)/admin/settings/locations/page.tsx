import { Suspense } from 'react'
import LocationsClient from './locations-client'

export const dynamic = 'force-dynamic'

export default function LocationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <LocationsClient />
    </Suspense>
  )
}
