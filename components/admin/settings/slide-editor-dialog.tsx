'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { SlidePreview } from './slide-preview'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdatePresentationSlide } from '@/lib/hooks/use-presentations'
import { toast } from 'sonner'
import type { PresentationSlide, FlowType, SlideType } from '@/lib/types/presentations'

const slideSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slideType: z.enum(['company_info', 'customer_info', 'static', 'dynamic_pricing', 'closing']),
  showForRetail: z.boolean(),
  showForInsurance: z.boolean(),
  requiresEstimates: z.boolean(),
  content: z.string(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  textColor: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
})

type SlideFormData = z.infer<typeof slideSchema>

interface SlideEditorDialogProps {
  slide: PresentationSlide
  templateFlowType: FlowType
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Background color presets
const BACKGROUND_COLORS = [
  { label: 'Dark Gray', value: '#1f2937' },
  { label: 'Blue', value: '#1e40af' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Green', value: '#059669' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Black', value: '#000000' },
  { label: 'White', value: '#ffffff' },
]

const TEXT_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Gray', value: '#6b7280' },
]

export function SlideEditorDialog({
  slide,
  templateFlowType,
  open,
  onOpenChange,
}: SlideEditorDialogProps) {
  const updateSlide = useUpdatePresentationSlide()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewSlide, setPreviewSlide] = useState<PresentationSlide>(slide)

  const form = useForm<SlideFormData>({
    resolver: zodResolver(slideSchema),
    defaultValues: {
      title: slide.title || '',
      slideType: slide.slide_type as any,
      showForRetail: slide.show_for_retail,
      showForInsurance: slide.show_for_insurance,
      requiresEstimates: slide.requires_estimates,
      content: typeof slide.content === 'object' && slide.content !== null 
        ? ((slide.content as any).body || (slide.content as any).text || '') 
        : '',
      backgroundColor: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).background_color || '#1f2937'
        : '#1f2937',
      backgroundImage: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).background_image || ''
        : '',
      textColor: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).text_color || '#ffffff'
        : '#ffffff',
      alignment: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).alignment || 'center'
        : 'center',
    },
  })

  // Reset form when slide changes
  useEffect(() => {
    form.reset({
      title: slide.title || '',
      slideType: slide.slide_type as any,
      showForRetail: slide.show_for_retail,
      showForInsurance: slide.show_for_insurance,
      requiresEstimates: slide.requires_estimates,
      content: typeof slide.content === 'object' && slide.content !== null 
        ? ((slide.content as any).body || (slide.content as any).text || '') 
        : '',
      backgroundColor: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).background_color || '#1f2937'
        : '#1f2937',
      backgroundImage: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).background_image || ''
        : '',
      textColor: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).text_color || '#ffffff'
        : '#ffffff',
      alignment: typeof slide.content === 'object' && slide.content !== null
        ? (slide.content as any).alignment || 'center'
        : 'center',
    })
    setPreviewSlide(slide)
  }, [slide.id, form])

  // Update preview when form values change
  useEffect(() => {
    const subscription = form.watch((formData) => {
      let structuredContent: any = {}
      
      switch (formData.slideType) {
        case 'static':
          structuredContent = {
            title: formData.title,
            body: formData.content,
            text_color: formData.textColor || '#ffffff',
            alignment: formData.alignment || 'center',
            background_color: formData.backgroundColor || '#1f2937',
            background_image: formData.backgroundImage || null,
          }
          break
        case 'company_info':
          structuredContent = {
            tagline: formData.content,
            show_contact: true
          }
          break
        case 'customer_info':
          structuredContent = {
            show_address: true,
            show_service_type: true
          }
          break
        case 'dynamic_pricing':
          structuredContent = {
            title: formData.title || 'Choose Your Perfect Solution',
            subtitle: formData.content || 'Select the option that best fits your needs'
          }
          break
        case 'closing':
          structuredContent = {
            title: formData.title || "Let's Get Started",
            subtitle: formData.content || 'Ready to move forward?',
            cta_text: 'Schedule Installation',
            background_color: '#1e40af'
          }
          break
      }

      setPreviewSlide({
        ...slide,
        title: formData.title || '',
        slide_type: formData.slideType as any,
        content: structuredContent,
      })
    })
    return () => subscription.unsubscribe()
  }, [form, slide])

  const onSubmit = async (data: SlideFormData) => {
    setIsSubmitting(true)
    try {
      // Structure content based on slide type
      let structuredContent: any = {}
      
      switch (data.slideType) {
        case 'static':
          structuredContent = {
            title: data.title,
            body: data.content,
            text_color: data.textColor || '#ffffff',
            alignment: data.alignment || 'center',
            background_color: data.backgroundColor || '#1f2937',
            background_image: data.backgroundImage || null,
          }
          break
        case 'company_info':
          structuredContent = {
            tagline: data.content,
            show_contact: true
          }
          break
        case 'customer_info':
          structuredContent = {
            show_address: true,
            show_service_type: true
          }
          break
        case 'dynamic_pricing':
          structuredContent = {
            title: 'Choose Your Perfect Solution',
            subtitle: 'Select the option that best fits your needs'
          }
          break
        case 'closing':
          structuredContent = {
            title: data.title || "Let's Get Started",
            subtitle: data.content || 'Ready to move forward?',
            cta_text: 'Schedule Installation',
            background_color: '#1e40af'
          }
          break
      }

      await updateSlide.mutateAsync({
        slideId: slide.id,
        updates: {
          title: data.title,
          slide_type: data.slideType as SlideType,
          content: structuredContent,
          show_for_retail: data.showForRetail,
          show_for_insurance: data.showForInsurance,
          requires_estimates: data.requiresEstimates,
        },
      })

      toast.success('Slide updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update slide:', error)
      toast.error('Failed to update slide')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Slide</DialogTitle>
          <DialogDescription>
            Update slide settings and content - see live preview on the right
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 overflow-hidden flex-1">
          {/* Left side: Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
            <Label htmlFor="title">Slide Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Welcome, Why Choose Us"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slideType">Slide Type *</Label>
            <Select
              value={form.watch('slideType')}
              onValueChange={(value) => form.setValue('slideType', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_info">Company Info</SelectItem>
                <SelectItem value="customer_info">Customer Info</SelectItem>
                <SelectItem value="static">Static Content</SelectItem>
                <SelectItem value="dynamic_pricing">Pricing Grid</SelectItem>
                <SelectItem value="closing">Closing/CTA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              {form.watch('slideType') === 'static' ? 'Slide Content' : 'Content'}
            </Label>
            {form.watch('slideType') === 'static' ? (
              <RichTextEditor
                key={slide.id} // Force remount when slide changes
                content={form.watch('content')}
                onChange={(html) => form.setValue('content', html)}
                placeholder="Enter your slide content with rich formatting..."
              />
            ) : (
              <Textarea
                id="content"
                placeholder="Enter slide content"
                rows={6}
                {...form.register('content')}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {form.watch('slideType') === 'static'
                ? 'Format your content with headings, lists, bold, italic, links, and images.'
                : 'Basic text content. Rich formatting is available for static slides.'
              }
            </p>
          </div>

          {/* Background Options for Static Slides */}
          {form.watch('slideType') === 'static' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-sm">Appearance</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <Select
                    value={form.watch('backgroundColor')}
                    onValueChange={(value) => form.setValue('backgroundColor', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <Select
                    value={form.watch('textColor')}
                    onValueChange={(value) => form.setValue('textColor', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alignment">Text Alignment</Label>
                <Select
                  value={form.watch('alignment')}
                  onValueChange={(value) => form.setValue('alignment', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundImage">Background Image URL (optional)</Label>
                <Input
                  id="backgroundImage"
                  placeholder="https://..."
                  {...form.register('backgroundImage')}
                />
                <p className="text-xs text-muted-foreground">
                  Optional background image. Will overlay on the background color.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Display Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showForRetail"
                  checked={form.watch('showForRetail')}
                  onCheckedChange={(checked) => form.setValue('showForRetail', !!checked)}
                />
                <Label htmlFor="showForRetail" className="font-normal cursor-pointer">
                  Show for Retail presentations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showForInsurance"
                  checked={form.watch('showForInsurance')}
                  onCheckedChange={(checked) => form.setValue('showForInsurance', !!checked)}
                />
                <Label htmlFor="showForInsurance" className="font-normal cursor-pointer">
                  Show for Insurance presentations
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresEstimates"
                  checked={form.watch('requiresEstimates')}
                  onCheckedChange={(checked) => form.setValue('requiresEstimates', !!checked)}
                />
                <Label htmlFor="requiresEstimates" className="font-normal cursor-pointer">
                  Requires estimates to be selected
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>

        {/* Right side: Live Preview */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 bg-background pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Live Preview</h3>
          </div>
          <SlidePreview slide={previewSlide} />
        </div>
      </div>
      </DialogContent>
    </Dialog>
  )
}
