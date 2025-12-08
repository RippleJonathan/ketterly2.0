'use client'

import { useState, useEffect } from 'react'
import { WorkOrder, WORK_ORDER_ITEM_TYPES, COMMON_LABOR_UNITS } from '@/lib/types/work-orders'
import { useUpdateWorkOrder } from '@/lib/hooks/use-work-orders'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useTemplates } from '@/lib/hooks/use-material-templates'
import { Material, calculateMaterialQuantity, RoofMeasurements } from '@/lib/types/materials'
import { MaterialTemplate, TemplateItem } from '@/lib/types/material-templates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/formatting'
import { Trash2, Edit2, Save, X, Plus, Package, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

interface EditWorkOrderDialogProps {
  workOrder: WorkOrder | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

interface LineItemEdit {
  id?: string
  tempId: string
  item_type: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  notes: string | null
  sort_order: number
}

export function EditWorkOrderDialog({
  workOrder,
  isOpen,
  onClose,
  onUpdate,
}: EditWorkOrderDialogProps) {
  const { data: company } = useCurrentCompany()
  const supabase = createClient()
  const updateWorkOrderMutation = useUpdateWorkOrder()

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedQuantity, setEditedQuantity] = useState<number>(0)
  const [editedUnitPrice, setEditedUnitPrice] = useState<number>(0)
  const [isEditingAll, setIsEditingAll] = useState(false)
  const [lineItems, setLineItems] = useState<LineItemEdit[]>([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [subcontractors, setSubcontractors] = useState<any[]>([])
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showMaterialBrowser, setShowMaterialBrowser] = useState(false)
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false)
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [measurements, setMeasurements] = useState<RoofMeasurements | null>(null)

  const [editedDetails, setEditedDetails] = useState({
    subcontractor_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    estimated_duration_hours: '',
    job_site_address: '',
    job_site_city: '',
    job_site_state: '',
    job_site_zip: '',
    tax_rate: 0,
    requires_materials: false,
    materials_will_be_provided: true,
    special_instructions: '',
    internal_notes: '',
  })

  const [newItem, setNewItem] = useState<LineItemEdit>({
    tempId: '',
    item_type: 'labor',
    description: '',
    quantity: 1,
    unit: 'hour',
    unit_price: 0,
    line_total: 0,
    notes: null,
    sort_order: 0,
  })

  // Fetch materials and templates
  const { data: materialsResponse } = useMaterials({ 
    is_active: true,
    item_type: 'labor' // Only show labor items for work orders
  })
  const materials = materialsResponse?.data || []
  
  const { data: templatesResponse } = useTemplates({ is_active: true })
  const templates = templatesResponse?.data || []

  // Filter materials by search query
  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
    material.category.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
    material.manufacturer?.toLowerCase().includes(materialSearchQuery.toLowerCase())
  )

  // Load work order data
  useEffect(() => {
    const loadWorkOrder = async () => {
      if (!workOrder) return

      // Fetch measurements for the lead
      if (workOrder.lead_id) {
        const { data: measurementData } = await supabase
          .from('lead_measurements')
          .select('*')
          .eq('lead_id', workOrder.lead_id)
          .single()
        
        if (measurementData) {
          setMeasurements(measurementData as RoofMeasurements)
        }
      }

      // Set basic details
      setEditedDetails({
        subcontractor_id: workOrder.subcontractor_id || '',
        title: workOrder.title || '',
        description: workOrder.description || '',
        scheduled_date: workOrder.scheduled_date || '',
        estimated_duration_hours: workOrder.estimated_duration_hours?.toString() || '',
        job_site_address: workOrder.job_site_address || '',
        job_site_city: workOrder.job_site_city || '',
        job_site_state: workOrder.job_site_state || '',
        job_site_zip: workOrder.job_site_zip || '',
        tax_rate: workOrder.tax_rate || 0,
        requires_materials: workOrder.requires_materials || false,
        materials_will_be_provided: workOrder.materials_will_be_provided || true,
        special_instructions: workOrder.special_instructions || '',
        internal_notes: workOrder.internal_notes || '',
      })

      // Load line items
      const { data: items } = await supabase
        .from('work_order_line_items')
        .select('*')
        .eq('work_order_id', workOrder.id)
        .order('sort_order')

      if (items) {
        setLineItems(
          items.map((item) => ({
            id: item.id,
            tempId: `existing-${item.id}`,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            line_total: item.line_total,
            notes: item.notes,
            sort_order: item.sort_order,
          }))
        )
      }
    }

    loadWorkOrder()
  }, [workOrder, supabase])

  // Fetch subcontractors from suppliers table
  useEffect(() => {
    const fetchSubcontractors = async () => {
      if (!company?.id) return

      // Fetch from suppliers table where type is subcontractor or both
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
        .in('type', ['subcontractor', 'both'])
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name')

      if (data) {
        // Map supplier fields to match subcontractor structure
        const mappedData = data.map(supplier => ({
          id: supplier.id,
          company_id: supplier.company_id,
          company_name: supplier.name,
          contact_name: supplier.contact_name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          state: supplier.state,
          zip: supplier.zip,
          notes: supplier.notes,
          is_active: supplier.is_active,
        }))
        setSubcontractors(mappedData)
      }
    }

    fetchSubcontractors()
  }, [company?.id, supabase])

  if (!workOrder) return null

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
    const taxAmount = subtotal * editedDetails.tax_rate
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

  const handleEditItem = (item: LineItemEdit) => {
    setEditingItemId(item.tempId)
    setEditedQuantity(item.quantity)
    setEditedUnitPrice(item.unit_price)
  }

  const handleSaveItem = (tempId: string) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.tempId !== tempId) return item
        const line_total = editedQuantity * editedUnitPrice
        return {
          ...item,
          quantity: editedQuantity,
          unit_price: editedUnitPrice,
          line_total,
        }
      })
    )
    setEditingItemId(null)
    toast.success('Item updated')
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
  }

  const handleDeleteItem = (tempId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    setLineItems(lineItems.filter((item) => item.tempId !== tempId))
    toast.success('Item deleted')
  }

  const handleImportMaterial = (material: Material) => {
    const tempId = `material-${Date.now()}`
    const itemType = material.category === 'shingles' || material.category === 'underlayment' || 
                     material.category === 'flashing' || material.category === 'ventilation'
                     ? 'materials' 
                     : 'other'
    
    // Auto-calculate quantity from measurements if available
    let calculatedQuantity = 1
    let quantityNote = ''
    
    if (measurements && material.measurement_type && material.default_per_unit) {
      calculatedQuantity = calculateMaterialQuantity(
        material.measurement_type,
        material.default_per_unit,
        measurements
      )
      
      // Round to 2 decimal places
      calculatedQuantity = Math.round(calculatedQuantity * 100) / 100
      
      if (calculatedQuantity > 0) {
        quantityNote = `Auto-calculated from measurements (${material.measurement_type})`
      }
    }
    
    const quantity = calculatedQuantity > 0 ? calculatedQuantity : 1
    const newItem: LineItemEdit = {
      tempId,
      item_type: itemType,
      description: `${material.name}${material.manufacturer ? ` - ${material.manufacturer}` : ''}`,
      quantity,
      unit: material.unit,
      unit_price: material.current_cost || 0,
      line_total: quantity * (material.current_cost || 0),
      notes: [material.sku ? `SKU: ${material.sku}` : null, quantityNote].filter(Boolean).join(' | ') || null,
      sort_order: lineItems.length,
    }

    setLineItems([...lineItems, newItem])
    setShowMaterialBrowser(false)
    setMaterialSearchQuery('')
    toast.success(`Added ${material.name}${quantityNote ? ' with calculated quantity' : ''}`)
  }

  const handleImportTemplate = (template: MaterialTemplate) => {
    const templateItems = template.items || []
    const newItems: LineItemEdit[] = templateItems.map((item: TemplateItem, index) => ({
      tempId: `template-${Date.now()}-${index}`,
      item_type: 'materials',
      description: item.description || item.item,
      quantity: item.per_square || 1,
      unit: item.unit || 'each',
      unit_price: 0, // User needs to fill in price
      line_total: 0,
      notes: `From template: ${template.name}`,
      sort_order: lineItems.length + index,
    }))

    setLineItems([...lineItems, ...newItems])
    setShowTemplateBrowser(false)
    toast.success(`Added ${newItems.length} items from ${template.name}`)
  }

  const handleAddItem = () => {
    if (!newItem.description || newItem.quantity <= 0) {
      toast.error('Please provide description and quantity')
      return
    }

    const tempId = `new-${Date.now()}`
    const line_total = newItem.quantity * newItem.unit_price

    setLineItems([
      ...lineItems,
      {
        ...newItem,
        tempId,
        line_total,
        sort_order: lineItems.length,
      },
    ])

    setNewItem({
      tempId: '',
      item_type: 'labor',
      description: '',
      quantity: 1,
      unit: 'hour',
      unit_price: 0,
      line_total: 0,
      notes: null,
      sort_order: 0,
    })
    setShowAddItem(false)
    toast.success('Item added')
  }

  const handleSaveAll = async () => {
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }

    setIsSaving(true)

    try {
      // Get selected subcontractor details
      const selectedSubcontractor = subcontractors.find(
        (s) => s.id === editedDetails.subcontractor_id
      )

      // Update work order details
      const updates = {
        subcontractor_id: editedDetails.subcontractor_id || null,
        subcontractor_name: selectedSubcontractor?.company_name || null,
        subcontractor_email: selectedSubcontractor?.email || null,
        subcontractor_phone: selectedSubcontractor?.phone || null,
        title: editedDetails.title,
        description: editedDetails.description || null,
        scheduled_date: editedDetails.scheduled_date || null,
        estimated_duration_hours: editedDetails.estimated_duration_hours
          ? parseFloat(editedDetails.estimated_duration_hours)
          : null,
        job_site_address: editedDetails.job_site_address,
        job_site_city: editedDetails.job_site_city || null,
        job_site_state: editedDetails.job_site_state || null,
        job_site_zip: editedDetails.job_site_zip || null,
        labor_cost: totals.laborTotal,
        materials_cost: totals.materialsTotal,
        equipment_cost: totals.equipmentTotal,
        other_costs: totals.otherTotal,
        subtotal: totals.subtotal,
        tax_rate: editedDetails.tax_rate,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        requires_materials: editedDetails.requires_materials,
        materials_will_be_provided: editedDetails.materials_will_be_provided,
        special_instructions: editedDetails.special_instructions || null,
        internal_notes: editedDetails.internal_notes || null,
      }

      const result = await updateWorkOrderMutation.mutateAsync({
        workOrderId: workOrder.id,
        updates: {
          ...updates,
          id: workOrder.id,
        },
      })

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update work order')
      }

      // Delete all existing line items
      await supabase
        .from('work_order_line_items')
        .delete()
        .eq('work_order_id', workOrder.id)

      // Insert updated line items
      const itemsToInsert = lineItems.map((item, index) => ({
        work_order_id: workOrder.id,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        notes: item.notes,
        sort_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('work_order_line_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast.success('Work order updated successfully')
      onUpdate?.()
      onClose()
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Work Order - {workOrder.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Work Order Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Work Order Details</h3>
                <Badge>{workOrder.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editedDetails.title}
                    onChange={(e) =>
                      setEditedDetails({ ...editedDetails, title: e.target.value })
                    }
                    placeholder="e.g., Roof Tear-off"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subcontractor (Optional)</Label>
                  <Select
                    value={editedDetails.subcontractor_id}
                    onValueChange={(value) =>
                      setEditedDetails({ ...editedDetails, subcontractor_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcontractor or leave empty..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subcontractors.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editedDetails.subcontractor_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditedDetails({ ...editedDetails, subcontractor_id: '' })
                      }
                    >
                      Clear (Internal Work)
                    </Button>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editedDetails.description}
                    onChange={(e) =>
                      setEditedDetails({ ...editedDetails, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={editedDetails.scheduled_date}
                    onChange={(e) =>
                      setEditedDetails({
                        ...editedDetails,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editedDetails.estimated_duration_hours}
                    onChange={(e) =>
                      setEditedDetails({
                        ...editedDetails,
                        estimated_duration_hours: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editedDetails.tax_rate * 100).toFixed(2)}
                    onChange={(e) =>
                      setEditedDetails({
                        ...editedDetails,
                        tax_rate: parseFloat(e.target.value) / 100 || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Line Items</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMaterialBrowser(true)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    From Materials
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTemplateBrowser(true)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    From Template
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddItem(true)}
                    disabled={showAddItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              {showAddItem && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <h4 className="font-medium text-sm">New Line Item</h4>
                  <div className="grid grid-cols-6 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={newItem.item_type}
                        onValueChange={(value) =>
                          setNewItem({ ...newItem, item_type: value })
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

                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={newItem.description}
                        onChange={(e) =>
                          setNewItem({ ...newItem, description: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={newItem.unit}
                        onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
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

                    <div className="space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            unit_price: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddItem}>
                      <Save className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddItem(false)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.tempId}>
                        <TableCell className="capitalize">{item.item_type}</TableCell>
                        <TableCell>
                          {editingItemId === item.tempId ? (
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                setLineItems(
                                  lineItems.map((li) =>
                                    li.tempId === item.tempId
                                      ? { ...li, description: e.target.value }
                                      : li
                                  )
                                )
                              }}
                              className="h-8"
                            />
                          ) : (
                            item.description
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.tempId ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editedQuantity}
                              onChange={(e) =>
                                setEditedQuantity(parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-20"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">
                          {editingItemId === item.tempId ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editedUnitPrice}
                              onChange={(e) =>
                                setEditedUnitPrice(parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-24"
                            />
                          ) : (
                            formatCurrency(item.unit_price)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {editingItemId === item.tempId
                            ? formatCurrency(editedQuantity * editedUnitPrice)
                            : formatCurrency(item.line_total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingItemId === item.tempId ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveItem(item.tempId)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item.tempId)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {lineItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No line items yet. Add your first item above.
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Labor:</span>
                  <span>{formatCurrency(totals.laborTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Materials:</span>
                  <span>{formatCurrency(totals.materialsTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Equipment:</span>
                  <span>{formatCurrency(totals.equipmentTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Other:</span>
                  <span>{formatCurrency(totals.otherTotal)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({(editedDetails.tax_rate * 100).toFixed(2)}%):</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={editedDetails.special_instructions}
                onChange={(e) =>
                  setEditedDetails({
                    ...editedDetails,
                    special_instructions: e.target.value,
                  })
                }
                rows={2}
              />
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={editedDetails.internal_notes}
                onChange={(e) =>
                  setEditedDetails({
                    ...editedDetails,
                    internal_notes: e.target.value,
                  })
                }
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>

      {/* Material Browser Dialog */}
      <Dialog open={showMaterialBrowser} onOpenChange={setShowMaterialBrowser}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Browse Materials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials by name, category, or manufacturer..."
                value={materialSearchQuery}
                onChange={(e) => setMaterialSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No materials found
                  </div>
                ) : (
                  filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleImportMaterial(material)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {material.manufacturer && `${material.manufacturer} • `}
                          {material.category} • {material.unit}
                          {material.sku && ` • SKU: ${material.sku}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {material.current_cost
                            ? formatCurrency(material.current_cost)
                            : 'No price'}
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {material.category}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Browser Dialog */}
      <Dialog open={showTemplateBrowser} onOpenChange={setShowTemplateBrowser}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import from Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleImportTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {template.items.length} items
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
