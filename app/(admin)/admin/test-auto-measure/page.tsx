import { Suspense } from 'react'
import TestAutoMeasureClient from './test-auto-measure-client'

export const dynamic = 'force-dynamic'

export default function TestAutoMeasurePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <TestAutoMeasureClient />
    </Suspense>
  )
}
