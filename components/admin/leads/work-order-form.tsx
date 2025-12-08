// Work Order Form Component
// Mirrors material-order-form.tsx for subcontractor labor work orders

'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  WorkOrderInsert,
  WorkOrderLineItemInsert,
  Subcontractor,
  WORK_ORDER_ITEM_TYPES,
  COMMON_LABOR_UNITS,
} from '@/lib/types/work-orders'
import { MaterialTemplate } from '@/lib/types/material-templates'
import { getTemplates } from '@/lib/api/material-templates'
import { MaterialOrder } from '@/lib/types/material-orders'
import { getMaterialOrders } from '@/lib/api/material-orders'
import { useCreateWorkOrder, useUpdateWorkOrder } from '@/lib/hooks/use-work-orders'
import { WorkOrder } from '@/lib/types/work-orders'

interface WorkOrderFormProps {
  companyId: string
  leadId?: string
  jobSiteAddress?: string
  defaultTaxRate?: number
  workOrder?: WorkOrder // For edit mode
  onSuccess?: (workOrderId: string) => void
  onCancel?: () => void
}

interface LineItemForm extends Omit<WorkOrderLineItemInsert, 'work_order_id'> {
  tempId: string
}

export function WorkOrderForm({
  companyId,
  leadId,
  jobSiteAddress,
  defaultTaxRate = 0,
  workOrder,
  onSuccess,
  onCancel,
}: WorkOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [templates, setTemplates] = useState<MaterialTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([])
  const [selectedMaterialOrderId, setSelectedMaterialOrderId] = useState('')
  const supabase = createClient()
  const createWorkOrderMutation = useCreateWorkOrder()
  const updateWorkOrderMutation = useUpdateWorkOrder()
  const isEditMode = !!workOrder

  // Form state
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [jobAddress, setJobAddress] = useState(jobSiteAddress || '')
  const [jobCity, setJobCity] = useState('')
  const [jobState, setJobState] = useState('')
  const [jobZip, setJobZip] = useState('')
  const [requiresMaterials, setRequiresMaterials] = useState(false)
  const [materialsProvided, setMaterialsProvided] = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [taxRate, setTaxRate] = useState(defaultTaxRate)
  const [lineItems, setLineItems] = useState<LineItemForm[]>([])

  // Fetch subcontractors, templates, and material orders
  useEffect(() => {
    fetchSubcontractors()
    fetchTemplates()
    if (leadId) {
      fetchMaterialOrders()
    }
    if (isEditMode && workOrder) {
      populateFormFromWorkOrder()
    }
  }, [])

  const populateFormFromWorkOrder = async () => {
    if (!workOrder) return

    setSelectedSubcontractorId(workOrder.subcontractor_id || '')
    setTitle(workOrder.title)
    setDescription(workOrder.description || '')
    setScheduledDate(workOrder.scheduled_date || '')
    setEstimatedHours(workOrder.estimated_duration_hours?.toString() || '')
    setJobAddress(workOrder.job_site_address || '')
    setJobCity(workOrder.job_site_city || '')
    setJobState(workOrder.job_site_state || '')
    setJobZip(workOrder.job_site_zip || '')
    setRequiresMaterials(workOrder.requires_materials || false)
    setMaterialsProvided(workOrder.materials_will_be_provided || true)
    setSpecialInstructions(workOrder.special_instructions || '')
    setInternalNotes(workOrder.internal_notes || '')
    setTaxRate(workOrder.tax_rate || 0)

    // Load line items
    const { data: items } = await supabase
      .from('work_order_line_items')
      .select('*')
      .eq('work_order_id', workOrder.id)
      .order('sort_order')

    if (items) {
      setLineItems(
        items.map((item, index) => ({
          tempId: `existing-${item.id}`,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes || null,
          sort_order: index,
        }))
      )
    }
  }

  const fetchSubcontractors = async () => {
    const { data } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('company_name')

    setSubcontractors(data || [])
  }

  const fetchTemplates = async () => {
    const { data } = await getTemplates(companyId, { is_active: true })
    setTemplates(data || [])
  }

  const fetchMaterialOrders = async () => {
    const { data } = await getMaterialOrders(companyId, { lead_id: leadId })
    setMaterialOrders(data || [])
  }

  // Get selected subcontractor details
  const selectedSubcontractor = subcontractors.find((s) => s.id === selectedSubcontractorId)

  // Import template items
  const importTemplate = () => {
    if (!selectedTemplateId) return

    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template || !template.items) return

    const newLineItems: LineItemForm[] = template.items.map((item, index) => ({
      tempId: `temp-${Date.now()}-${index}`,
      item_type: 'labor', // Convert template items to labor type
      description: `${item.item} - ${item.description}`,
      quantity: 1,
      unit: item.unit || 'each',
      unit_price: 0, // Price needs to be set manually
      line_total: 0,
      sort_order: lineItems.length + index,
    }))

    setLineItems([...lineItems, ...newLineItems])
    setSelectedTemplateId('') // Reset template selector
    toast.success(`Added ${newLineItems.length} items from template`)
  }

  // Import material order items
  const importMaterialOrder = async () => {
    if (!selectedMaterialOrderId) return

    const materialOrder = materialOrders.find((mo) => mo.id === selectedMaterialOrderId)
    if (!materialOrder) return

    // Fetch material order line items
    const { data: moItems } = await supabase
      .from('material_order_line_items')
      .select('*')
      .eq('material_order_id', selectedMaterialOrderId)
      .order('sort_order')

    if (!moItems || moItems.length === 0) {
      toast.error('No items found in material order')
      return
    }

    const newLineItems: LineItemForm[] = moItems.map((item, index) => ({
      tempId: `temp-${Date.now()}-${index}`,
      item_type: 'materials', // Keep as materials type
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      line_total: item.line_total,
      notes: item.notes,
      sort_order: lineItems.length + index,
    }))

    setLineItems([...lineItems, ...newLineItems])
    setSelectedMaterialOrderId('') // Reset selector
    toast.success(`Added ${newLineItems.length} items from material order`)
  }

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        tempId: `temp-${Date.now()}`,
        item_type: 'labor',
        description: '',
        quantity: 1,
        unit: 'hour',
        unit_price: 0,
        line_total: 0,
        sort_order: lineItems.length,
      },
    ])
  }

  // Remove line item
  const removeLineItem = (tempId: string) => {
    setLineItems(lineItems.filter((item) => item.tempId !== tempId))
  }

  // Update line item
  const updateLineItem = (tempId: string, updates: Partial<LineItemForm>) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.tempId !== tempId) return item

        const updated = { ...item, ...updates }

        // Recalculate line total if quantity or price changed
        if ('quantity' in updates || 'unit_price' in updates) {
          updated.line_total = updated.quantity * updated.unit_price
        }

        return updated
      })
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    const laborTotal = lineItems
      .filter((item) => item.item_type === 'labor')
      .reduce((sum, item) => sum + item.line_total, 0)

    const materialsTotal = lineItems
      .filter((item) => item.item_type === 'materials')
      .reduce((sum, item) => sum + item.line_total, 0)

    const equipmentTotal = lineItems
      .filter((item) => item.item_type === 'equipment')
      .reduce((sum, item) => sum + item.line_total, 0)

    const otherTotal = lineItems
      .filter((item) => item.item_type === 'other')
      .reduce((sum, item) => sum + item.line_total, 0)

    const subtotal = laborTotal + materialsTotal + equipmentTotal + otherTotal
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    return {
      laborTotal,
      materialsTotal,
      equipmentTotal,
      otherTotal,
      subtotal,
      taxAmount,
      total,
    }
  }

  const totals = calculateTotals()

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }

    setLoading(true)

    try {
      if (isEditMode && workOrder) {
        // UPDATE MODE
        const updates = {
          subcontractor_id: selectedSubcontractor?.id || null,
          subcontractor_name: selectedSubcontractor?.company_name || null,
          subcontractor_email: selectedSubcontractor?.email || null,
          subcontractor_phone: selectedSubcontractor?.phone || null,
          title,
          description: description || null,
          scheduled_date: scheduledDate || null,
          estimated_duration_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          job_site_address: jobAddress,
          job_site_city: jobCity || null,
          job_site_state: jobState || null,
          job_site_zip: jobZip || null,
          labor_cost: totals.laborTotal,
          materials_cost: totals.materialsTotal,
          equipment_cost: totals.equipmentTotal,
          other_costs: totals.otherTotal,
          subtotal: totals.subtotal,
          tax_rate: taxRate,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          requires_materials: requiresMaterials,
          materials_will_be_provided: materialsProvided,
          special_instructions: specialInstructions || null,
          internal_notes: internalNotes || null,
        }

        const result = await updateWorkOrderMutation.mutateAsync({
          workOrderId: workOrder.id,
          updates,
        })

        if (result.error) {
          throw new Error(result.error)
        }

        // Update line items - delete existing and insert new
        await supabase
          .from('work_order_line_items')
          .delete()
          .eq('work_order_id', workOrder.id)

        const lineItemsDataWithOrderId: WorkOrderLineItemInsert[] = lineItems.map((item) => ({
          work_order_id: workOrder.id,
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
          sort_order: item.sort_order,
        }))

        const { error: lineItemsError } = await supabase
          .from('work_order_line_items')
          .insert(lineItemsDataWithOrderId)

        if (lineItemsError) throw lineItemsError

        onSuccess?.(workOrder.id)
      } else {
        // CREATE MODE
        // Prepare line items (without work_order_id, will be added by API)
        const lineItemsData: Omit<WorkOrderLineItemInsert, 'work_order_id'>[] = lineItems.map((item) => ({
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
          sort_order: item.sort_order,
        }))

        // Create work order with line items
        const workOrderData: WorkOrderInsert = {
          company_id: companyId,
          lead_id: leadId || null,
          subcontractor_id: selectedSubcontractor?.id || null,
          subcontractor_name: selectedSubcontractor?.company_name || null,
          subcontractor_email: selectedSubcontractor?.email || null,
          subcontractor_phone: selectedSubcontractor?.phone || null,
          title,
          description: description || null,
          scheduled_date: scheduledDate || null,
          estimated_duration_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          job_site_address: jobAddress,
          job_site_city: jobCity || null,
          job_site_state: jobState || null,
          job_site_zip: jobZip || null,
          labor_cost: totals.laborTotal,
          materials_cost: totals.materialsTotal,
          equipment_cost: totals.equipmentTotal,
          other_costs: totals.otherTotal,
          subtotal: totals.subtotal,
          tax_rate: taxRate,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          requires_materials: requiresMaterials,
          materials_will_be_provided: materialsProvided,
          special_instructions: specialInstructions || null,
          internal_notes: internalNotes || null,
          status: 'draft',
        }

        const result = await createWorkOrderMutation.mutateAsync(workOrderData)

        if (result.error || !result.data) {
          throw new Error(result.error || 'Failed to create work order')
        }

        const newWorkOrder = result.data

        // Create line items
        const lineItemsDataWithOrderId: WorkOrderLineItemInsert[] = lineItemsData.map((item) => ({
          ...item,
          work_order_id: newWorkOrder.id,
        }))

        const { error: lineItemsError } = await supabase
          .from('work_order_line_items')
          .insert(lineItemsDataWithOrderId)

        if (lineItemsError) throw lineItemsError

        // Success toast is handled by the mutation hook
        onSuccess?.(newWorkOrder.id)
      }
    } catch (error: any) {
      // Error toast is handled by the mutation hook
      console.error('Work order creation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subcontractor Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subcontractor">Subcontractor (Optional)</Label>
          {selectedSubcontractorId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSubcontractorId('')}
              className="h-auto py-0 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
        <Select
          value={selectedSubcontractorId}
          onValueChange={setSelectedSubcontractorId}
        >
          <SelectTrigger>
            <SelectValue placeholder="None - Internal Work" />
          </SelectTrigger>
          <SelectContent>
            {subcontractors.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.company_name}
                {sub.trade_specialties && sub.trade_specialties.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({sub.trade_specialties.join(', ')})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Order Details */}
      <div className="space-y-2">
        <Label htmlFor="title">Work Order Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Roof Tear-off and Disposal"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed scope of work..."
          rows={3}
        />
      </div>

      {/* Scheduling */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Scheduled Date</Label>
          <Input
            id="scheduled_date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Estimated Duration (hours)</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="8.0"
          />
        </div>
      </div>

      {/* Job Site Address */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold">Job Site Location</h3>
        <div className="space-y-2">
          <Label htmlFor="job_address">Address *</Label>
          <Input
            id="job_address"
            value={jobAddress}
            onChange={(e) => setJobAddress(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="job_city">City</Label>
            <Input
              id="job_city"
              value={jobCity}
              onChange={(e) => setJobCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_state">State</Label>
            <Input
              id="job_state"
              value={jobState}
              onChange={(e) => setJobState(e.target.value)}
              maxLength={2}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_zip">ZIP Code</Label>
          <Input
            id="job_zip"
            value={jobZip}
            onChange={(e) => setJobZip(e.target.value)}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Line Items</h3>
          <div className="flex gap-2">
            {/* Material Order Import */}
            {materialOrders.length > 0 && (
              <div className="flex gap-2 items-center">
                <Select value={selectedMaterialOrderId} onValueChange={setSelectedMaterialOrderId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Import from material order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOrders.map((mo) => (
                      <SelectItem key={mo.id} value={mo.id}>
                        {mo.title} - ${mo.total_amount.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={importMaterialOrder}
                  disabled={!selectedMaterialOrderId}
                >
                  Import
                </Button>
              </div>
            )}
            {/* Template Import */}
            <div className="flex gap-2 items-center">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Import from template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={importTemplate}
                disabled={!selectedTemplateId}
              >
                Import
              </Button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground mb-2">No items added yet</p>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={item.tempId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">Item #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.tempId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={item.item_type}
                      onValueChange={(value: any) =>
                        updateLineItem(item.tempId, { item_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_ORDER_ITEM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => updateLineItem(item.tempId, { unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_LABOR_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(item.tempId, { description: e.target.value })
                    }
                    placeholder="Description of work..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateLineItem(item.tempId, {
                          unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line Total</Label>
                    <Input value={`$${item.line_total.toFixed(2)}`} disabled />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials Handling */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="requires_materials">Requires Materials</Label>
          <Switch
            id="requires_materials"
            checked={requiresMaterials}
            onCheckedChange={setRequiresMaterials}
          />
        </div>
        {requiresMaterials && (
          <div className="flex items-center justify-between ml-4">
            <Label htmlFor="materials_provided">Materials Provided by Company</Label>
            <Switch
              id="materials_provided"
              checked={materialsProvided}
              onCheckedChange={setMaterialsProvided}
            />
          </div>
        )}
      </div>

      {/* Tax Rate */}
      <div className="space-y-2">
        <Label htmlFor="tax_rate">Tax Rate (%)</Label>
        <Input
          id="tax_rate"
          type="number"
          step="0.0001"
          value={taxRate * 100}
          onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
        />
      </div>

      {/* Totals */}
      <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
        <div className="flex justify-between text-sm">
          <span>Labor:</span>
          <span>${totals.laborTotal.toFixed(2)}</span>
        </div>
        {totals.materialsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>Materials:</span>
            <span>${totals.materialsTotal.toFixed(2)}</span>
          </div>
        )}
        {totals.equipmentTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>Equipment:</span>
            <span>${totals.equipmentTotal.toFixed(2)}</span>
          </div>
        )}
        {totals.otherTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>Other:</span>
            <span>${totals.otherTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium border-t pt-2">
          <span>Subtotal:</span>
          <span>${totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
          <span>${totals.taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total:</span>
          <span>${totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="special_instructions">Special Instructions</Label>
        <Textarea
          id="special_instructions"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="Safety requirements, access instructions, etc."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="internal_notes">Internal Notes</Label>
        <Textarea
          id="internal_notes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Notes for internal use only..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Work Order'}
        </Button>
      </div>
    </form>
  )
}
