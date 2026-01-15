'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateActivity } from '@/lib/hooks/use-activities'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

const noteFormSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
})

type NoteFormData = z.infer<typeof noteFormSchema>

interface AddNoteDialogProps {
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  replyToActivityId?: string
  replyToUserName?: string
}

export function AddNoteDialog({ 
  leadId, 
  open, 
  onOpenChange,
  replyToActivityId,
  replyToUserName 
}: AddNoteDialogProps) {
  const createActivity = useCreateActivity('lead', leadId)

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      message: '',
    },
  })

  const onSubmit = async (data: NoteFormData) => {
    // Get current user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const title = replyToActivityId 
      ? `Reply to ${replyToUserName || 'note'}` 
      : 'Note'

    await createActivity.mutateAsync({
      entity_type: 'lead',
      entity_id: leadId,
      activity_type: 'note',
      title,
      description: data.message,
      created_by: user?.id,
      parent_activity_id: replyToActivityId || null,
    } as any)

    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {replyToActivityId ? `Reply to ${replyToUserName}'s note` : 'Add Note'}
          </DialogTitle>
          <DialogDescription>
            {replyToActivityId 
              ? 'Your reply will be added to the conversation thread' 
              : 'Add a note about this lead. Team members will be notified.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your note here..."
              rows={6}
              className="resize-none"
              {...form.register('message')}
            />
            {form.formState.errors.message && (
              <p className="text-sm text-red-600">{form.formState.errors.message.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createActivity.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? 'Adding...' : replyToActivityId ? 'Reply' : 'Add Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
