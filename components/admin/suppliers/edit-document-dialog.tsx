'use client'

import { useEffect, useState } from 'react'
import { useSupplierDocument, useUpdateSupplierDocument } from '@/lib/hooks/use-supplier-documents'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { SupplierDocumentType, DOCUMENT_TYPE_LABELS } from '@/lib/types/supplier-documents'

interface EditDocumentDialogProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
}

export function EditDocumentDialog({
  isOpen,
  onClose,
  documentId,
}: EditDocumentDialogProps) {
  const { data: documentResponse } = useSupplierDocument(documentId)
  const updateDocument = useUpdateSupplierDocument()

  const [formData, setFormData] = useState({
    title: '',
    document_type: 'other' as SupplierDocumentType,
    notes: '',
    expiration_date: '',
  })

  // Load document data
  useEffect(() => {
    if (documentResponse?.data) {
      const doc = documentResponse.data
      setFormData({
        title: doc.title,
        document_type: doc.document_type,
        notes: doc.notes || '',
        expiration_date: doc.expiration_date || '',
      })
    }
  }, [documentResponse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await updateDocument.mutateAsync({
      documentId,
      updates: {
        title: formData.title,
        document_type: formData.document_type,
        notes: formData.notes || null,
        expiration_date: formData.expiration_date || null,
      },
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update document information (file cannot be changed)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Document Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) =>
                setFormData({ ...formData, document_type: value as SupplierDocumentType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expiration_date">Expiration Date (Optional)</Label>
            <Input
              id="expiration_date"
              type="date"
              value={formData.expiration_date}
              onChange={(e) =>
                setFormData({ ...formData, expiration_date: e.target.value })
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDocument.isPending}>
              {updateDocument.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
