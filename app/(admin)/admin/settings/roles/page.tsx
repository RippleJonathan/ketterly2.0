import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { CompanyRolesList } from '@/components/admin/settings/company-roles-list'
import { Skeleton } from '@/components/ui/skeleton'

export default function CompanyRolesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Roles</h1>
        <p className="text-muted-foreground">
          Define custom roles and permissions for your team members. The Admin role cannot be deleted or renamed, but all other roles are fully customizable.
        </p>
      </div>

      {/* Company Roles List */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <CompanyRolesList />
      </Suspense>
    </div>
  )
}
