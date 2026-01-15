'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StickyNote } from 'lucide-react'
import { NotesTimeline } from './notes-timeline'
import { AddNoteDialog } from './add-note-dialog'

interface NotesTabProps {
  leadId: string
}

export function NotesTab({ leadId }: NotesTabProps) {
  const [addNoteOpen, setAddNoteOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      <div className="flex justify-end">
        <Button onClick={() => setAddNoteOpen(true)} className="gap-2">
          <StickyNote className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Notes Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <NotesTimeline leadId={leadId} />
      </div>

      {/* Add Note Dialog */}
      <AddNoteDialog
        leadId={leadId}
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
      />
    </div>
  )
}
