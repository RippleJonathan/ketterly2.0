// Quote Creation/Edit Form
'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quoteFormSchema, type QuoteFormValues } from '@/lib/validation/quote-schemas'
import { useCreateQuote, useUpdateQuote, useUpdateQuoteLineItems } from '@/lib/hooks/use-quotes'
import { useAuth } from '@/lib/hooks/use-auth'
import { calculateQuoteTotals } from '@/lib/api/quotes'
import { LineItemCategory } from '@/lib/types/quotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, GripVertical, Database } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatting'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { MaterialPickerDialog } from './material-picker-dialog'
import { Material } from '@/lib/types/materials'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

interface QuoteFormProps {
  leadId: string
  leadName: string
  isOpen: boolean
  onClose: () => void
  existingQuote?: any // For editing
}

export function QuoteForm({ leadId, leadName, isOpen, onClose, existingQuote }: QuoteFormProps) {
  const { user } = useAuth()
  const { data: company } = useCurrentCompany()
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const updateLineItems = useUpdateQuoteLineItems()
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)
  
  const isEditing = !!existingQuote

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      option_label: '',
      tax_rate: 0, // No tax for residential roofing in Texas (stored as percentage)
      discount_amount: 0,
      payment_terms: 'Net 30 - 50% deposit required',
      notes: '',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as any, // 30 days from now
      line_items: [],
    },
  })

  // Load existing quote data when it becomes available
  useEffect(() => {
    if (existingQuote && isOpen) {
      // Convert date to yyyy-MM-dd format for HTML date input
      const validUntilDate = new Date(existingQuote.valid_until)
      const formattedDate = validUntilDate.toISOString().split('T')[0]
      
      form.reset({
        option_label: existingQuote.option_label || '',
        tax_rate: (existingQuote.tax_rate || 0) * 100, // Convert to percentage for display
        discount_amount: existingQuote.discount_amount || 0,
        payment_terms: existingQuote.payment_terms,
        notes: existingQuote.notes || '',
        valid_until: formattedDate as any, // Store as string for date input
        line_items: existingQuote.line_items?.map((item: any) => ({
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_per_unit: item.cost_per_unit || 0,
          supplier: item.supplier || '',
          notes: item.notes || '',
        })) || [],
      })
    } else if (!existingQuote && isOpen) {
      // Reset to default values when creating new quote
      const defaultDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const formattedDefaultDate = defaultDate.toISOString().split('T')[0]
      
      form.reset({
        option_label: '',
        tax_rate: 0, // 0% for Texas residential
        discount_amount: 0,
        payment_terms: 'Net 30 - 50% deposit required',
        notes: '',
        valid_until: formattedDefaultDate as any,
        line_items: [],
      })
    }
  }, [existingQuote, isOpen, form, leadName])

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Watch all form values for live total calculation
  const watchedLineItems = form.watch('line_items')
  const watchedTaxRate = form.watch('tax_rate')
  const watchedDiscount = form.watch('discount_amount')

  // Calculate totals in real-time
  const totals = calculateQuoteTotals(
    watchedLineItems.map((item) => ({
      ...item,
      category: item.category as LineItemCategory,
    })),
    watchedTaxRate / 100, // Convert percentage to decimal for calculation
    watchedDiscount
  )

  const onSubmit = async (data: QuoteFormValues) => {
    if (!user) return

    try {
      if (isEditing) {
        // Update existing quote
        await updateQuote.mutateAsync({
          quoteId: existingQuote.id,
          updates: {
            option_label: data.option_label,
            tax_rate: data.tax_rate / 100, // Convert percentage to decimal
            discount_amount: data.discount_amount,
            payment_terms: data.payment_terms,
            notes: data.notes,
            valid_until: data.valid_until, // Already a string from date input
          },
        })

        // Update line items
        await updateLineItems.mutateAsync({
          quoteId: existingQuote.id,
          lineItems: data.line_items.map((item) => ({
            ...item,
            category: item.category as LineItemCategory,
          })),
        })
      } else {
        // Create new quote
        await createQuote.mutateAsync({
          leadId,
          quoteData: {
            ...data,
            tax_rate: data.tax_rate / 100, // Convert percentage to decimal
            valid_until: new Date(data.valid_until), // Convert string to Date
            line_items: data.line_items.map((item) => ({
              ...item,
              category: item.category as LineItemCategory,
            })),
          },
          createdBy: user.id,
        })
      }

      form.reset()
      onClose()
    } catch (error) {
      console.error('Failed to save quote:', error)
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    move(result.source.index, result.destination.index)
  }

  const addLineItem = () => {
    append({
      category: LineItemCategory.LABOR,
      description: '',
      quantity: 1,
      unit: 'hours',
      unit_price: 0,
      cost_per_unit: 0,
      supplier: '',
      notes: '',
    })
  }

  const handleMaterialSelected = (material: Material) => {
    // Add material as a line item with smart defaults
    append({
      category: LineItemCategory.MATERIALS,
      description: `${material.name}${material.manufacturer ? ` - ${material.manufacturer}` : ''}`,
      quantity: material.default_per_square || 1,
      unit: material.unit,
      unit_price: material.current_cost || 0,
      cost_per_unit: material.current_cost || 0,
      supplier: '',
      notes: material.product_line || '',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Estimate' : 'Create New Estimate'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing estimate for ${leadName}`
              : `Create a detailed estimate for ${leadName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Quote Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="option_label">Option Label (Optional)</Label>
              <Input
                id="option_label"
                {...form.register('option_label')}
                placeholder="e.g., Option A: Full Replacement"
              />
            </div>

            <div>
              <Label htmlFor="valid_until">Valid Until *</Label>
              <Input
                id="valid_until"
                type="date"
                {...form.register('valid_until')}
              />
              {form.formState.errors.valid_until && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.valid_until.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="tax_rate">Tax Rate (%) - Optional</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                {...form.register('tax_rate', {
                  valueAsNumber: true,
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Note: Residential roofing labor is tax-exempt in Texas. Only add tax for commercial jobs or materials.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="payment_terms">Payment Terms *</Label>
              <Input
                id="payment_terms"
                {...form.register('payment_terms')}
                placeholder="e.g., Net 30 - 50% deposit required"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes / Terms (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Special terms, exclusions, warranty information, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  onClick={() => setMaterialPickerOpen(true)} 
                  size="sm"
                  variant="outline"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Add from Materials DB
                </Button>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blank Item
                </Button>
              </div>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No line items yet. Add your first item above.</p>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="line-items">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3">
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="mt-2 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>

                              {/* Line Item Fields */}
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                                {/* Category */}
                                <div className="md:col-span-1">
                                  <Label>Category</Label>
                                  <Controller
                                    name={`line_items.${index}.category`}
                                    control={form.control}
                                    render={({ field }) => (
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value={LineItemCategory.LABOR}>
                                            Labor
                                          </SelectItem>
                                          <SelectItem value={LineItemCategory.MATERIALS}>
                                            Materials
                                          </SelectItem>
                                          <SelectItem value={LineItemCategory.PERMITS}>
                                            Permits
                                          </SelectItem>
                                          <SelectItem value={LineItemCategory.EQUIPMENT}>
                                            Equipment
                                          </SelectItem>
                                          <SelectItem value={LineItemCategory.OTHER}>
                                            Other
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>

                                {/* Description */}
                                <div className="md:col-span-2">
                                  <Label>Description</Label>
                                  <Input
                                    {...form.register(`line_items.${index}.description`)}
                                    placeholder="e.g., Asphalt shingles - 30yr"
                                  />
                                </div>

                                {/* Quantity */}
                                <div className="md:col-span-1">
                                  <Label>Qty</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register(`line_items.${index}.quantity`, {
                                      setValueAs: (v) => (v ? parseFloat(v) : 0),
                                    })}
                                  />
                                </div>

                                {/* Unit */}
                                <div className="md:col-span-1">
                                  <Label>Unit</Label>
                                  <Input
                                    {...form.register(`line_items.${index}.unit`)}
                                    placeholder="sqft, hrs, ea"
                                  />
                                </div>

                                {/* Unit Price */}
                                <div className="md:col-span-1">
                                  <Label>Price</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register(`line_items.${index}.unit_price`, {
                                      setValueAs: (v) => (v ? parseFloat(v) : 0),
                                    })}
                                    placeholder="0.00"
                                  />
                                </div>

                                {/* Line Total (calculated) */}
                                <div className="md:col-span-6 flex items-center justify-between pt-2 border-t border-gray-200">
                                  <div className="text-sm text-gray-600">
                                    Line Total:{' '}
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(
                                        (watchedLineItems[index]?.quantity || 0) *
                                          (watchedLineItems[index]?.unit_price || 0)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Delete Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => remove(index)}
                                className="mt-6"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {form.formState.errors.line_items && (
              <p className="text-sm text-red-600 mt-2">
                {form.formState.errors.line_items.message}
              </p>
            )}
          </div>

          {/* Totals Summary */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Estimate Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              
              {watchedDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <Label htmlFor="discount_amount">Discount</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="discount_amount"
                      type="number"
                      step="0.01"
                      {...form.register('discount_amount', {
                        setValueAs: (v) => (v ? parseFloat(v) : 0),
                      })}
                      className="w-32"
                    />
                    <span className="font-medium text-red-600">
                      -{formatCurrency(totals.discount)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Tax ({(watchedTaxRate * 100).toFixed(2)}%)
                </span>
                <span className="font-medium">{formatCurrency(totals.tax)}</span>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createQuote.isPending || updateQuote.isPending}
            >
              {createQuote.isPending || updateQuote.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update Estimate'
                : 'Create Estimate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Material Picker Dialog */}
      {company && (
        <MaterialPickerDialog
          open={materialPickerOpen}
          onOpenChange={setMaterialPickerOpen}
          onSelectMaterial={handleMaterialSelected}
          companyId={company.id}
        />
      )}
    </Dialog>
  )
}
