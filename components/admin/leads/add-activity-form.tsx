'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateActivity } from '@/lib/hooks/use-activities'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, Mail, MessageSquare, Calendar, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const activityFormSchema = z.object({
  activity_type: z.enum(['note', 'call', 'email', 'sms', 'meeting', 'other']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
})

type ActivityFormData = z.infer<typeof activityFormSchema>

interface AddActivityFormProps {
  leadId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'Text Message', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'other', label: 'Other', icon: FileText },
] as const

export function AddActivityForm({ leadId, onSuccess, onCancel }: AddActivityFormProps) {
  const createActivity = useCreateActivity('lead', leadId)
  const [selectedType, setSelectedType] = useState<string>('note')

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      activity_type: 'note',
      title: '',
      description: '',
    },
  })

  const onSubmit = async (data: ActivityFormData) => {
    // Get current user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await createActivity.mutateAsync({
      entity_type: 'lead',
      entity_id: leadId,
      activity_type: data.activity_type,
      title: data.title,
      description: data.description,
      created_by: user?.id,
    })

    form.reset()
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="activity_type">Activity Type</Label>
        <Select
          value={form.watch('activity_type')}
          onValueChange={(value) => {
            form.setValue('activity_type', value as any)
            setSelectedType(value)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {form.formState.errors.activity_type && (
          <p className="text-sm text-red-600">{form.formState.errors.activity_type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder={
            selectedType === 'call' ? 'e.g., Called to discuss quote' :
            selectedType === 'email' ? 'e.g., Sent follow-up email' :
            selectedType === 'sms' ? 'e.g., Texted appointment reminder' :
            selectedType === 'meeting' ? 'e.g., On-site consultation' :
            'e.g., Customer requested additional information'
          }
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add additional details..."
          rows={4}
          {...form.register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={createActivity.isPending}>
          {createActivity.isPending ? 'Adding...' : 'Add Activity'}
        </Button>
      </div>
    </form>
  )
}
