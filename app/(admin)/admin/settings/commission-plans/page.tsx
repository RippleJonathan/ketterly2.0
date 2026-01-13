import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

import { CommissionPlansList } from '@/components/admin/settings/commission-plans-list'
import { Skeleton } from '@/components/ui/skeleton'

export default function CommissionPlansPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission Plans</h1>
        <p className="text-muted-foreground">
          Manage compensation plans for your team members
        </p>
      </div>

      {/* Commission Plans List */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <CommissionPlansList />
      </Suspense>
    </div>
  )
}
