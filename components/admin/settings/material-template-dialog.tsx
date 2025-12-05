'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/use-material-templates'
import { MaterialTemplate } from '@/lib/types/material-templates'
import { 
  useMaterials, 
  useTemplateMaterials, 
  useBulkAddMaterialsToTemplate,
  useRemoveMaterialFromTemplate 
} from '@/lib/hooks/use-materials'
import { 
  Material, 
  MeasurementType, 
  getMeasurementTypeLabel 
} from '@/lib/types/materials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Package } from 'lucide-react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

const templateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface SelectedMaterial {
  material: Material
  description: string
}

interface MaterialTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  template?: MaterialTemplate | null
}

export function MaterialTemplateDialog({ isOpen, onClose, template }: MaterialTemplateDialogProps) {
  const { data: company } = useCurrentCompany()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const bulkAddMaterials = useBulkAddMaterialsToTemplate()
  const removeMaterial = useRemoveMaterialFromTemplate()

  const isEditing = !!template

  // Fetch available materials
  const { data: materialsData } = useMaterials({ is_active: true })
  const materials = materialsData?.data || []

  // Fetch template's current materials (if editing)
  const { data: templateMaterialsData } = useTemplateMaterials(template?.id || '')
  const templateMaterials = templateMaterialsData?.data || []

  // Selected materials for new templates
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')

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
    } else {
      reset({
        name: '',
        description: '',
        category: 'roofing',
      })
      setSelectedMaterials([])
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
      const newTemplate = await createTemplate.mutateAsync({
        ...data,
        company_id: company?.id || '',
        items: [], // Empty items array (using junction table instead)
      })
      templateId = newTemplate.data!.id

      // Add selected materials to new template
      if (selectedMaterials.length > 0) {
        await bulkAddMaterials.mutateAsync({
          templateId,
          materials: selectedMaterials.map(sm => ({
            material_id: sm.material.id,
            description: sm.description,
          })),
        })
      }
    }

    onClose()
    reset()
    setSelectedMaterials([])
  }

  const addMaterialToSelection = () => {
    if (!selectedMaterialId) return

    const material = materials.find(m => m.id === selectedMaterialId)
    if (!material) return

    // Check if already added
    if (selectedMaterials.some(sm => sm.material.id === material.id)) {
      return
    }

    setSelectedMaterials([
      ...selectedMaterials,
      {
        material,
        description: material.name,
      },
    ])
    setSelectedMaterialId('')
  }

  const removeMaterialFromSelection = (materialId: string) => {
    setSelectedMaterials(selectedMaterials.filter(sm => sm.material.id !== materialId))
  }

  const updateSelectedMaterial = (
    materialId: string, 
    field: 'description', 
    value: string
  ) => {
    setSelectedMaterials(selectedMaterials.map(sm =>
      sm.material.id === materialId
        ? { ...sm, [field]: value }
        : sm
    ))
  }

  const handleRemoveFromTemplate = async (templateMaterialId: string) => {
    if (!template) return
    await removeMaterial.mutateAsync({
      id: templateMaterialId,
      templateId: template.id,
    })
  }

  const addMaterialToTemplate = async () => {
    if (!selectedMaterialId || !template) return

    const material = materials.find(m => m.id === selectedMaterialId)
    if (!material) return

    // Add material to template via API
    await bulkAddMaterials.mutateAsync({
      templateId: template.id,
      materials: [{
        material_id: material.id,
        description: material.name,
      }],
    })

    setSelectedMaterialId('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create Material Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="Standard Residential Roof"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this template..."
                rows={2}
                {...register('description')}
              />
            </div>
          </div>

          {/* Materials Selection (New Templates) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Template Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    Add materials from your catalog with per-square quantities
                  </p>
                </div>
              </div>

              {/* Material Selector */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materials
                        .filter(m => !selectedMaterials.some(sm => sm.material.id === m.id))
                        .map(material => (
                          <SelectItem key={material.id} value={material.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{material.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {material.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMaterialToSelection}
                  disabled={!selectedMaterialId}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Selected Materials List */}
              <div className="space-y-2">
                {selectedMaterials.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No materials added yet. Select materials from your catalog above.
                    </p>
                  </div>
                ) : (
                  selectedMaterials.map((sm) => (
                    <div key={sm.material.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{sm.material.name}</h4>
                            <Badge variant="outline">{sm.material.category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {sm.material.manufacturer && `• ${sm.material.manufacturer}`}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {/* Display material's measurement settings (read-only) */}
                            <div className="grid grid-cols-2 gap-3 p-2 bg-muted/50 rounded text-sm">
                              <div>
                                <span className="text-muted-foreground text-xs">Measurement Type:</span>
                                <p className="font-medium">
                                  {sm.material.measurement_type === 'square' ? 'Per Square' :
                                   sm.material.measurement_type === 'hip_ridge' ? 'Hip + Ridge' :
                                   sm.material.measurement_type === 'perimeter' ? 'Perimeter (Rake + Eave)' :
                                   sm.material.measurement_type === 'each' ? 'Fixed Quantity' :
                                   sm.material.measurement_type || 'Per Square'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">Conversion:</span>
                                <p className="font-medium">
                                  {sm.material.default_per_unit || sm.material.default_per_square || 'N/A'} {sm.material.unit}
                                  {sm.material.measurement_type === 'square' ? '/sq' :
                                   sm.material.measurement_type === 'each' ? ' each' :
                                   ' per LF'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Only editable field: description */}
                            <div className="space-y-1">
                              <Label className="text-xs">Notes / Description (optional)</Label>
                              <Input
                                value={sm.description}
                                onChange={(e) => updateSelectedMaterial(sm.material.id, 'description', e.target.value)}
                                placeholder="Additional notes for this template..."
                              />
                              <p className="text-xs text-muted-foreground">
                                To change measurement type or conversion, edit the material in Materials settings
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterialFromSelection(sm.material.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Current Template Materials (Editing) */}
          {isEditing && template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Template Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    Add materials from your catalog to this template
                  </p>
                </div>
              </div>

              {/* Material Selector for Editing */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materials
                        .filter(m => !templateMaterials.some(tm => tm.material_id === m.id))
                        .map(material => (
                          <SelectItem key={material.id} value={material.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{material.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {material.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMaterialToTemplate}
                  disabled={!selectedMaterialId || bulkAddMaterials.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {templateMaterials.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No materials in this template yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templateMaterials.map((tm) => (
                    <div key={tm.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tm.material?.name}</span>
                          <Badge variant="outline">{tm.material?.category}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {tm.measurement_type === 'square' ? 'Per Square' :
                             tm.measurement_type === 'hip_ridge' ? 'Hip+Ridge' :
                             tm.measurement_type === 'perimeter' ? 'Perimeter' :
                             tm.measurement_type || 'square'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tm.material?.default_per_unit || tm.material?.default_per_square || 'N/A'} {tm.material?.unit}
                          {tm.material?.measurement_type === 'square' ? ' per square' :
                           tm.material?.measurement_type === 'each' ? ' (fixed)' :
                           ' per LF'}
                          {tm.description && ` • ${tm.description}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromTemplate(tm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTemplate.isPending || updateTemplate.isPending || bulkAddMaterials.isPending}
            >
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
