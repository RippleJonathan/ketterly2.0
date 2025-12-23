'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GlobalDocumentsList } from './global-documents-list'
import { CompanyDocumentsList } from './company-documents-list'
import { UploadDocumentDialog } from './upload-document-dialog'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

export function DocumentLibraryClient() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('company')
  const { data: user } = useCurrentUser()

  const isAdmin = user?.data?.role === 'admin' || user?.data?.role === 'super_admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage company documents and access platform resources
          </p>
        </div>
        {isAdmin && activeTab === 'company' && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="company">Company Documents</TabsTrigger>
          <TabsTrigger value="global">Global Library</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <CompanyDocumentsList />
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          <GlobalDocumentsList />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <CompanyDocumentsList templatesOnly />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  )
}
