'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Mail } from 'lucide-react'
import { MaterialOrder } from '@/lib/types/material-orders'
import { WorkOrder } from '@/lib/types/work-orders'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { createClient } from '@/lib/supabase/client'

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: MaterialOrder | WorkOrder
  orderType: 'material' | 'work'
  leadId?: string
  onSend: (data: {
    recipientEmails: string[]
    recipientName: string
    includeMaterialList: boolean
    materialOrderIds?: string[]
    deliveryDate?: string // ISO date string for material orders
    scheduledDate?: string // ISO date string for work orders
  }) => Promise<void>
}

export function SendEmailDialog({ open, onOpenChange, order, orderType, leadId, onSend }: SendEmailDialogProps) {
  const { data: company } = useCurrentCompany()
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [includeMaterialList, setIncludeMaterialList] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([])
  const [selectedMaterialOrders, setSelectedMaterialOrders] = useState<string[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')

  // Initialize email fields based on order type
  useEffect(() => {
    const matOrder = order as MaterialOrder
    if (matOrder.order_type === 'material') {
      setPrimaryEmail(matOrder.supplier?.email || '')
      setRecipientName(matOrder.supplier?.contact_name || matOrder.supplier?.name || '')
    } else if (matOrder.order_type === 'work') {
      // Work orders - would need crew email from assignment
      setPrimaryEmail('')
      setRecipientName('')
    }
  }, [order])

  // Load material orders if this is a work order
  useEffect(() => {
    const matOrder = order as MaterialOrder
    if (open && matOrder.order_type === 'work' && leadId && company?.id) {
      loadMaterialOrders()
    }
  }, [open, order, leadId, company?.id])

  const loadMaterialOrders = async () => {
    if (!company?.id || !leadId) return
    
    setIsLoadingOrders(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('material_orders')
        .select('*, supplier:suppliers(*), items:material_order_items(*)')
        .eq('company_id', company.id)
        .eq('lead_id', leadId)
        .eq('order_type', 'material') // Only load actual material orders, not work orders
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMaterialOrders(data as MaterialOrder[])
      }
    } catch (error) {
      console.error('Failed to load material orders:', error)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleAddEmail = () => {
    if (newEmail.trim() && newEmail.includes('@')) {
      setAdditionalEmails([...additionalEmails, newEmail.trim()])
      setNewEmail('')
    }
  }

  const handleRemoveEmail = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!primaryEmail.trim()) return
    
    const matOrder = order as MaterialOrder
    const isWorkOrder = matOrder.order_type === 'work'

    setIsSending(true)
    try {
      const allEmails = [primaryEmail.trim(), ...additionalEmails]
      await onSend({
        recipientEmails: allEmails,
        recipientName: recipientName.trim(),
        includeMaterialList: selectedMaterialOrders.length > 0, // Auto-enable if material orders selected
        materialOrderIds: selectedMaterialOrders.length > 0 ? selectedMaterialOrders : undefined,
        deliveryDate: isWorkOrder ? undefined : (deliveryDate || undefined),
        scheduledDate: isWorkOrder ? (scheduledDate || undefined) : undefined,
      })
      onOpenChange(false)
      // Reset form
      setAdditionalEmails([])
      setNewEmail('')
      setIncludeMaterialList(false)
      setSelectedMaterialOrders([])
      setDeliveryDate('')
      setScheduledDate('')
    } finally {
      setIsSending(false)
    }
  }

  const toggleMaterialOrder = (orderId: string) => {
    setSelectedMaterialOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send {orderType === 'work' ? 'Work Order' : 'Purchase Order'} Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Primary Recipient */}
          <div className="space-y-2">
            <Label htmlFor="primary-email">Primary Recipient Email *</Label>
            <Input
              id="primary-email"
              type="email"
              placeholder="supplier@example.com"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
            />
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient Name</Label>
            <Input
              id="recipient-name"
              placeholder="John Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          {/* Delivery/Install Date */}
          <div className="space-y-2">
            <Label htmlFor="delivery-date">
              {orderType === 'work' ? 'Scheduled Install Date' : 'Expected Delivery Date'}
              {' '}
              <span className="text-xs text-gray-500">(Optional - Creates calendar event)</span>
            </Label>
            <Input
              id="delivery-date"
              type="date"
              value={orderType === 'work' ? scheduledDate : deliveryDate}
              onChange={(e) => orderType === 'work' ? setScheduledDate(e.target.value) : setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Can't schedule in the past
            />
            {(deliveryDate || scheduledDate) && (
              <p className="text-xs text-blue-600">
                📅 A calendar event will be automatically created on this date
              </p>
            )}
          </div>

          {/* Additional Recipients */}
          <div className="space-y-2">
            <Label>Additional Recipients (CC)</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="additional@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddEmail}
                disabled={!newEmail.trim() || !newEmail.includes('@')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {additionalEmails.length > 0 && (
              <div className="mt-2 space-y-1">
                {additionalEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                  >
                    <span>{email}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveEmail(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Material List Option */}
          {orderType === 'material' && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="include-materials"
                checked={includeMaterialList}
                onCheckedChange={(checked) => setIncludeMaterialList(checked as boolean)}
              />
              <Label
                htmlFor="include-materials"
                className="text-sm font-normal cursor-pointer"
              >
                Include material list in email body (without prices)
              </Label>
            </div>
          )}

          {/* Material Orders Selection for Work Orders */}
          {orderType === 'work' && materialOrders.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Include Material Orders</Label>
              <p className="text-xs text-gray-500 mb-2">
                Select material orders to include in this work order email
              </p>
              {isLoadingOrders ? (
                <div className="text-sm text-gray-500">Loading material orders...</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {materialOrders.map((matOrder) => (
                    <div
                      key={matOrder.id}
                      className="flex items-start space-x-2 bg-gray-50 p-2 rounded"
                    >
                      <Checkbox
                        id={`mat-order-${matOrder.id}`}
                        checked={selectedMaterialOrders.includes(matOrder.id)}
                        onCheckedChange={() => toggleMaterialOrder(matOrder.id)}
                      />
                      <Label
                        htmlFor={`mat-order-${matOrder.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        <div>
                          <div className="font-medium">{matOrder.order_number}</div>
                          <div className="text-xs text-gray-600">
                            {matOrder.supplier?.name} • {matOrder.items?.length || 0} items
                            {matOrder.order_date && ` • ${new Date(matOrder.order_date).toLocaleDateString()}`}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
            <div><strong>{orderType === 'work' ? 'WO' : 'PO'} Number:</strong> {orderType === 'work' ? (order as WorkOrder).work_order_number : (order as MaterialOrder).order_number}</div>
            {orderType === 'material' && <div><strong>Items:</strong> {(order as MaterialOrder).items?.length || 0}</div>}
            {orderType === 'material' && (order as MaterialOrder).supplier && (
              <div><strong>Supplier:</strong> {(order as MaterialOrder).supplier?.name}</div>
            )}
            {orderType === 'work' && (order as WorkOrder).subcontractor_name && (
              <div><strong>Subcontractor:</strong> {(order as WorkOrder).subcontractor_name}</div>
            )}
            {(deliveryDate || scheduledDate) && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="flex items-center gap-1">
                  <strong>📅 {orderType === 'work' ? 'Install' : 'Delivery'} Date:</strong>
                  <span>{new Date(orderType === 'work' ? scheduledDate : deliveryDate).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Calendar event will be created automatically
                </div>
              </div>
            )}
            {selectedMaterialOrders.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <strong>+ {selectedMaterialOrders.length} Material Order(s)</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Material list will be included in email (without prices)
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!primaryEmail.trim() || isSending}>
            <Mail className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
