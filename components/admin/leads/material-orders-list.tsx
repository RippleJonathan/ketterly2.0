'use client'

import { useState } from 'react'
import { useMaterialOrders } from '@/lib/hooks/use-material-orders'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Package, ClipboardList } from 'lucide-react'
import { MaterialOrderCard } from './material-order-card'
import { CreateMaterialOrderDialog } from './create-material-order-dialog'
import type { OrderType } from '@/lib/types/material-orders'

interface MaterialOrdersListProps {
  leadId: string
  leadAddress?: string
  orderType: OrderType
}

export function MaterialOrdersList({ leadId, leadAddress, orderType }: MaterialOrdersListProps) {
  const { data: company } = useCurrentCompany()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { data: ordersResponse, isLoading, refetch } = useMaterialOrders({
    lead_id: leadId,
  })

  // Filter orders by type
  const allOrders = ordersResponse?.data || []
  const orders = allOrders.filter(order => order.order_type === orderType)
  
  // Labels based on type
  const isMaterial = orderType === 'material'
  const orderLabel = isMaterial ? 'Material Order' : 'Work Order'
  const ordersLabel = isMaterial ? 'Material Orders' : 'Work Orders'
  const description = isMaterial 
    ? 'Track materials ordered for this project'
    : 'Track work orders and subcontractor assignments'
  const Icon = isMaterial ? Package : ClipboardList

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
          <h2 className="text-xl font-semibold">{ordersLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create {orderLabel}
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No {ordersLabel} Yet</h3>
          <p className="text-muted-foreground mb-4">
            {isMaterial 
              ? 'Create your first material order from a template or manually'
              : 'Create your first work order for subcontractors or labor'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create {orderLabel}
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
        orderType={orderType}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
