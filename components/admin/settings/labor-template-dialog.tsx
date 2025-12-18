// Labor Template Dialog Component
// Create and edit labor order templates with labor items

'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useCreateLaborTemplate,
  useUpdateLaborTemplate,
  useBulkAddLaborItemsToTemplate,
  useRemoveLaborItemFromTemplate,
  useTemplateLaborItems,
} from '@/lib/hooks/use-labor-templates'
import { LaborTemplate } from '@/lib/types/labor-templates'
import { useMaterials } from '@/lib/hooks/use-materials'
import { Material } from '@/lib/types/materials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Clock, Package } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface LaborItem {
  description: string
  hours: number
  hourly_rate: number | null
  notes: string
}

interface LaborTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  template?: LaborTemplate | null
}

export function LaborTemplateDialog({ isOpen, onClose, template }: LaborTemplateDialogProps) {
  const createTemplate = useCreateLaborTemplate()
  const updateTemplate = useUpdateLaborTemplate()
  const bulkAddItems = useBulkAddLaborItemsToTemplate()
  const removeItem = useRemoveLaborItemFromTemplate()

  const isEditing = !!template

  // Fetch available materials from catalog
  const { data: materialsData } = useMaterials({ is_active: true })
  const materials = materialsData?.data || []

  // Fetch template's current items (if editing)
  const { data: templateItemsData } = useTemplateLaborItems(template?.id)
  const templateItems = templateItemsData?.data || []

  // Labor items for new templates
  const [laborItems, setLaborItems] = useState<LaborItem[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [newItem, setNewItem] = useState<LaborItem>({
    description: '',
    hours: 0,
    hourly_rate: null,
    notes: '',
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'roofing',
    },
  })

  const category = watch('category')

  // Load template data when editing
  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description || '',
        category: template.category,
      })
      setLaborItems([])
    } else {
      reset({
        name: '',
        description: '',
        category: 'roofing',
      })
      setLaborItems([])
    }
  }, [template, reset])

  const onSubmit = async (data: TemplateFormData) => {
    let templateId: string

    if (isEditing && template) {
      // Update template basic info
      await updateTemplate.mutateAsync({
        templateId: template.id,
        updates: data,
      })
      templateId = template.id
    } else {
      // Create new template
      const newTemplate = await createTemplate.mutateAsync(data)
      templateId = newTemplate.data!.id

      // Add labor items to new template
      if (laborItems.length > 0) {
        await bulkAddItems.mutateAsync({
          templateId,
          items: laborItems.map((item, index) => ({
            description: item.description,
            hours: item.hours,
            hourly_rate: item.hourly_rate,
            notes: item.notes || null,
            sort_order: index,
          })),
        })
      }
    }

    onClose()
    reset()
    setLaborItems([])
    setNewItem({ description: '', hours: 0, hourly_rate: null, notes: '' })
  }

  const addLaborItem = () => {
    if (!newItem.description || newItem.hours <= 0) return

    setLaborItems([...laborItems, { ...newItem }])
    setNewItem({ description: '', hours: 0, hourly_rate: null, notes: '' })
  }

  const removeLaborItem = (index: number) => {
    setLaborItems(laborItems.filter((_, i) => i !== index))
  }

  const addMaterialFromCatalog = () => {
    if (!selectedMaterialId) return

    const material = materials.find(m => m.id === selectedMaterialId)
    if (!material) return

    // Convert material to labor item with default hourly rate
    const laborItem: LaborItem = {
      description: material.name,
      hours: 1, // Default to 1 hour
      hourly_rate: material.cost || null,
      notes: material.description || '',
    }

    if (isEditing && template) {
      // Add directly to template via API
      bulkAddItems.mutateAsync({
        templateId: template.id,
        items: [{
          description: laborItem.description,
          hours: laborItem.hours,
          hourly_rate: laborItem.hourly_rate,
          notes: laborItem.notes || null,
          sort_order: templateItems.length,
        }],
      })
    } else {
      // Add to state for new templates
      setLaborItems([...laborItems, laborItem])
    }

    setSelectedMaterialId('')
  }

  const handleRemoveFromTemplate = async (itemId: string) => {
    if (!template) return
    await removeItem.mutateAsync({
      itemId,
      templateId: template.id,
    })
  }

  const addItemToTemplate = async () => {
    if (!newItem.description || newItem.hours <= 0 || !template) return

    await bulkAddItems.mutateAsync({
      templateId: template.id,
      items: [{
        description: newItem.description,
        hours: newItem.hours,
        hourly_rate: newItem.hourly_rate,
        notes: newItem.notes || null,
        sort_order: templateItems.length,
      }],
    })

    setNewItem({ description: '', hours: 0, hourly_rate: null, notes: '' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Labor Template' : 'Create Labor Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Standard Roof Tear-off"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roofing">Roofing</SelectItem>
                  <SelectItem value="siding">Siding</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                  <SelectItem value="gutters">Gutters</SelectItem>
                  <SelectItem value="repairs">Repairs</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Labor Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Labor Items</h3>
              <span className="text-sm text-muted-foreground">
                {isEditing ? `${templateItems.length} items` : `${laborItems.length} items`}
              </span>
            </div>

            {/* Import from Product Catalog */}
            <div className="p-4 border rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/30">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-semibold">Import from Product Catalog</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Select items from your catalog to quickly add as labor tasks
              </p>
              <div className="flex gap-2">
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-950">
                    <SelectValue placeholder="Select an item from catalog..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} - {material.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addMaterialFromCatalog}
                  disabled={!selectedMaterialId}
                  size="sm"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>

            {/* Add Labor Item Form */}
            <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="item-description">Task Description *</Label>
                  <Input
                    id="item-description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="e.g., Remove existing shingles"
                  />
                </div>
                <div>
                  <Label htmlFor="item-hours">Hours *</Label>
                  <Input
                    id="item-hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={newItem.hours || ''}
                    onChange={(e) => setNewItem({ ...newItem, hours: parseFloat(e.target.value) || 0 })}
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <Label htmlFor="item-rate">Hourly Rate (Optional)</Label>
                  <Input
                    id="item-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.hourly_rate || ''}
                    onChange={(e) => setNewItem({ ...newItem, hourly_rate: parseFloat(e.target.value) || null })}
                    placeholder="25.00"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="item-notes">Notes (Optional)</Label>
                  <Input
                    id="item-notes"
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    placeholder="Additional instructions..."
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={isEditing ? addItemToTemplate : addLaborItem}
                disabled={!newItem.description || newItem.hours <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isEditing ? 'Add to Template' : 'Add Item'}
              </Button>
            </div>

            {/* Items List - For New Templates */}
            {!isEditing && laborItems.length > 0 && (
              <div className="space-y-2">
                {laborItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{item.description}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.hours} hrs
                        </span>
                        {item.hourly_rate && (
                          <span>${item.hourly_rate.toFixed(2)}/hr</span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLaborItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Items List - For Editing Templates */}
            {isEditing && templateItems.length > 0 && (
              <div className="space-y-2">
                {templateItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{item.description}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.hours} hrs
                        </span>
                        {item.hourly_rate && (
                          <span>${item.hourly_rate.toFixed(2)}/hr</span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromTemplate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
