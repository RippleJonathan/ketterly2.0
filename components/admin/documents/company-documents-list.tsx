'use client'

import { useState } from 'react'
import { useCompanyDocuments, useDeleteCompanyDocument, useArchiveCompanyDocument } from '@/lib/hooks/use-documents'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { GlobalCompanyDocumentCategory, LIBRARY_DOCUMENT_CATEGORY_LABELS } from '@/lib/types/documents'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Download, FileText, Filter, MoreVertical, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { downloadDocument } from '@/lib/api/document-library'
import { formatDistanceToNow } from 'date-fns'
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

interface CompanyDocumentsListProps {
  templatesOnly?: boolean
}

export function CompanyDocumentsList({ templatesOnly = false }: CompanyDocumentsListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<GlobalCompanyDocumentCategory | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: user } = useCurrentUser()
  const isAdmin = user?.data?.role === 'admin' || user?.data?.role === 'super_admin'

  const { data: response } = useCompanyDocuments({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: search || undefined,
    is_archived: showArchived ? true : false,
    is_template: templatesOnly ? true : undefined,
  })

  const deleteMutation = useDeleteCompanyDocument()
  const archiveMutation = useArchiveCompanyDocument()

  const documents = response?.data || []

  const handleDelete = async (documentId: string) => {
    await deleteMutation.mutateAsync(documentId)
    setDeleteConfirm(null)
  }

  const handleArchive = async (documentId: string, archived: boolean) => {
    await archiveMutation.mutateAsync({ documentId, archived })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as any)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(LIBRARY_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-4 w-4 mr-2" />
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {templatesOnly ? 'No templates found' : 'No documents found'}
          </p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Contact your admin to upload documents
            </p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 hover:bg-muted/50 transition-colors flex items-start justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{doc.title}</h3>
                      {doc.is_archived && (
                        <Badge variant="secondary" className="text-xs">Archived</Badge>
                      )}
                      {doc.is_template && (
                        <Badge variant="outline" className="text-xs">Template</Badge>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {LIBRARY_DOCUMENT_CATEGORY_LABELS[doc.category as GlobalCompanyDocumentCategory]}
                      </Badge>
                      <span>
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </span>
                      <span>
                        Uploaded by {doc.uploader?.full_name || 'Unknown'}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadDocument(doc.file_url, doc.file_name)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleArchive(doc.id, !doc.is_archived)}
                      >
                        {doc.is_archived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(doc.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
