'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/use-material-templates'
import { MaterialTemplate, TemplateItem } from '@/lib/types/material-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

const templateItemSchema = z.object({
  item: z.string().min(1, 'Item name is required'),
  unit: z.string().min(1, 'Unit is required'),
  per_square: z.number().positive('Must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
})

const templateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  items: z.array(templateItemSchema).min(1, 'At least one item is required'),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface MaterialTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  template?: MaterialTemplate | null
}

export function MaterialTemplateDialog({ isOpen, onClose, template }: MaterialTemplateDialogProps) {
  const { data: company } = useCurrentCompany()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const isEditing = !!template

  const {
    register,
    control,
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
      items: [
        {
          item: 'Shingles',
          unit: 'bundle',
          per_square: 3,
          description: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const category = watch('category')

  // Load template data when editing
  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description || '',
        category: template.category,
        items: template.items,
      })
    } else {
      reset({
        name: '',
        description: '',
        category: 'roofing',
        items: [
          {
            item: 'Shingles',
            unit: 'bundle',
            per_square: 3,
            description: '',
          },
        ],
      })
    }
  }, [template, reset])

  const onSubmit = async (data: TemplateFormData) => {
    if (isEditing && template) {
      await updateTemplate.mutateAsync({
        templateId: template.id,
        updates: data,
      })
    } else {
      await createTemplate.mutateAsync({
        ...data,
        company_id: company?.id || '',
      })
    }

    onClose()
    reset()
  }

  const addItem = () => {
    append({
      item: '',
      unit: '',
      per_square: 1,
      description: '',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  placeholder="CertainTeed ClimateFlex"
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

          {/* Template Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Template Items</h3>
                <p className="text-sm text-muted-foreground">
                  Define materials with conversion rates (per square)
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Item Name *</Label>
                          <Input
                            placeholder="Shingles"
                            {...register(`items.${index}.item`)}
                          />
                          {errors.items?.[index]?.item && (
                            <p className="text-xs text-destructive">
                              {errors.items[index]?.item?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label>Unit *</Label>
                          <Input
                            placeholder="bundle"
                            {...register(`items.${index}.unit`)}
                          />
                          {errors.items?.[index]?.unit && (
                            <p className="text-xs text-destructive">
                              {errors.items[index]?.unit?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label>Per Square *</Label>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="3.0"
                            {...register(`items.${index}.per_square`, {
                              valueAsNumber: true,
                            })}
                          />
                          {errors.items?.[index]?.per_square && (
                            <p className="text-xs text-destructive">
                              {errors.items[index]?.per_square?.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Description *</Label>
                        <Input
                          placeholder="CertainTeed ClimateFlex Architectural"
                          {...register(`items.${index}.description`)}
                        />
                        {errors.items?.[index]?.description && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.description?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="mt-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
