'use client'

import { useState } from 'react'
import { useGeneratedDocuments, useDeleteGeneratedDocument, useGenerateDocumentShareLink } from '@/lib/hooks/use-document-builder'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, FileText, Link2, MoreVertical, Plus, Share2, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/types/document-builder'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { toast } from 'sonner'

export function GeneratedDocumentsList() {
  const router = useRouter()
  const { data: documents, isLoading } = useGeneratedDocuments()
  const deleteDocument = useDeleteGeneratedDocument()
  const generateShareLink = useGenerateDocumentShareLink()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const selectedDocument = documents?.data?.find(d => d.id === selectedDocumentId)

  const handleDelete = async () => {
    if (!selectedDocumentId) return

    await deleteDocument.mutateAsync(selectedDocumentId)
    setDeleteDialogOpen(false)
    setSelectedDocumentId(null)
  }

  const handleGenerateShareLink = async (documentId: string) => {
    const result = await generateShareLink.mutateAsync({ documentId })
    
    if (result.data?.token) {
      const shareUrl = `${window.location.origin}/sign/${result.data.token}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!documents?.data || documents.data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate documents from your templates
          </p>
          <Button onClick={() => router.push('/admin/document-builder')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Related To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.data.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {document.title}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {document.template?.name || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {document.lead && (
                      <span className="text-sm">
                        Lead: {document.lead.full_name}
                      </span>
                    )}
                    {document.quote && (
                      <span className="text-sm text-muted-foreground">
                        Quote #{document.quote.quote_number}
                      </span>
                    )}
                    {document.project && (
                      <span className="text-sm text-muted-foreground">
                        Project: {document.project.project_number}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={DOCUMENT_STATUS_COLORS[document.status]}>
                    {DOCUMENT_STATUS_LABELS[document.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(document.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/document-builder/generated/${document.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        View/Edit
                      </DropdownMenuItem>
                      {!document.share_token && (
                        <DropdownMenuItem
                          onClick={() => handleGenerateShareLink(document.id)}
                          disabled={generateShareLink.isPending}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Generate Share Link
                        </DropdownMenuItem>
                      )}
                      {document.share_token && (
                        <DropdownMenuItem
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/sign/${document.share_token}`
                            navigator.clipboard.writeText(shareUrl)
                            toast.success('Share link copied to clipboard!')
                          }}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy Share Link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedDocumentId(document.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedDocument?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
