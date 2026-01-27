'use client'

import { useState } from 'react'
import { useUploadSupplierDocument } from '@/lib/hooks/use-supplier-documents'
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
import { Loader2, Upload } from 'lucide-react'
import { SupplierDocumentType, DOCUMENT_TYPE_LABELS } from '@/lib/types/supplier-documents'

interface UploadDocumentDialogProps {
  isOpen: boolean
  onClose: () => void
  supplierId: string
  supplierName: string
}

export function UploadDocumentDialog({
  isOpen,
  onClose,
  supplierId,
  supplierName,
}: UploadDocumentDialogProps) {
  const uploadDocument = useUploadSupplierDocument(supplierId)

  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'other' as SupplierDocumentType,
    notes: '',
    expiration_date: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '')
        setFormData({ ...formData, title: nameWithoutExt })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    await uploadDocument.mutateAsync({
      file,
      metadata: {
        document_type: formData.document_type,
        title: formData.title,
        notes: formData.notes || undefined,
        expiration_date: formData.expiration_date || undefined,
      },
    })

    // Reset and close
    setFile(null)
    setFormData({
      title: '',
      document_type: 'other',
      notes: '',
      expiration_date: '',
    })
    onClose()
  }

  const handleClose = () => {
    setFile(null)
    setFormData({
      title: '',
      document_type: 'other',
      notes: '',
      expiration_date: '',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for {supplierName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">
              File <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., 2026 W-9 Form"
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
            <p className="text-xs text-muted-foreground">
              For insurance, licenses, certifications, etc.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadDocument.isPending || !file}>
              {uploadDocument.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
