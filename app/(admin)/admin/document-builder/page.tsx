import { Suspense } from 'react'
import DocumentBuilderClient from './document-builder-client'

export const dynamic = 'force-dynamic'

export default function DocumentBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <DocumentBuilderClient />
    </Suspense>
  )
}
