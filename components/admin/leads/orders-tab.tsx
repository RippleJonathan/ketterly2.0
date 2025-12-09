'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, ClipboardList } from 'lucide-react'
import { MaterialOrdersList } from './material-orders-list'
import type { OrderType } from '@/lib/types/material-orders'

interface OrdersTabProps {
  leadId: string
  leadAddress?: string
}

export function OrdersTab({ leadId, leadAddress }: OrdersTabProps) {
  const [activeTab, setActiveTab] = useState<OrderType>('material')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderType)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="material" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Material Orders
          </TabsTrigger>
          <TabsTrigger value="work" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material" className="mt-6">
          <MaterialOrdersList leadId={leadId} leadAddress={leadAddress} orderType="material" />
        </TabsContent>

        <TabsContent value="work" className="mt-6">
          <MaterialOrdersList leadId={leadId} leadAddress={leadAddress} orderType="work" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
