'use client'

import { useState } from 'react'
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
})

type SlideFormData = z.infer<typeof slideSchema>

interface SlideEditorDialogProps {
  slide: PresentationSlide
  templateFlowType: FlowType
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SlideEditorDialog({
  slide,
  templateFlowType,
  open,
  onOpenChange,
}: SlideEditorDialogProps) {
  const updateSlide = useUpdatePresentationSlide()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SlideFormData>({
    resolver: zodResolver(slideSchema),
    defaultValues: {
      title: slide.title || '',
      slideType: slide.slide_type as any,
      showForRetail: slide.show_for_retail,
      showForInsurance: slide.show_for_insurance,
      requiresEstimates: slide.requires_estimates,
      content: typeof slide.content === 'object' && slide.content !== null 
        ? (slide.content as any).text || '' 
        : '',
    },
  })

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
            text_color: '#ffffff',
            alignment: 'center'
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Slide</DialogTitle>
          <DialogDescription>
            Update slide settings and content
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 px-1">
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
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter slide content"
              rows={6}
              {...form.register('content')}
            />
            <p className="text-xs text-muted-foreground">
              Basic text content. Rich formatting and advanced content coming soon.
            </p>
          </div>

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

          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}
