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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreatePresentationTemplate } from '@/lib/hooks/use-presentations'
import { toast } from 'sonner'
import type { FlowType } from '@/lib/types/presentations'

const templateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  flowType: z.enum(['retail', 'insurance', 'both']),
})

type TemplateFormData = z.infer<typeof templateSchema>

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}

export function CreateTemplateDialog({ open, onOpenChange, companyId }: CreateTemplateDialogProps) {
  const createTemplate = useCreatePresentationTemplate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      flowType: 'retail',
    },
  })

  const onSubmit = async (data: TemplateFormData) => {
    if (!companyId) {
      toast.error('Company ID is required')
      return
    }

    setIsSubmitting(true)
    try {
      await createTemplate.mutateAsync({
        company_id: companyId,
        name: data.name,
        description: data.description || undefined,
        flow_type: data.flowType as FlowType,
        is_active: true,
      })

      toast.success('Template created successfully')
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create template:', error)
      toast.error('Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Presentation Template</DialogTitle>
          <DialogDescription>
            Create a new presentation template. You'll be able to add slides after creating it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Standard Sales Presentation"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe when to use this template..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>Flow Type *</Label>
            <RadioGroup
              value={form.watch('flowType')}
              onValueChange={(value) => form.setValue('flowType', value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="retail" id="retail" />
                <Label htmlFor="retail" className="font-normal cursor-pointer">
                  Retail Only - For direct customer sales
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="insurance" id="insurance" />
                <Label htmlFor="insurance" className="font-normal cursor-pointer">
                  Insurance Only - For insurance claims
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">
                  Both - Can be used for retail or insurance
                </Label>
              </div>
            </RadioGroup>
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
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
