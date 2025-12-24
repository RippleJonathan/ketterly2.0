'use client'

import { Button } from '@/components/ui/button'
import { TemplatesList } from '@/components/admin/document-builder/templates-list'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DocumentBuilderPage() {
  const router = useRouter()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Document Builder</h2>
          <p className="text-muted-foreground">
            Create and manage document templates
          </p>
        </div>
        <Button onClick={() => router.push('/admin/document-builder/templates/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <TemplatesList />
    </div>
  )
}
