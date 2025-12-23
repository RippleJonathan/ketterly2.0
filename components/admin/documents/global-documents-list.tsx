'use client'

import { useState } from 'react'
import { useGlobalDocuments } from '@/lib/hooks/use-documents'
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
import { Search, Download, FileText, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { downloadDocument } from '@/lib/api/document-library'
import { formatDistanceToNow } from 'date-fns'

export function GlobalDocumentsList() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<GlobalCompanyDocumentCategory | 'all'>('all')

  const { data: response } = useGlobalDocuments({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: search || undefined,
  })

  const documents = response?.data || []

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
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No documents found</p>
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
                    <h3 className="font-medium text-sm">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {LIBRARY_DOCUMENT_CATEGORY_LABELS[doc.category as GlobalCompanyDocumentCategory]}
                      </Badge>
                      {doc.version && (
                        <span>v{doc.version}</span>
                      )}
                      <span>
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </span>
                      <span>
                        Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadDocument(doc.file_url, doc.file_name)}
                className="ml-4 flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
