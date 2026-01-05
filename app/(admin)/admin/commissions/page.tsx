import { Suspense } from 'react'
import { CommissionsTable } from '@/components/admin/commissions/commissions-table'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Commissions | Ketterly CRM',
  description: 'Manage and approve all company commissions',
}

export default function CommissionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Commissions</h1>
          <p className="text-muted-foreground">
            View, approve, and manage all company commissions
          </p>
        </div>
      </div>

      {/* Commissions Table */}
      <Suspense fallback={<CommissionsTableSkeleton />}>
        <CommissionsTable />
      </Suspense>
    </div>
  )
}

function CommissionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}
