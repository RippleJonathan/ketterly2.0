import { Suspense } from 'react'
import RolePermissionsClient from './role-permissions-client'

export const dynamic = 'force-dynamic'

export default function RolePermissionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <RolePermissionsClient />
    </Suspense>
  )
}
