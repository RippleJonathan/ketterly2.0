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
import { Plus, Trash2, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatting'
import { InvoiceStatus } from '@/lib/types/invoices'

interface EditInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  onSuccess?: () => void
}

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  source_type: 'contract' | 'change_order' | 'additional'
  source_id: string | null
  category: string | null
  notes: string | null
  sort_order: number
}

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess
}: EditInvoiceDialogProps) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch invoice with line items
  const { data: invoice } = useQuery({
    queryKey: ['invoice-edit', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_invoices')
        .select(`
          *,
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoiceId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: open && !!invoiceId
  })

  // Fetch materials for adding items with location-specific pricing
  const { data: materials } = useQuery({
    queryKey: ['materials-with-pricing', invoice?.lead_id],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []

      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single()

      if (!user) return []

      // Get lead location for pricing
      let leadLocationId: string | null = null
      if (invoice?.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('location_id')
          .eq('id', invoice.lead_id)
          .single()
        
        leadLocationId = lead?.location_id || null
      }

      // Fetch materials
      const { data: materialsData, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      
      if (error) throw error
      if (!materialsData) return []

      // Get location-specific pricing if we have a location
      if (leadLocationId) {
        const { data: locationPricing } = await supabase
          .from('location_material_pricing')
          .select('material_id, cost')
          .eq('location_id', leadLocationId)

        // Merge location pricing with materials
        const pricingMap = new Map(locationPricing?.map(p => [p.material_id, p.cost]) || [])
        
        return materialsData.map(material => ({
          ...material,
          // Use location price if available, otherwise use material's unit_price or current_cost
          unit_price: pricingMap.get(material.id) ?? material.unit_price ?? material.current_cost ?? 0
        }))
      }

      return materialsData
    },
    enabled: open && !!invoice
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('draft')

  // Initialize form when invoice loads
  useEffect(() => {
    if (invoice) {
      setLineItems(invoice.line_items?.map((item: any, index: number) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'ea',
        unit_price: item.unit_price,
        source_type: item.source_type,
        source_id: item.source_id,
        category: item.category,
        notes: item.notes,
        sort_order: index
      })) || [])
      setDueDate(invoice.due_date?.split('T')[0] || '')
      setPaymentTerms(invoice.payment_terms || 'Net 30')
      setNotes(invoice.notes || '')
      setStatus(invoice.status)
    }
  }, [invoice])

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const price = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price as any) || 0
    return sum + (item.quantity * price)
  }, 0)
  const taxRate = invoice?.tax_rate || 0
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit: 'ea',
        unit_price: '' as any, // Empty string allows typing negative numbers directly
        source_type: 'additional',
        source_id: null,
        category: null,
        notes: null,
        sort_order: lineItems.length
      }
    ])
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  // Select material for line item
  const selectMaterial = (index: number, materialId: string) => {
    const material = materials?.find(m => m.id === materialId)
    if (!material) return

    const updated = [...lineItems]
    updated[index] = {
      ...updated[index],
      description: material.name,
      unit: material.unit || 'ea',
      unit_price: material.unit_price || 0,
      category: material.category || null
    }
    setLineItems(updated)
    toast.success(`Added ${material.name}`)
  }

  // Save changes
  const saveInvoice = useMutation({
    mutationFn: async () => {
      // 1. Update invoice metadata
      const { error: invoiceError } = await supabase
        .from('customer_invoices')
        .update({
          due_date: dueDate || null,
          payment_terms: paymentTerms,
          notes: notes || null,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      console.log('Updating invoice with status:', status)

      if (invoiceError) throw invoiceError

      // 2. Delete existing line items
      const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId)

      if (deleteError) throw deleteError

      // 3. Insert updated line items
      const itemsToInsert = lineItems
        .filter(item => item.description.trim())
        .map((item, index) => ({
          invoice_id: invoiceId,
          company_id: invoice.company_id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          source_type: item.source_type,
          source_id: item.source_id,
          category: item.category,
          notes: item.notes,
          sort_order: index
        }))

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('invoice_line_items')
          .insert(itemsToInsert)

        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-edit', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
      toast.success('Invoice updated successfully')
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (lineItems.filter(item => item.description.trim()).length === 0) {
      toast.error('Invoice must have at least one line item')
      return
    }

    if (lineItems.some(item => item.description.trim() && item.quantity <= 0)) {
      toast.error('Invalid quantity in line items - must be greater than 0')
      return
    }

    saveInvoice.mutate()
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice - {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Update invoice details and line items. Changes will recalculate totals automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Metadata */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid in Full</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
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

          {/* Line Items */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Line Items</Label>
            </div>

            {lineItems.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500">
                <p className="text-sm">No line items</p>
                <p className="text-xs mt-1">Click "Add Item" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-white">
                    {/* Material Selector */}
                    {item.source_type === 'additional' && materials && materials.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <Label className="text-xs text-blue-900 mb-2 flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          Add from Materials Database (Optional)
                        </Label>
                        <Select onValueChange={(value) => selectMaterial(index, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a material..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {materials.map((material) => {
                              const price = material.unit_price ?? 0
                              const unitLabel = material.unit ? ` per ${material.unit}` : ''
                              const priceDisplay = price > 0 ? formatCurrency(price) : '⚠️ No price'
                              return (
                                <SelectItem key={material.id} value={material.id}>
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span className="flex-1 truncate">{material.name}</span>
                                    <span className={price > 0 ? "text-gray-600 text-sm" : "text-orange-600 text-sm font-medium"}>
                                      {priceDisplay}{unitLabel}
                                    </span>
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Source Type Badge */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        {item.source_type === 'contract' && (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                            Contract Item
                          </span>
                        )}
                        {item.source_type === 'change_order' && (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                            Change Order Item
                          </span>
                        )}
                        {item.source_type === 'additional' && (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">
                            Additional Item
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Line Item Fields */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-5 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
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
                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                            value={item.unit_price === '' ? '' : item.unit_price}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '' || val === '-') {
                                updateLineItem(index, 'unit_price', val as any)
                              } else {
                                updateLineItem(index, 'unit_price', parseFloat(val) || 0)
                              }
                            }}
                            placeholder="Use negative for discounts"
                          />
                        </div>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Total</Label>
                        <div className="h-10 flex items-center font-semibold">
                          {formatCurrency(item.quantity * (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price as any) || 0))}
                        </div>
                      </div>
                    </div>

                    {/* Optional Fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Category (Optional)</Label>
                        <Input
                          value={item.category || ''}
                          onChange={(e) => updateLineItem(index, 'category', e.target.value || null)}
                          placeholder="e.g., Materials, Labor"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (Optional)</Label>
                        <Input
                          value={item.notes || ''}
                          onChange={(e) => updateLineItem(index, 'notes', e.target.value || null)}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Item Button */}
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={addLineItem} className="w-full max-w-md">
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {/* Invoice Notes */}
          <div>
            <Label htmlFor="invoice-notes">Invoice Notes (Optional)</Label>
            <Textarea
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions, thank you message, etc."
              rows={3}
            />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(2)}%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Invoice Total:</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saveInvoice.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveInvoice.isPending}
            >
              {saveInvoice.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
