'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, DollarSign, Package } from 'lucide-react'

interface ChangeOrderBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  quoteId: string
  contractId: string
  changeOrderId?: string | null  // If provided, edit this change order instead of creating new
  onSuccess?: () => void
}

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  category?: string
  notes?: string
  sort_order: number
  material_id?: string
}

export function ChangeOrderBuilder({
  open,
  onOpenChange,
  leadId,
  quoteId,
  contractId,
  changeOrderId,
  onSuccess
}: ChangeOrderBuilderProps) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch materials from database
  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []

      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!user) return []

      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: open
  })

  // Fetch contract details
  const { data: contract } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signed_contracts')
        .select('*, line_items:contract_line_items(*)')
        .eq('id', contractId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: open && !!contractId
  })

  // Fetch existing change order if editing
  const { data: existingChangeOrder } = useQuery({
    queryKey: ['change-order-edit', changeOrderId],
    queryFn: async () => {
      if (!changeOrderId) return null
      console.log('Fetching change order for edit:', changeOrderId)
      const response = await fetch(`/api/change-orders/${changeOrderId}`)
      if (!response.ok) throw new Error('Failed to fetch change order')
      const data = await response.json()
      console.log('Fetched change order data:', data)
      return data
    },
    enabled: open && !!changeOrderId
  })

  const [title, setTitle] = useState('Additional Work')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: 0 }
  ])

  // Populate form when editing existing change order
  useEffect(() => {
    console.log('useEffect triggered:', { existingChangeOrder, changeOrderId, open })
    
    if (existingChangeOrder && open) {
      console.log('Populating form with existing data:', existingChangeOrder)
      setTitle(existingChangeOrder.title || 'Additional Work')
      setDescription(existingChangeOrder.description || '')
      
      if (existingChangeOrder.line_items && existingChangeOrder.line_items.length > 0) {
        console.log('Setting line items:', existingChangeOrder.line_items)
        const items = existingChangeOrder.line_items.map((item: any, index: number) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'ea',
          unit_price: item.unit_price,
          total: item.total || (item.quantity * item.unit_price),
          category: item.category,
          notes: item.notes,
          sort_order: index,
          material_id: item.material_id
        }))
        console.log('Mapped line items:', items)
        setLineItems(items)
      } else {
        // If no line items exist, show one empty line item for editing
        console.log('No line items found, showing empty line item')
        setLineItems([{ description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: 0 }])
      }
    } else if (!changeOrderId && open) {
      console.log('Resetting form for new change order')
      // Reset form when creating new
      setTitle('Additional Work')
      setDescription('')
      setLineItems([{ description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: 0 }])
    }
  }, [existingChangeOrder, changeOrderId, open])

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const taxRate = contract?.tax_rate || 0
  const taxAmount = subtotal * taxRate
  const changeOrderTotal = subtotal + taxAmount
  // Use source of truth field (current_total_with_change_orders) - this is THE authoritative value
  // It includes original contract + all previously approved change orders
  const currentContractTotal = contract?.current_total_with_change_orders 
    || contract?.current_contract_price 
    || contract?.original_contract_price 
    || contract?.original_total 
    || 0
  const newContractTotal = currentContractTotal + changeOrderTotal

  const saveChangeOrder = useMutation({
    mutationFn: async () => {
      // If editing, use PATCH endpoint
      if (changeOrderId) {
        const response = await fetch(`/api/change-orders/${changeOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            line_items: lineItems.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || 'ea',
              unit_price: item.unit_price,
              line_total: item.total,
              category: item.category || 'labor',
              notes: item.notes,
              material_id: item.material_id || null,
              sort_order: index
            }))
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update change order')
        }
        
        return response.json()
      }
      
      // Otherwise create new change order
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!user) throw new Error('User not found')

      // Generate change order number
      const { data: existingCOs } = await supabase
        .from('change_orders')
        .select('change_order_number')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (existingCOs && existingCOs.length > 0) {
        const lastNumber = existingCOs[0].change_order_number
        const match = lastNumber.match(/CO-\d+-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }
      const changeOrderNumber = `CO-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`

      // Create change order
      const { data: changeOrder, error: coError } = await supabase
        .from('change_orders')
        .insert({
          company_id: user.company_id,
          lead_id: leadId,
          quote_id: quoteId,
          change_order_number: changeOrderNumber,
          title,
          description,
          amount: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: changeOrderTotal,
          status: 'draft',
          created_by: userData.user.id
        })
        .select()
        .single()

      if (coError) throw coError

      // Create line items
      const lineItemsData = lineItems.map((item, index) => ({
        change_order_id: changeOrder.id,
        company_id: user.company_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'ea',
        unit_price: item.unit_price,
        total: item.total,
        category: item.category,
        notes: item.notes,
        sort_order: index,
        material_id: item.material_id || null
      }))

      const { error: lineItemsError } = await supabase
        .from('change_order_line_items')
        .insert(lineItemsData)

      if (lineItemsError) throw lineItemsError

      return changeOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['change-order-edit'] })
      toast.success(changeOrderId ? 'Change order updated successfully' : 'Change order created successfully')
      onSuccess?.()
      onOpenChange(false)
      // Reset form
      setTitle('Additional Work')
      setDescription('')
      setLineItems([{ description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: 0 }])
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${changeOrderId ? 'update' : 'create'} change order: ${error.message}`)
    }
  })

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: lineItems.length }
    ])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error('Change order must have at least one line item')
      return
    }
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-calculate total when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price
    }
    
    setLineItems(updated)
  }

  const selectMaterial = (index: number, materialId: string) => {
    const material = materials?.find(m => m.id === materialId)
    if (!material) return

    const updated = [...lineItems]
    updated[index] = {
      ...updated[index],
      material_id: materialId,
      description: material.name,
      unit: material.unit || 'ea',
      unit_price: material.unit_price || 0,
      category: material.category || '',
      total: updated[index].quantity * (material.unit_price || 0)
    }
    setLineItems(updated)
    toast.success(`Added ${material.name}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    if (lineItems.some(item => !item.description.trim())) {
      toast.error('All line items must have a description')
      return
    }
    
    if (lineItems.some(item => item.quantity <= 0 || item.unit_price < 0)) {
      toast.error('Invalid quantity or price')
      return
    }

    saveChangeOrder.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{changeOrderId ? 'Edit Change Order' : 'Create Change Order'}</DialogTitle>
          <DialogDescription>
            {changeOrderId 
              ? 'Modify the change order details and line items.'
              : 'Add additional work to the contract. The customer will need to approve and sign this change order.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Summary */}
          {contract && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Original Contract</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Contract Number:</span>{' '}
                  <span className="font-medium">{contract.contract_number}</span>
                </div>
                <div>
                  <span className="text-blue-700">Current Total:</span>{' '}
                  <span className="font-medium">
                    ${(contract.current_total_with_change_orders || contract.current_contract_price || contract.original_contract_price || contract.original_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Change Order Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Additional Skylight Installation"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the additional work or changes..."
                rows={3}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  {/* Material Selector */}
                  {materials && materials.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <Label className="text-xs text-blue-900 mb-2 flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        Add from Materials Database (Optional)
                      </Label>
                      <Select onValueChange={(value) => selectMaterial(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a material..." />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} - ${material.unit_price?.toFixed(2) || '0.00'} {material.unit ? `per ${material.unit}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Select 
                          value={item.unit} 
                          onValueChange={(value) => updateLineItem(index, 'unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ea">Each</SelectItem>
                            <SelectItem value="sq ft">Sq Ft</SelectItem>
                            <SelectItem value="linear ft">Linear Ft</SelectItem>
                            <SelectItem value="bundle">Bundle</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="sheet">Sheet</SelectItem>
                            <SelectItem value="roll">Roll</SelectItem>
                            <SelectItem value="hour">Hour</SelectItem>
                            <SelectItem value="day">Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Total</Label>
                      <div className="h-10 flex items-center font-semibold">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                        className="mt-6"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Category (Optional)</Label>
                      <Input
                        value={item.category || ''}
                        onChange={(e) => updateLineItem(index, 'category', e.target.value)}
                        placeholder="e.g., Materials, Labor"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes (Optional)</Label>
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Change Order Total:</span>
              <span>${changeOrderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-blue-700 pt-2 border-t border-blue-200">
              <span>New Contract Total:</span>
              <span className="font-semibold">${newContractTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveChangeOrder.isPending}>
              <DollarSign className="h-4 w-4 mr-2" />
              {saveChangeOrder.isPending 
                ? (changeOrderId ? 'Updating...' : 'Creating...') 
                : (changeOrderId ? 'Update Change Order' : 'Create Change Order')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
