'use client'

import { useState } from 'react'
import { useSupplierDocuments, useDeleteSupplierDocument } from '@/lib/hooks/use-supplier-documents'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Download, Edit, Trash2, FileText, AlertCircle } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, SupplierDocumentType } from '@/lib/types/supplier-documents'
import { UploadDocumentDialog } from './upload-document-dialog'
import { EditDocumentDialog } from './edit-document-dialog'
import { formatBytes } from '@/lib/utils/formatting'
import { formatDate, isPast } from 'date-fns'
import { getDocumentDownloadUrl } from '@/lib/api/supplier-documents'

interface SupplierDocumentsProps {
  supplierId: string
  supplierName: string
}

export function SupplierDocuments({ supplierId, supplierName }: SupplierDocumentsProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)

  const { data: documentsResponse, isLoading } = useSupplierDocuments(supplierId)
  const deleteDocument = useDeleteSupplierDocument()

  const documents = documentsResponse?.data || []

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data: url, error } = await getDocumentDownloadUrl(filePath)
      if (error || !url) {
        throw new Error('Failed to get download URL')
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    await deleteDocument.mutateAsync(documentId)
  }

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false
    return isPast(new Date(expirationDate))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Manage documents for {supplierName}
              </CardDescription>
            </div>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
              <p className="text-muted-foreground mt-2">
                Upload W-9s, insurance certificates, contracts, and more
              </p>
              <Button className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {document.title}
                          {isExpired(document.expiration_date) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        {document.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {document.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={DOCUMENT_TYPE_COLORS[document.document_type]}>
                          {DOCUMENT_TYPE_LABELS[document.document_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{document.file_name}</div>
                          <div className="text-muted-foreground">
                            {formatBytes(document.file_size)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(new Date(document.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {document.expiration_date ? (
                          <span
                            className={
                              isExpired(document.expiration_date)
                                ? 'text-red-600 font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {formatDate(new Date(document.expiration_date), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document.file_path, document.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDocumentId(document.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(document.id, document.title)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        supplierId={supplierId}
        supplierName={supplierName}
      />

      {/* Edit Dialog */}
      {editingDocumentId && (
        <EditDocumentDialog
          isOpen={!!editingDocumentId}
          onClose={() => setEditingDocumentId(null)}
          documentId={editingDocumentId}
        />
      )}
    </div>
  )
}
