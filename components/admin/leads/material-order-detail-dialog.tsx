'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaterialOrder, MaterialOrderItem } from '@/lib/types/material-orders'
import { Supplier } from '@/lib/types/suppliers'
import { Material } from '@/lib/types/materials'
import { MaterialVariant, getVariantPrice } from '@/lib/types/material-variants'
import { formatCurrency } from '@/lib/utils/formatting'
import { Calendar, Package, User, FileText, Truck, Edit2, Trash2, Plus, Save, X, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { updateMaterialOrder, addMaterialOrderItem, updateMaterialOrderItem, deleteMaterialOrderItem } from '@/lib/api/material-orders'
import { getSuppliers } from '@/lib/api/suppliers'
import { getMaterials } from '@/lib/api/materials'
import { getMaterialVariants } from '@/lib/api/material-variants'
import { useCreateEventFromMaterialOrder, useCreateEventFromLaborOrder, useUpdateMaterialOrderDate, useUpdateWorkOrderDate } from '@/lib/hooks/use-calendar'
import { toast } from 'sonner'

interface MaterialOrderDetailDialogProps {
  order: MaterialOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function MaterialOrderDetailDialog({
  order,
  open,
  onOpenChange,
  onUpdate,
}: MaterialOrderDetailDialogProps) {
  const { data: company } = useCurrentCompany()
  const createMaterialEvent = useCreateEventFromMaterialOrder()
  const createLaborEvent = useCreateEventFromLaborOrder()
  const updateMaterialDate = useUpdateMaterialOrderDate()
  const updateWorkDate = useUpdateWorkOrderDate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [addingNewItem, setAddingNewItem] = useState(false)
  const [editAllMode, setEditAllMode] = useState(false)
  
  // Form states
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [orderDate, setOrderDate] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [previousDeliveryDate, setPreviousDeliveryDate] = useState('') // Track previous value
  const [notes, setNotes] = useState('')
  
  // Data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
  
  // Variant states
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [materialVariants, setMaterialVariants] = useState<MaterialVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<MaterialVariant | null>(null)
  const [editingVariants, setEditingVariants] = useState<MaterialVariant[]>([])
  const [editingVariant, setEditingVariant] = useState<MaterialVariant | null>(null)
  
  // Edit All mode state - track all item edits
  const [editAllItems, setEditAllItems] = useState<Record<string, Partial<MaterialOrderItem>>>({})
  
  // New item form
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit: 'ea',
    estimated_unit_cost: 0,
  })
  
  // Editing item form
  const [editItem, setEditItem] = useState({
    description: '',
    quantity: 1,
    unit: 'ea',
    estimated_unit_cost: 0,
  })

  if (!order) return null

  const isWorkOrder = order.order_type === 'work'

  // Load suppliers and materials when company is available
  useEffect(() => {
    if (!company?.id || !open) return
    
    const loadData = async () => {
      // Load suppliers filtered by type
      const supplierType = isWorkOrder ? 'subcontractor' : 'material_supplier'
      const { data: suppliersData } = await getSuppliers(company.id, { 
        type: supplierType,
        is_active: true 
      })
      if (suppliersData) setSuppliers(suppliersData)
      
      // Load materials for all orders (useful for searching)
      const { data: materialsData } = await getMaterials(company.id, { is_active: true })
      if (materialsData) setMaterials(materialsData)
    }
    
    loadData()
  }, [company?.id, isWorkOrder, open])

  // Initialize form when order changes or editing starts
  const handleStartEdit = () => {
    setSupplierId(order.supplier_id || null)
    setOrderDate(order.order_date || new Date().toISOString().split('T')[0])
    setExpectedDeliveryDate(order.expected_delivery_date || '')
    setPreviousDeliveryDate(order.expected_delivery_date || '') // Save initial value
    setNotes(order.notes || '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingItemId(null)
    setAddingNewItem(false)
    setEditAllMode(false)
  }

  const handleSaveOrder = async () => {
    if (!company) return
    
    setIsSaving(true)
    try {
      const { error } = await updateMaterialOrder(company.id, order.id, {
        supplier_id: supplierId,
        order_date: orderDate || null,
        expected_delivery_date: expectedDeliveryDate || null,
        notes: notes || null,
      })

      if (error) throw new Error(error.message)
      
      toast.success('Order updated successfully')
      
      // Handle bidirectional date sync with calendar
      const dateChanged = previousDeliveryDate !== expectedDeliveryDate
      
      if (dateChanged) {
        try {
          if (order.order_type === 'material') {
            // Sync material order date to calendar (creates/updates/deletes event)
            await updateMaterialDate.mutateAsync({
              materialOrderId: order.id,
              deliveryDate: expectedDeliveryDate || null,
            })
          } else if (order.order_type === 'work') {
            // Sync work order date to calendar (creates/updates/deletes event)
            await updateWorkDate.mutateAsync({
              laborOrderId: order.id,
              scheduledDate: expectedDeliveryDate || null,
            })
          }
        } catch (eventError: any) {
          console.error('Failed to sync calendar event:', eventError)
          toast.warning('Order updated but calendar event could not be synced')
        }
      }
      
      setIsEditing(false)
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to update order: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle material search and selection
  const handleMaterialSearch = (searchTerm: string) => {
    setNewItem({ ...newItem, description: searchTerm })
    
    if (searchTerm.length < 2) {
      setFilteredMaterials([])
      return
    }
    
    const filtered = materials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.product_line?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredMaterials(filtered)
  }

  const handleSelectMaterial = async (material: Material) => {
    setSelectedMaterial(material)
    setNewItem({
      description: material.name,
      quantity: 1,
      unit: material.unit || 'ea',
      estimated_unit_cost: material.current_cost || 0,
    })
    setFilteredMaterials([])

    // Load variants for this material
    if (company?.id) {
      const result = await getMaterialVariants(company.id, material.id)
      if (result.data) {
        setMaterialVariants(result.data)
        
        // Auto-select default variant if exists
        const defaultVariant = result.data.find((v: MaterialVariant) => v.is_default)
        if (defaultVariant) {
          handleSelectVariant(defaultVariant, material.current_cost || 0)
        }
      }
    }
  }

  const handleSelectVariant = (variant: MaterialVariant, baseCost: number) => {
    setSelectedVariant(variant)
    const variantPrice = getVariantPrice(baseCost, variant)
    setNewItem(prev => ({
      ...prev,
      estimated_unit_cost: variantPrice,
    }))
  }

  const handleAddItem = async () => {
    if (!newItem.description.trim()) {
      toast.error('Please enter an item description')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await addMaterialOrderItem(order.id, {
        description: newItem.description,
        quantity: newItem.quantity,
        unit: newItem.unit,
        estimated_unit_cost: newItem.estimated_unit_cost,
        material_id: selectedMaterial?.id || null,
        variant_id: selectedVariant?.id || null,
        variant_name: selectedVariant?.variant_name || null,
      })

      if (error) throw new Error(error.message)
      
      toast.success('Item added successfully')
      setAddingNewItem(false)
      setNewItem({ description: '', quantity: 1, unit: 'ea', estimated_unit_cost: 0 })
      setSelectedMaterial(null)
      setMaterialVariants([])
      setSelectedVariant(null)
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to add item: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEditItem = async (item: MaterialOrderItem) => {
    setEditingItemId(item.id)
    setEditItem({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimated_unit_cost: item.estimated_unit_cost || 0,
    })
    
    // Try to load variants if this item matches a material
    if (company?.id && item.description) {
      const { data: materialsData } = await getMaterials(company.id)
      if (materialsData) {
        const matchedMaterial = materialsData.find(m => m.name === item.description)
        if (matchedMaterial) {
          const result = await getMaterialVariants(company.id, matchedMaterial.id)
          if (result.data && result.data.length > 0) {
            setEditingVariants(result.data)
            setSelectedMaterial(matchedMaterial)
          }
        }
      }
    }
  }

  const handleSaveItem = async (itemId: string) => {
    setIsSaving(true)
    try {
      const { error } = await updateMaterialOrderItem(itemId, {
        description: editItem.description,
        quantity: editItem.quantity,
        unit: editItem.unit,
        estimated_unit_cost: editItem.estimated_unit_cost,
        material_id: selectedMaterial?.id || null,
        variant_id: editingVariant?.id || null,
        variant_name: editingVariant?.variant_name || null,
      })

      if (error) throw new Error(error.message)
      
      toast.success('Item updated successfully')
      setEditingItemId(null)
      setEditingVariants([])
      setEditingVariant(null)
      setSelectedMaterial(null)
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to update item: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // For Edit All mode - track changes locally
  const handleUpdateItemInline = (itemId: string, updates: Partial<MaterialOrderItem>) => {
    setEditAllItems(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), ...updates }
    }))
  }

  // Get the display value for an item (edited or original)
  const getItemValue = (item: MaterialOrderItem, field: keyof MaterialOrderItem) => {
    if (editAllMode && editAllItems[item.id]?.[field] !== undefined) {
      return editAllItems[item.id][field]
    }
    return item[field]
  }

  // Save all edited items
  const handleSaveAllItems = async () => {
    setIsSaving(true)
    try {
      const promises = Object.entries(editAllItems).map(([itemId, updates]) =>
        updateMaterialOrderItem(itemId, updates as any)
      )
      
      await Promise.all(promises)
      
      toast.success(`Updated ${promises.length} item(s) successfully`)
      setEditAllMode(false)
      setEditAllItems({})
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to save items: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setIsSaving(true)
    try {
      const { error } = await deleteMaterialOrderItem(itemId)
      if (error) throw new Error(error.message)
      
      toast.success('Item deleted successfully')
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to delete item: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500'
      case 'ordered':
        return 'bg-blue-500'
      case 'confirmed':
        return 'bg-blue-600'
      case 'in_transit':
        return 'bg-yellow-500'
      case 'delivered':
        return 'bg-green-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{isWorkOrder ? 'Work Order' : 'Material Order'} Details</span>
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Order
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <Package className="mr-2 h-4 w-4" />
                <span>Order Number</span>
              </div>
              <p className="font-medium">{order.order_number}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center text-sm text-gray-500">
                <User className="mr-2 h-4 w-4" />
                <span>{isWorkOrder ? 'Subcontractor' : 'Supplier'}</span>
              </Label>
              {isEditing ? (
                <Select value={supplierId || undefined} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${isWorkOrder ? 'subcontractor' : 'supplier'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{order.supplier?.name || 'N/A'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center text-sm text-gray-500">
                <Calendar className="mr-2 h-4 w-4" />
                <span>Order Date</span>
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              ) : (
                <p className="font-medium">
                  {order.order_date ? format(new Date(order.order_date), 'MMM dd, yyyy') : 'Not set'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center text-sm text-gray-500">
                <Truck className="mr-2 h-4 w-4" />
                <span>{isWorkOrder ? 'Install Date' : 'Expected Delivery'}</span>
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              ) : (
                <p className="font-medium">
                  {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy') : 'Not set'}
                </p>
              )}
            </div>

            {!isWorkOrder && (
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Tax Rate (%)</span>
                </div>
                <p className="font-medium">{(order.tax_rate * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center text-sm text-gray-500">
              <FileText className="mr-2 h-4 w-4" />
              <span>Notes</span>
            </Label>
            {isEditing ? (
              <textarea
                className="w-full min-h-[80px] p-3 border rounded-md"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this order..."
              />
            ) : order.notes ? (
              <p className="text-sm bg-gray-50 p-3 rounded-md">{order.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes</p>
            )}
          </div>

          {/* Edit Order Actions */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveOrder} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Line Items</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (editAllMode) {
                      handleSaveAllItems()
                    } else {
                      setEditAllMode(true)
                    }
                  }}
                  disabled={addingNewItem || editingItemId !== null || !order.items || order.items.length === 0}
                >
                  {editAllMode ? (
                    <><Save className="h-4 w-4 mr-2" />Save All</>
                  ) : (
                    <><Edit3 className="h-4 w-4 mr-2" />Edit All</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAddingNewItem(true)}
                  disabled={addingNewItem || editAllMode}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
            
            {/* Reminder for material orders */}
            {!isWorkOrder && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Don't forget to add accessories from the Measurements tab if needed (nails, screws, flashing, etc.)
                </p>
              </div>
            )}
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Variant</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Cost</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Add New Item Row */}
                  {addingNewItem && (
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2 relative" colSpan={6}>
                        <div className="space-y-2">
                          {/* Material Search */}
                          <Input
                            placeholder="Search materials or type description"
                            value={newItem.description}
                            onChange={(e) => handleMaterialSearch(e.target.value)}
                            autoFocus
                          />
                          
                          {/* Material Autocomplete Dropdown */}
                          {filteredMaterials.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                              {filteredMaterials.map((material) => (
                                <div
                                  key={material.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => handleSelectMaterial(material)}
                                >
                                  <div className="font-medium">{material.name}</div>
                                  {material.manufacturer && (
                                    <div className="text-xs text-gray-500">{material.manufacturer}</div>
                                  )}
                                  <div className="text-xs text-gray-600 mt-1">
                                    {formatCurrency(material.current_cost || 0)} per {material.unit || 'ea'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Variant Picker */}
                          {materialVariants.length > 0 && (
                            <div className="border-t pt-2">
                              <label className="text-xs font-medium text-gray-700 block mb-1">
                                Select Variant:
                              </label>
                              {materialVariants[0]?.variant_type === 'color' ? (
                                <div className="flex gap-2 flex-wrap">
                                  {materialVariants.map((variant) => (
                                    <button
                                      key={variant.id}
                                      type="button"
                                      onClick={() => handleSelectVariant(variant, selectedMaterial?.current_cost || 0)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded border-2 transition ${
                                        selectedVariant?.id === variant.id 
                                          ? 'border-blue-500 bg-blue-50' 
                                          : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                    >
                                      {variant.color_hex && (
                                        <div 
                                          className="w-6 h-6 rounded-full border border-gray-300" 
                                          style={{ backgroundColor: variant.color_hex }}
                                        />
                                      )}
                                      <span className="text-sm">{variant.variant_name}</span>
                                      {variant.price_adjustment !== 0 && (
                                        <span className="text-xs text-gray-600">
                                          ({variant.price_adjustment > 0 ? '+' : ''}{formatCurrency(variant.price_adjustment)})
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <select
                                  value={selectedVariant?.id || ''}
                                  onChange={(e) => {
                                    const variant = materialVariants.find(v => v.id === e.target.value)
                                    if (variant) {
                                      handleSelectVariant(variant, selectedMaterial?.current_cost || 0)
                                    }
                                  }}
                                  className="w-full px-3 py-2 border rounded"
                                >
                                  <option value="">Select {materialVariants[0]?.variant_type}...</option>
                                  {materialVariants.map((variant) => (
                                    <option key={variant.id} value={variant.id}>
                                      {variant.variant_name}
                                      {variant.price_adjustment !== 0 && 
                                        ` (${variant.price_adjustment > 0 ? '+' : ''}${formatCurrency(variant.price_adjustment)})`
                                      }
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}

                          {/* Quantity, Unit, and Cost Inputs */}
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Quantity</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Unit</label>
                              <Input
                                value={newItem.unit}
                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                placeholder="ea"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Unit Cost</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newItem.estimated_unit_cost}
                                onChange={(e) => setNewItem({ ...newItem, estimated_unit_cost: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Total</label>
                              <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                                {formatCurrency(newItem.quantity * newItem.estimated_unit_cost)}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={handleAddItem} disabled={isSaving}>
                              <Save className="h-3 w-3 mr-1" />
                              Add Item
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setAddingNewItem(false)
                                setNewItem({ description: '', quantity: 1, unit: 'ea', estimated_unit_cost: 0 })
                                setSelectedMaterial(null)
                                setMaterialVariants([])
                                setSelectedVariant(null)
                              }}
                              disabled={isSaving}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {/* Existing Items */}
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => {
                      const displayDescription = editingItemId === item.id ? editItem.description : (getItemValue(item, 'description') as string)
                      const displayQuantity = editingItemId === item.id ? editItem.quantity : (getItemValue(item, 'quantity') as number)
                      const displayUnit = editingItemId === item.id ? editItem.unit : (getItemValue(item, 'unit') as string)
                      const displayCost = editingItemId === item.id ? editItem.estimated_unit_cost : (getItemValue(item, 'estimated_unit_cost') as number || 0)
                      
                      return (
                      <tr key={item.id} className={editingItemId === item.id || editAllMode ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-2 text-sm">
                          {editingItemId === item.id || editAllMode ? (
                            <div className="space-y-2">
                              <Input
                                value={displayDescription}
                                onChange={(e) => {
                                  if (editingItemId === item.id) {
                                    setEditItem({ ...editItem, description: e.target.value })
                                  } else if (editAllMode) {
                                    handleUpdateItemInline(item.id, { description: e.target.value })
                                  }
                                }}
                              />
                              {editingItemId === item.id && editingVariants.length > 0 && (
                                <div className="border-t pt-2">
                                  <label className="text-xs font-medium text-gray-700 block mb-1">
                                    Variant:
                                  </label>
                                  {editingVariants[0]?.variant_type === 'color' ? (
                                    <div className="flex gap-1 flex-wrap">
                                      {editingVariants.map((variant) => (
                                        <button
                                          key={variant.id}
                                          type="button"
                                          onClick={() => {
                                            setEditingVariant(variant)
                                            const variantPrice = getVariantPrice(selectedMaterial?.current_cost || 0, variant)
                                            setEditItem(prev => ({ ...prev, estimated_unit_cost: variantPrice }))
                                          }}
                                          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                                            editingVariant?.id === variant.id 
                                              ? 'border-blue-500 bg-blue-50' 
                                              : 'border-gray-300 hover:border-gray-400'
                                          }`}
                                        >
                                          {variant.color_hex && (
                                            <div 
                                              className="w-4 h-4 rounded-full border border-gray-300" 
                                              style={{ backgroundColor: variant.color_hex }}
                                            />
                                          )}
                                          <span>{variant.variant_name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <select
                                      value={editingVariant?.id || ''}
                                      onChange={(e) => {
                                        const variant = editingVariants.find(v => v.id === e.target.value)
                                        if (variant) {
                                          setEditingVariant(variant)
                                          const variantPrice = getVariantPrice(selectedMaterial?.current_cost || 0, variant)
                                          setEditItem(prev => ({ ...prev, estimated_unit_cost: variantPrice }))
                                        }
                                      }}
                                      className="w-full px-2 py-1 border rounded text-xs"
                                    >
                                      <option value="">Select variant...</option>
                                      {editingVariants.map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                          {variant.variant_name}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.notes && <p className="text-gray-500 text-xs">{item.notes}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {editingItemId === item.id && editingVariant ? (
                            <span className="text-gray-900">{editingVariant.variant_name}</span>
                          ) : (
                            item.variant_name && (
                              <span className="text-gray-700">{item.variant_name}</span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {editingItemId === item.id || editAllMode ? (
                            <div className="flex gap-1 justify-end">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-20"
                                value={displayQuantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  if (editingItemId === item.id) {
                                    setEditItem({ ...editItem, quantity: val })
                                  } else if (editAllMode) {
                                    handleUpdateItemInline(item.id, { quantity: val })
                                  }
                                }}
                              />
                              <Input
                                className="w-16"
                                value={displayUnit}
                                onChange={(e) => {
                                  if (editingItemId === item.id) {
                                    setEditItem({ ...editItem, unit: e.target.value })
                                  } else if (editAllMode) {
                                    handleUpdateItemInline(item.id, { unit: e.target.value })
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            `${item.quantity} ${item.unit}`
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {editingItemId === item.id || editAllMode ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24"
                              value={displayCost}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                if (editingItemId === item.id) {
                                  setEditItem({ ...editItem, estimated_unit_cost: val })
                                } else if (editAllMode) {
                                  handleUpdateItemInline(item.id, { estimated_unit_cost: val })
                                }
                              }}
                            />
                          ) : (
                            formatCurrency(item.estimated_unit_cost || 0)
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {editingItemId === item.id || editAllMode
                            ? formatCurrency(displayQuantity * displayCost)
                            : formatCurrency(item.estimated_total || 0)
                          }
                        </td>
                        <td className="px-4 py-2">
                          {!editAllMode && (
                            <div className="flex justify-end gap-1">
                              {editingItemId === item.id ? (
                                <>
                                  <Button size="sm" onClick={() => handleSaveItem(item.id)} disabled={isSaving}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingItemId(null)
                                    setEditingVariants([])
                                    setEditingVariant(null)
                                  }}
                                  disabled={isSaving}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleStartEditItem(item)}
                                  disabled={editingItemId !== null || addingNewItem}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={isSaving || editingItemId !== null || addingNewItem}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </>
                            )}
                            </div>
                          )}
                        </td>
                      </tr>
                      )
                    })
                  ) : !addingNewItem ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No items added yet. Click "Add Item" to get started.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.total_estimated || 0)}</span>
              </div>
              {!isWorkOrder && order.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({(order.tax_rate * 100).toFixed(2)}%):</span>
                  <span className="font-medium">{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(isWorkOrder ? order.total_estimated : (order.total_with_tax || 0))}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
