'use client'

import { useState } from 'react'
import { useActivities } from '@/lib/hooks/use-activities'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddNoteDialog } from './add-note-dialog'

interface ActivityTimelineProps {
  leadId: string
}

export function NotesTimeline({ leadId }: ActivityTimelineProps) {
  const { data: activitiesResponse, isLoading } = useActivities('lead', leadId)
  const activities = activitiesResponse?.data || []
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [replyToActivity, setReplyToActivity] = useState<{ id: string; userName: string } | null>(null)

  // Filter only notes
  const notes = activities.filter(a => a.activity_type === 'note')

  // Group notes by parent (thread them)
  const topLevelNotes = notes.filter(note => !note.parent_activity_id)
  const noteThreads = topLevelNotes.map(note => ({
    parent: note,
    replies: notes.filter(reply => reply.parent_activity_id === note.id)
  }))

  const handleReply = (activityId: string, userName: string) => {
    setReplyToActivity({ id: activityId, userName })
    setReplyDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-gray-100 animate-pulse rounded" />
        <div className="h-20 bg-gray-100 animate-pulse rounded" />
        <div className="h-20 bg-gray-100 animate-pulse rounded" />
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">No notes yet</p>
        <p className="text-sm">Add your first note using the button above</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {noteThreads.map(({ parent, replies }) => (
          <div key={parent.id} className="border border-gray-200 rounded-lg">
            {/* Parent Note */}
            <div className="p-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {parent.created_by_user?.full_name || 'Unknown User'}
                    </p>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(parent.created_at), { addSuffix: true })}
                    </time>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {parent.description || parent.title}
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2"
                      onClick={() => handleReply(parent.id, parent.created_by_user?.full_name || 'User')}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies */}
            {replies.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-blue-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {reply.created_by_user?.full_name || 'Unknown User'}
                        </p>
                        <time className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </time>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                        {reply.description || reply.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <AddNoteDialog
        leadId={leadId}
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        replyToActivityId={replyToActivity?.id}
        replyToUserName={replyToActivity?.userName}
      />
    </>
  )
}
