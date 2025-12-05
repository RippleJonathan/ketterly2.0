'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanySettingsForm } from '@/components/admin/settings/company-settings-form'
import { MaterialTemplatesSettings } from '@/components/admin/settings/material-templates-settings'
import { MaterialsSettings } from '@/components/admin/settings/materials-settings'
import { Building2, ClipboardList, Package } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company settings, materials, and templates
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <CompanySettingsForm />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <MaterialsSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <MaterialTemplatesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
