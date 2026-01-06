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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Plus, Trash2, DollarSign, FileText, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatting'

interface InvoiceBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  quoteId: string
  contractId: string
  onSuccess?: () => void
}

interface ContractLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  category?: string
}

interface ChangeOrderLineItem {
  id: string
  change_order_id: string
  change_order_number: string
  change_order_title: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  category?: string
}

interface AdditionalLineItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  category?: string
  notes?: string
  sort_order: number
}

export function InvoiceBuilder({
  open,
  onOpenChange,
  leadId,
  quoteId,
  contractId,
  onSuccess
}: InvoiceBuilderProps) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch contract with line items
  const { data: contract } = useQuery({
    queryKey: ['contract-for-invoice', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signed_contracts')
        .select(`
          *,
          line_items:contract_line_items(*)
        `)
        .eq('id', contractId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: open && !!contractId
  })

  // Fetch approved change orders with line items
  const { data: changeOrders } = useQuery({
    queryKey: ['approved-change-orders-for-invoice', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          title,
          line_items:change_order_line_items(*)
        `)
        .eq('quote_id', quoteId)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: open && !!quoteId
  })

  // Fetch materials for additional items
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

  // State for which change orders to include
  const [selectedChangeOrders, setSelectedChangeOrders] = useState<Set<string>>(new Set())
  
  // State for additional line items
  const [additionalItems, setAdditionalItems] = useState<AdditionalLineItem[]>([])

  // Invoice details
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')

  // Initialize: select all change orders by default
  useEffect(() => {
    if (changeOrders && changeOrders.length > 0 && selectedChangeOrders.size === 0) {
      setSelectedChangeOrders(new Set(changeOrders.map(co => co.id)))
    }
  }, [changeOrders])

  // Calculate totals
  const contractSubtotal = contract?.line_items?.reduce((sum: number, item: any) => 
    sum + (item.line_total || 0), 0) || 0

  const changeOrdersSubtotal = changeOrders
    ?.filter(co => selectedChangeOrders.has(co.id))
    .reduce((sum, co) => {
      const coTotal = co.line_items?.reduce((s: number, item: any) => s + (item.total || 0), 0) || 0
      return sum + coTotal
    }, 0) || 0

  const additionalSubtotal = additionalItems.reduce((sum, item) => sum + item.total, 0)

  const subtotal = contractSubtotal + changeOrdersSubtotal + additionalSubtotal
  const taxRate = contract?.tax_rate || 0
  const taxAmount = subtotal * taxRate
  const invoiceTotal = subtotal + taxAmount

  // Toggle change order selection
  const toggleChangeOrder = (coId: string) => {
    const newSelected = new Set(selectedChangeOrders)
    if (newSelected.has(coId)) {
      newSelected.delete(coId)
    } else {
      newSelected.add(coId)
    }
    setSelectedChangeOrders(newSelected)
  }

  // Additional items management
  const addAdditionalItem = () => {
    setAdditionalItems([
      ...additionalItems,
      { description: '', quantity: 1, unit: 'ea', unit_price: 0, total: 0, sort_order: additionalItems.length }
    ])
  }

  const removeAdditionalItem = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index))
  }

  const updateAdditionalItem = (index: number, field: keyof AdditionalLineItem, value: any) => {
    const updated = [...additionalItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-calculate total when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price
    }
    
    setAdditionalItems(updated)
  }

  const selectMaterial = (index: number, materialId: string) => {
    const material = materials?.find(m => m.id === materialId)
    if (!material) return

    const updated = [...additionalItems]
    updated[index] = {
      ...updated[index],
      description: material.name,
      unit: material.unit || 'ea',
      unit_price: material.unit_price || 0,
      category: material.category || '',
      total: updated[index].quantity * (material.unit_price || 0)
    }
    setAdditionalItems(updated)
    toast.success(`Added ${material.name}`)
  }

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!user) throw new Error('User not found')

      // Calculate due date if not set
      const invoiceDate = new Date()
      let calculatedDueDate = dueDate
      if (!dueDate) {
        const due = new Date(invoiceDate)
        due.setDate(due.getDate() + 30) // Default Net 30
        calculatedDueDate = due.toISOString().split('T')[0]
      }

      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          quote_id: quoteId,
          contract_id: contractId,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: calculatedDueDate,
          payment_terms: paymentTerms,
          notes,
          tax_rate: taxRate,
          selected_change_order_ids: Array.from(selectedChangeOrders),
          additional_items: additionalItems.filter(item => item.description.trim())
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invoice')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all invoice queries for this company
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      queryClient.invalidateQueries({ queryKey: ['contract-comparison'] })
      
      // Invalidate commission queries (commissions are auto-created by database trigger)
      queryClient.invalidateQueries({ queryKey: ['lead-commissions'] })
      queryClient.invalidateQueries({ queryKey: ['user-commissions'] })
      queryClient.invalidateQueries({ queryKey: ['commissions'] })
      queryClient.invalidateQueries({ queryKey: ['commissions-by-status'] })
      queryClient.invalidateQueries({ queryKey: ['commissions-for-lead'] })
      
      toast.success('Invoice created successfully')
      onSuccess?.()
      onOpenChange(false)
      
      // Reset form
      setSelectedChangeOrders(new Set())
      setAdditionalItems([])
      setDueDate('')
      setPaymentTerms('Net 30')
      setNotes('')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (additionalItems.some(item => item.description.trim() && (item.quantity <= 0 || item.unit_price < 0))) {
      toast.error('Invalid quantity or price in additional items')
      return
    }

    createInvoice.mutate()
  }

  // Get selected change orders details
  const selectedCOs = changeOrders?.filter(co => selectedChangeOrders.has(co.id)) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice from Contract</DialogTitle>
          <DialogDescription>
            Review contract items, select change orders to include, and add any additional items for the final invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Summary */}
          {contract && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contract Base: {contract.contract_number}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-blue-700">Original Total:</span>{' '}
                  <span className="font-medium">
                    {formatCurrency(contract.original_total || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Contract Line Items:</span>{' '}
                  <span className="font-medium">{contract.line_items?.length || 0}</span>
                </div>
              </div>
              <p className="text-xs text-blue-700">
                ✓ All contract line items will be included in the invoice
              </p>
            </div>
          )}

          {/* Change Orders Selection */}
          {changeOrders && changeOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Approved Change Orders</Label>
                <span className="text-sm text-gray-500">
                  {selectedChangeOrders.size} of {changeOrders.length} selected
                </span>
              </div>
              
              <div className="border rounded-lg divide-y">
                {changeOrders.map((co) => {
                  const coSubtotal = co.line_items?.reduce((sum: number, item: any) => 
                    sum + (item.total || 0), 0) || 0
                  const isSelected = selectedChangeOrders.has(co.id)
                  
                  return (
                    <div 
                      key={co.id}
                      className={`p-4 transition-colors ${isSelected ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChangeOrder(co.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900">{co.change_order_number}</div>
                              <div className="text-sm text-gray-600">{co.title}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(coSubtotal)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {co.line_items?.length || 0} items
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && co.line_items && co.line_items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <div className="text-xs text-gray-600 space-y-1">
                                {co.line_items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.description}</span>
                                    <span className="text-gray-900">
                                      {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Additional Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Additional Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addAdditionalItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {additionalItems.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No additional items</p>
                <p className="text-xs mt-1">Add items for work not covered in the contract or change orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {additionalItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-amber-50">
                    {/* Material Selector */}
                    {materials && materials.length > 0 && (
                      <div className="bg-white border border-amber-200 rounded p-3">
                        <Label className="text-xs text-amber-900 mb-2 flex items-center gap-2">
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
                                {material.name} - {formatCurrency(material.unit_price || 0)} {material.unit ? `per ${material.unit}` : ''}
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
                            onChange={(e) => updateAdditionalItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => updateAdditionalItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Select 
                            value={item.unit} 
                            onValueChange={(value) => updateAdditionalItem(index, 'unit', value)}
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
                            onChange={(e) => updateAdditionalItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Total</Label>
                        <div className="h-10 flex items-center font-semibold">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAdditionalItem(index)}
                        className="mt-6"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Category (Optional)</Label>
                        <Input
                          value={item.category || ''}
                          onChange={(e) => updateAdditionalItem(index, 'category', e.target.value)}
                          placeholder="e.g., Materials, Labor"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (Optional)</Label>
                        <Input
                          value={item.notes || ''}
                          onChange={(e) => updateAdditionalItem(index, 'notes', e.target.value)}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <div className="border-t pt-6 space-y-4">
            <Label className="text-base font-semibold">Invoice Details</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for 30 days from today</p>
              </div>
              <div>
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger id="payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment instructions, thank you message, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Contract Base:</span>
              <span className="font-medium">{formatCurrency(contractSubtotal)}</span>
            </div>
            {selectedChangeOrders.size > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Change Orders ({selectedChangeOrders.size}):
                </span>
                <span className="font-medium text-green-700">
                  +{formatCurrency(changeOrdersSubtotal)}
                </span>
              </div>
            )}
            {additionalItems.length > 0 && additionalSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Additional Items ({additionalItems.filter(i => i.description.trim()).length}):
                </span>
                <span className="font-medium text-amber-700">
                  +{formatCurrency(additionalSubtotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(2)}%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Invoice Total:</span>
              <span className="text-blue-600">{formatCurrency(invoiceTotal)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createInvoice.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createInvoice.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {createInvoice.isPending ? 'Creating Invoice...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
