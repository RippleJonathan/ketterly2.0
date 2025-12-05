'use client'

import { useState } from 'react'
import { useMaterialOrders } from '@/lib/hooks/use-material-orders'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Package } from 'lucide-react'
import { MaterialOrderCard } from './material-order-card'
import { CreateMaterialOrderDialog } from './create-material-order-dialog'

interface MaterialOrdersListProps {
  leadId: string
  leadAddress?: string
}

export function MaterialOrdersList({ leadId, leadAddress }: MaterialOrdersListProps) {
  const { data: company } = useCurrentCompany()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: ordersResponse, isLoading, refetch } = useMaterialOrders({
    lead_id: leadId,
  })

  const orders = ordersResponse?.data || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Material Orders</h2>
          <p className="text-sm text-muted-foreground">
            Track materials ordered for this project
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Material Orders Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first material order from a template or manually
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Material Order
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <MaterialOrderCard key={order.id} order={order} onUpdate={() => refetch()} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateMaterialOrderDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        leadId={leadId}
        leadAddress={leadAddress}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
