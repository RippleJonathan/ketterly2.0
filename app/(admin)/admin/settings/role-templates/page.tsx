import { Suspense } from 'react'
import { RoleTemplatesList } from '@/components/admin/settings/role-templates-list'
import { Skeleton } from '@/components/ui/skeleton'

export default function RoleTemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Templates</h1>
        <p className="text-muted-foreground">
          Create permission templates to quickly set up new users
        </p>
      </div>

      {/* Role Templates List */}
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <RoleTemplatesList />
      </Suspense>
    </div>
  )
}
