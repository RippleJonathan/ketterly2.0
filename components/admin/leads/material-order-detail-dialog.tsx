'use client'

import { useState, useEffect } from 'react'
import { MaterialOrder } from '@/lib/types/material-orders'
import {
  updateMaterialOrderItem,
  deleteMaterialOrderItem,
  addMaterialOrderItem,
} from '@/lib/api/material-orders'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/formatting'
import { Trash2, Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

interface MaterialOrderDetailDialogProps {
  order: MaterialOrder | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export function MaterialOrderDetailDialog({
  order,
  isOpen,
  onClose,
  onUpdate,
}: MaterialOrderDetailDialogProps) {
  const { data: company } = useCurrentCompany()
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedQuantity, setEditedQuantity] = useState<number>(0)
  const [editedUnitCost, setEditedUnitCost] = useState<number>(0)
  const [isEditingAll, setIsEditingAll] = useState(false)
  const [editedItems, setEditedItems] = useState<Record<string, { quantity: number; unitCost: number }>>({})
  const [showAddItem, setShowAddItem] = useState(false)
  const [materials, setMaterials] = useState<any[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 0,
    unit: 'EA',
    estimated_unit_cost: 0,
    notes: '',
  })

  // Fetch materials for the dropdown
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!company?.id) return
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .order('name')
      
      if (!error && data) {
        setMaterials(data)
      }
    }
    
    fetchMaterials()
  }, [company?.id])

  if (!order) return null

  const items = order.items || []

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id)
    setEditedQuantity(item.quantity)
    setEditedUnitCost(item.estimated_unit_cost || 0)
  }

  const handleSaveItem = async (itemId: string) => {
    const result = await updateMaterialOrderItem(itemId, {
      quantity: editedQuantity,
      estimated_unit_cost: editedUnitCost,
    })

    if (result.error) {
      toast.error('Failed to update item')
      return
    }

    toast.success('Item updated successfully')
    setEditingItemId(null)
    onUpdate?.()
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    const result = await deleteMaterialOrderItem(itemId)

    if (result.error) {
      toast.error('Failed to delete item')
      return
    }

    toast.success('Item deleted successfully')
    onUpdate?.()
  }

  const handleEditAll = () => {
    // Initialize edited items with current values
    const allItems = items.reduce((acc: any, item: any) => {
      acc[item.id] = {
        quantity: item.quantity,
        unitCost: item.estimated_unit_cost || 0,
      }
      return acc
    }, {})
    setEditedItems(allItems)
    setIsEditingAll(true)
  }

  const handleSaveAll = async () => {
    try {
      // Update all changed items
      const updates = Object.entries(editedItems).map(([itemId, values]) => 
        updateMaterialOrderItem(itemId, {
          quantity: values.quantity,
          estimated_unit_cost: values.unitCost,
        })
      )

      const results = await Promise.all(updates)
      
      if (results.some(r => r.error)) {
        toast.error('Some items failed to update')
        return
      }

      toast.success('All items updated successfully')
      setIsEditingAll(false)
      setEditedItems({})
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update items')
    }
  }

  const handleCancelAll = () => {
    setIsEditingAll(false)
    setEditedItems({})
  }

  const updateEditedItem = (itemId: string, field: 'quantity' | 'unitCost', value: number) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      }
    }))
  }

  const calculateItemTotal = (quantity: number, unitCost: number) => {
    return quantity * unitCost
  }

  const handleAddItem = async () => {
    if (!newItem.description || newItem.quantity <= 0) {
      toast.error('Please provide description and quantity')
      return
    }

    const result = await addMaterialOrderItem(order.id, newItem)

    if (result.error) {
      toast.error('Failed to add item')
      return
    }

    toast.success('Item added successfully')
    setShowAddItem(false)
    setNewItem({
      description: '',
      quantity: 0,
      unit: 'EA',
      estimated_unit_cost: 0,
      notes: '',
    })
    onUpdate?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Order {order.order_number}
                {order.template_name && (
                  <Badge variant="outline">{order.template_name}</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {order.supplier?.name && `Supplier: ${order.supplier.name} • `}
                {items.length} item{items.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isEditingAll ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditAll}
                    disabled={items.length === 0}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddItem(true)}
                  >
                    Add Item
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAll}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAll}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save All
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => {
                const isEditingSingle = editingItemId === item.id
                const isInEditMode = isEditingSingle || isEditingAll
                
                let quantity, unitCost
                if (isEditingSingle) {
                  quantity = editedQuantity
                  unitCost = editedUnitCost
                } else if (isEditingAll) {
                  quantity = editedItems[item.id]?.quantity ?? item.quantity
                  unitCost = editedItems[item.id]?.unitCost ?? (item.estimated_unit_cost || 0)
                } else {
                  quantity = item.quantity
                  unitCost = item.estimated_unit_cost || 0
                }
                
                const total = calculateItemTotal(quantity, unitCost)

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isInEditMode ? (
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (isEditingSingle) {
                              setEditedQuantity(val)
                            } else {
                              updateEditedItem(item.id, 'quantity', val)
                            }
                          }}
                          className="w-20 text-right"
                          step="1"
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isInEditMode ? (
                        <Input
                          type="number"
                          value={unitCost}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (isEditingSingle) {
                              setEditedUnitCost(val)
                            } else {
                              updateEditedItem(item.id, 'unitCost', val)
                            }
                          }}
                          className="w-24 text-right"
                          step="0.01"
                        />
                      ) : (
                        <span>{formatCurrency(unitCost)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditingSingle ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveItem(item.id)}
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
                        </div>
                      ) : !isEditingAll ? (
                        <div className="flex items-center justify-end gap-1">
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
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {showAddItem && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Add New Item</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddItem(false)
                    setNewItem({
                      description: '',
                      quantity: 0,
                      unit: 'EA',
                      estimated_unit_cost: 0,
                      notes: '',
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="material-select">Select Material (Optional)</Label>
                  <Select
                    value={selectedMaterialId}
                    onValueChange={(value) => {
                      setSelectedMaterialId(value)
                      if (value) {
                        const material = materials.find(m => m.id === value)
                        if (material) {
                          setNewItem({
                            description: material.name,
                            quantity: 0,
                            unit: material.unit || 'EA',
                            estimated_unit_cost: material.current_cost || 0,
                            notes: '',
                          })
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose from materials database..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.unit}) - {formatCurrency(material.current_cost || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Input
                    id="new-description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="e.g., Shingles, Nails, Ridge Cap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-quantity">Quantity</Label>
                  <Input
                    id="new-quantity"
                    type="number"
                    step="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-unit">Unit</Label>
                  <Input
                    id="new-unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="EA, SQ, LF, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-cost">Unit Cost</Label>
                  <Input
                    id="new-cost"
                    type="number"
                    step="0.01"
                    value={newItem.estimated_unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, estimated_unit_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-total">Total</Label>
                  <Input
                    id="new-total"
                    value={formatCurrency(newItem.quantity * newItem.estimated_unit_cost)}
                    disabled
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="new-notes">Notes (Optional)</Label>
                  <Input
                    id="new-notes"
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddItem(false)
                    setNewItem({
                      description: '',
                      quantity: 0,
                      unit: 'EA',
                      estimated_unit_cost: 0,
                      notes: '',
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddItem}>
                  Add Item
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="flex justify-between items-start">
            <div className="text-sm text-muted-foreground">
              Total: {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center justify-between gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.total_estimated)}</span>
              </div>
              {order.tax_rate > 0 && (
                <>
                  <div className="flex items-center justify-between gap-8 text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(order.tax_rate * 100).toFixed(2)}%):
                    </span>
                    <span className="font-medium">{formatCurrency(order.tax_amount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8 pt-2 border-t">
                    <span className="font-semibold">Total with Tax:</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(order.total_with_tax || order.total_estimated)}
                    </span>
                  </div>
                </>
              )}
              {order.tax_rate === 0 && (
                <div className="flex items-center justify-between gap-8 pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(order.total_estimated)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}