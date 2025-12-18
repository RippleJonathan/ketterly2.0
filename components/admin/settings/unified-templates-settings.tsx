// Unified Templates Settings Component
// Combines Material Orders, Labor Orders, and Estimate templates

'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MaterialTemplatesSettings } from './material-templates-settings'
import { LaborTemplatesSettings } from './labor-templates-settings'
import { EstimateTemplatesSettings } from './estimate-templates-settings'
import { Package, FileText, Users } from 'lucide-react'

export function UnifiedTemplatesSettings() {
  const [activeTab, setActiveTab] = useState('material-orders')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Templates</h2>
        <p className="text-muted-foreground">
          Create and manage reusable templates for material orders, labor orders, and estimates
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="material-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Material Templates</span>
            <span className="sm:hidden">Materials</span>
          </TabsTrigger>
          <TabsTrigger value="labor-orders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Labor Templates</span>
            <span className="sm:hidden">Labor</span>
          </TabsTrigger>
          <TabsTrigger value="estimates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Estimate Templates</span>
            <span className="sm:hidden">Estimates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material-orders" className="space-y-4">
          <MaterialTemplatesSettings />
        </TabsContent>

        <TabsContent value="labor-orders" className="space-y-4">
          <LaborTemplatesSettings />
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <EstimateTemplatesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
