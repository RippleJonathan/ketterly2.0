// Quote Creation/Edit Form
'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quoteFormSchema, type QuoteFormValues } from '@/lib/validation/quote-schemas'
import { useCreateQuote, useUpdateQuote, useUpdateQuoteLineItems } from '@/lib/hooks/use-quotes'
import { useEstimateTemplates } from '@/lib/hooks/use-estimate-templates'
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
import { Plus, Trash2, GripVertical, Database, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatting'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { MaterialPickerDialog } from './material-picker-dialog'
import { Material, calculateMaterialQuantity, RoofMeasurements } from '@/lib/types/materials'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { getMaterialPriceForLocation } from '@/lib/utils/location-pricing'
import { toast } from 'sonner'

interface QuoteFormProps {
  leadId: string
  leadName: string
  isOpen: boolean
  onClose: () => void
  existingQuote?: any // For editing
  initialTemplateId?: string // Template to auto-import on open
}

export function QuoteForm({ leadId, leadName, isOpen, onClose, existingQuote, initialTemplateId }: QuoteFormProps) {
  const { user } = useAuth()
  const { data: company } = useCurrentCompany()
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const updateLineItems = useUpdateQuoteLineItems()
  const [leadLocationId, setLeadLocationId] = useState<string | null>(null)
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const hasImportedTemplate = useRef(false) // Track if we've imported the template
  
  // Fetch estimate templates
  const { data: templatesData } = useEstimateTemplates()
  const templates = templatesData?.data || []
  
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

  // Fetch lead's location for pricing
  useEffect(() => {
    if (!isOpen || !company) return

    async function fetchLeadLocation() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('leads')
          .select('location_id')
          .eq('id', leadId)
          .single()

        if (!error && data) {
          setLeadLocationId(data.location_id)
          console.log('Lead location for estimate pricing:', data.location_id)
        }
      } catch (error) {
        console.error('Failed to fetch lead location:', error)
      }
    }

    fetchLeadLocation()
  }, [isOpen, leadId, company])

  // Initialize field array BEFORE the auto-import useEffect
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Auto-import template when initialTemplateId is provided
  useEffect(() => {
    const autoImportTemplate = async () => {
      console.log('useEffect triggered:', {
        isOpen,
        initialTemplateId,
        existingQuote: !!existingQuote,
        hasImportedTemplate: hasImportedTemplate.current,
        leadLocationId,
      })

      // Reset import flag when dialog closes
      if (!isOpen) {
        hasImportedTemplate.current = false
        return
      }
      
      // Don't import if no template, editing existing quote, or already imported
      if (!initialTemplateId || existingQuote || hasImportedTemplate.current) {
        console.log('Skipping import:', {
          noTemplate: !initialTemplateId,
          isEditing: !!existingQuote,
          alreadyImported: hasImportedTemplate.current
        })
        return
      }

      // Wait for lead location to be loaded (needed for location pricing)
      if (leadLocationId === null) {
        console.log('Waiting for lead location to load...')
        return
      }

      // Don't need to wait for measurements - the API will handle it server-side
      // Just pass the leadId and let the server fetch measurements
      console.log('Auto-import triggered:', {
        initialTemplateId,
        companyId: company?.id,
        leadId,
        leadLocationId,
      })

      try {
        const { importTemplateToEstimate } = await import('@/lib/api/estimate-templates')
        const { getLeadMeasurements } = await import('@/lib/api/measurements')
        
        if (!company?.id) {
          toast.error('Company not loaded')
          return
        }

        // Fetch measurements server-side
        const measurementsResult = await getLeadMeasurements(leadId, company.id)
        if (measurementsResult.error || !measurementsResult.data) {
          toast.error('Failed to load measurements')
          return
        }

        const measurements = measurementsResult.data

        console.log('Measurements loaded:', {
          total_squares: measurements.total_squares,
          actual_squares: measurements.actual_squares,
        })

        // Import template with calculated quantities and location pricing
        const result = await importTemplateToEstimate({
          companyId: company.id,
          templateId: initialTemplateId,
          measurements,
          locationId: leadLocationId,
        })
        
        if (result.error || !result.data) {
          toast.error('Failed to load template items')
          return
        }

        const lineItems = result.data
        console.log('Template line items loaded:', lineItems.length, lineItems)

        if (lineItems.length === 0) {
          toast.info('This template has no items')
          return
        }

        // Mark as imported to prevent re-import
        hasImportedTemplate.current = true

        // Clear existing line items first
        form.setValue('line_items', [])

        // Add imported line items
        lineItems.forEach((item: any) => {
          append(item)
        })

        toast.success(`Imported ${lineItems.length} items from template with calculated quantities`)
      } catch (error) {
        console.error('Failed to import template:', error)
        toast.error('Failed to import template')
      }
    }

    autoImportTemplate()
  }, [initialTemplateId, isOpen, existingQuote, append, form, company, leadId, leadLocationId])

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
    console.log('Form submitted:', data)
    if (!user) {
      console.error('No user found')
      return
    }

    try {
      console.log('Creating/updating quote...')
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
        console.log('Creating new quote with data:', {
          leadId,
          tax_rate: data.tax_rate / 100,
          line_items_count: data.line_items.length
        })
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
      toast.error('Failed to save estimate')
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

  const handleMaterialSelected = async (material: Material) => {
    // Get location-specific pricing for estimate items
    const pricingResult = await getMaterialPriceForLocation(
      material.id,
      leadLocationId
    )
    
    console.log(`Estimate pricing for ${material.name}: $${pricingResult.price} (source: ${pricingResult.source})`)

    // Add material as a line item with location-specific pricing
    append({
      category: LineItemCategory.MATERIALS,
      description: `${material.name}${material.manufacturer ? ` - ${material.manufacturer}` : ''}`,
      quantity: material.default_per_square || 1,
      unit: material.unit,
      unit_price: pricingResult.price,
      cost_per_unit: pricingResult.price,
      supplier: '',
      notes: material.notes || '',
    })
  }

  const importTemplate = async () => {
    if (!selectedTemplateId) return

    try {
      // Fetch template items using the API directly
      const { getTemplateEstimateItems } = await import('@/lib/api/estimate-templates')
      const result = await getTemplateEstimateItems(selectedTemplateId)
      
      if (result.error || !result.data) {
        toast.error('Failed to load template items')
        return
      }

      const items = result.data

      if (items.length === 0) {
        toast.info('This template has no items')
        return
      }

      // Add each template item as a line item
      items.forEach((item: any) => {
        const material = item.material
        if (!material) return

        append({
          category: LineItemCategory.MATERIALS,
          description: item.description || `${material.name}${material.manufacturer ? ` - ${material.manufacturer}` : ''}`,
          quantity: item.per_square || material.default_per_square || 1,
          unit: material.unit,
          unit_price: material.current_cost || 0,
          cost_per_unit: material.current_cost || 0,
          supplier: '',
          notes: material.notes || '',
        })
      })

      toast.success(`Imported ${items.length} items from template`)
      setSelectedTemplateId('')
    } catch (error) {
      console.error('Failed to import template:', error)
      toast.error('Failed to import template')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && console.log('QuoteForm Dialog is rendering, isOpen:', isOpen)}
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

        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.log('Form validation errors:', errors)
          console.log('Line items errors:', errors.line_items)
          if (errors.line_items) {
            errors.line_items.forEach((item, index) => {
              console.log(`Line item ${index} errors:`, item)
            })
          }
          toast.error('Please fill in all required fields')
        })} className="space-y-6">
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
                {/* Template Import */}
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Import template..." />
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
                  <FileText className="h-4 w-4 mr-2" />
                  Import
                </Button>
                {/* Material Picker */}
                <Button 
                  type="button" 
                  onClick={() => setMaterialPickerOpen(true)} 
                  size="sm"
                  variant="outline"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
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
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
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

                                {/* Notes (per item) */}
                                <div className="md:col-span-5">
                                  <Label>Notes (Optional)</Label>
                                  <Textarea
                                    {...form.register(`line_items.${index}.notes`)}
                                    placeholder="Optional notes for this line item..."
                                    rows={2}
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
