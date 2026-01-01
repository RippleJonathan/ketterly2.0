'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { MaterialsPricingTab } from './materials-pricing-tab'

interface LocationPricingTabProps {
  locationId: string
  locationName: string
}

export function LocationPricingTab({ locationId, locationName }: LocationPricingTabProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Manage pricing for materials and services at <strong>{locationName}</strong>. 
          Set custom prices and track supplier-specific deals for accurate quoting.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="estimate">Estimate Items</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
        </TabsList>

        <TabsContent value="estimate">
          <MaterialsPricingTab 
            locationId={locationId} 
            itemType="estimate"
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsPricingTab 
            locationId={locationId} 
            itemType="material"
          />
        </TabsContent>

        <TabsContent value="labor">
          <MaterialsPricingTab 
            locationId={locationId} 
            itemType="labor"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
