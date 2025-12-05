'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, ClipboardList } from 'lucide-react'
import { MaterialOrdersList } from './material-orders-list'

interface OrdersTabProps {
  leadId: string
  leadAddress?: string
}

export function OrdersTab({ leadId, leadAddress }: OrdersTabProps) {
  const [activeTab, setActiveTab] = useState('material-orders')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="material-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Material Orders
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material-orders" className="mt-6">
          <MaterialOrdersList leadId={leadId} leadAddress={leadAddress} />
        </TabsContent>

        <TabsContent value="work-orders" className="mt-6">
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Work Orders Coming Soon</h3>
            <p className="text-muted-foreground">
              Subcontractor work orders will be available in a future update
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
