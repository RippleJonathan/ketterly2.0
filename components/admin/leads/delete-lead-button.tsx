'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteLead } from '@/lib/hooks/use-leads'

interface DeleteLeadButtonProps {
  leadId: string
  leadName: string
}

export function DeleteLeadButton({ leadId, leadName }: DeleteLeadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const deleteLead = useDeleteLead()

  const handleDelete = async () => {
    await deleteLead.mutateAsync(leadId)
    setIsOpen(false)
    router.push('/admin/leads')
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-red-600 hover:text-red-700"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{leadName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
