'use client'

import { useState } from 'react'
import { MaterialOrder } from '@/lib/types/material-orders'
import { deleteMaterialOrder } from '@/lib/api/material-orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/formatting'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Upload,
  XCircle,
  Trash2,
} from 'lucide-react'
import { MaterialOrderDetailDialog } from './material-order-detail-dialog'
import { toast } from 'sonner'

interface MaterialOrderCardProps {
  order: MaterialOrder
  onUpdate?: () => void
}

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700',
  },
  ordered: {
    label: 'Ordered',
    icon: Clock,
    color: 'bg-blue-100 text-blue-700',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    color: 'bg-indigo-100 text-indigo-700',
  },
  in_transit: {
    label: 'In Transit',
    icon: Truck,
    color: 'bg-purple-100 text-purple-700',
  },
  delivered: {
    label: 'Delivered',
    icon: Package,
    color: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
  },
}

export function MaterialOrderCard({ order, onUpdate }: MaterialOrderCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  const variance = order.total_actual > 0 
    ? order.total_actual - order.total_estimated 
    : null

  const variancePercent = variance && order.total_estimated > 0
    ? ((variance / order.total_estimated) * 100).toFixed(1)
    : null

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete order ${order.order_number}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteMaterialOrder(order.id)
      
      if (result.error) {
        toast.error('Failed to delete order')
        return
      }

      toast.success('Order deleted successfully')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to delete order')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {order.order_number}
              {order.template_name && (
                <Badge variant="outline" className="font-normal">
                  {order.template_name}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {order.supplier?.name && (
                <>
                  <span>{order.supplier.name}</span>
                  <span>•</span>
                </>
              )}
              <span>
                Created {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {order.order_date && (
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <p className="font-medium">{format(new Date(order.order_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
            {order.expected_delivery_date && !order.actual_delivery_date && (
              <div>
                <span className="text-muted-foreground">Expected Delivery:</span>
                <p className="font-medium">
                  {format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {order.actual_delivery_date && (
              <div>
                <span className="text-muted-foreground">Delivered:</span>
                <p className="font-medium text-green-600">
                  {format(new Date(order.actual_delivery_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.total_estimated)}</span>
              </div>
              {order.tax_rate > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Tax ({(order.tax_rate * 100).toFixed(2)}%):
                    </span>
                    <span className="font-medium">{formatCurrency(order.tax_amount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">Total with Tax:</span>
                    <span className="font-semibold text-lg">{formatCurrency(order.total_with_tax || order.total_estimated)}</span>
                  </div>
                </>
              )}
              {order.tax_rate === 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold text-lg">{formatCurrency(order.total_estimated)}</span>
                </div>
              )}
            </div>

            {/* Variance */}
            {variance !== null && variancePercent !== null && (
              <div className="mt-3 p-2 rounded-lg bg-muted">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Variance:</span>
                  <span
                    className={`font-medium ${
                      variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''
                    }`}
                  >
                    {variance > 0 ? '+' : ''}
                    {formatCurrency(variance)} ({variance > 0 ? '+' : ''}
                    {variancePercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Items Summary */}
          {order.items && order.items.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1">
                      {item.description}
                    </span>
                    <span className="font-mono ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {order.items.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
                <FileText className="h-4 w-4 mr-1" />
                View Details
              </Button>
              {order.status === 'delivered' && order.total_actual === 0 && (
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Update Costs
                </Button>
              )}
              {order.status !== 'cancelled' && (
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Invoice
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </CardContent>

      <MaterialOrderDetailDialog
        order={order}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onUpdate={onUpdate}
      />
    </Card>
  )
}
