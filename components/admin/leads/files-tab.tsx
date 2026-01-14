'use client'

import { useState } from 'react'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/lib/hooks/use-documents'
import { useGeneratedDocuments } from '@/lib/hooks/use-document-builder'
import { useQuotes } from '@/lib/hooks/use-quotes'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useGenerateQuotePDF } from '@/lib/hooks/use-generate-quote-pdf'
import { getDocumentSignedUrl } from '@/lib/api/documents'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { DocumentType, DOCUMENT_TYPE_LABELS, SIGNATURE_STATUS_LABELS } from '@/lib/types/documents'
import { Upload, FileText, MoreVertical, Download, Share2, Trash2, Eye, CheckCircle2, Clock, XCircle, FileIcon, ChevronDown, ChevronUp, Mail, ScanLine, FileSignature } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatBytes } from '@/lib/utils'
import { toast } from 'sonner'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { ScanDocumentDialog } from './scan-document-dialog'
import { CompanySignatureDialog } from '@/components/admin/document-builder/company-signature-dialog'
import { useRouter } from 'next/navigation'

interface FilesTabProps {
  leadId: string
  leadName: string
}

export function FilesTab({ leadId, leadName }: FilesTabProps) {
  const router = useRouter()
  const { data: company } = useCurrentCompany()
  const { data: documentsResponse, isLoading: isLoadingDocs } = useDocuments(leadId)
  const { data: generatedDocsResponse, isLoading: isLoadingGenerated } = useGeneratedDocuments({ leadId })
  const { data: quotes } = useQuotes({ leadId })
  const { generateAndDownload, isGenerating } = useGenerateQuotePDF()
  const uploadedDocuments = documentsResponse?.data || []
  const generatedDocuments = generatedDocsResponse?.data || []

  const [selectedType, setSelectedType] = useState<'all' | 'uploaded' | 'generated'>('all')
  const [isUploadExpanded, setIsUploadExpanded] = useState(false)
  const [emailingSigned, setEmailingSigned] = useState<{ [key: string]: boolean }>({})
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false)

  const isLoading = isLoadingDocs || isLoadingGenerated

  // Filter quotes that have both signatures (fully executed contracts)
  const signedQuotes = quotes?.filter(q => q.status === 'accepted') || []

  // Combine and filter documents
  const allDocuments = [
    ...uploadedDocuments.map(doc => ({ ...doc, documentSource: 'uploaded' as const })),
    ...generatedDocuments.map(doc => ({ ...doc, documentSource: 'generated' as const }))
  ]

  const filteredDocuments = selectedType === 'all'
    ? allDocuments
    : allDocuments.filter(doc => doc.documentSource === selectedType)



  // Handler to fetch full quote and generate PDF
  const handleDownloadPDF = async (quoteId: string) => {
    try {
      // Fetch full quote with all relations
      const supabase = createClient()
      const { data: fullQuote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          line_items:quote_line_items(*),
          lead:leads(id, full_name, email, phone, address, city, state, zip)
        `)
        .eq('id', quoteId)
        .single()

      if (error || !fullQuote) {
        toast.error('Failed to fetch quote details')
        return
      }

      // Generate and download PDF (no storage upload)
      await generateAndDownload(fullQuote)
    } catch (error) {
      console.error('Download PDF error:', error)
      toast.error('Failed to download PDF')
    }
  }

  // Handler to email signed contract to customer
  const handleEmailSignedContract = async (quoteId: string) => {
    try {
      setEmailingSigned(prev => ({ ...prev, [quoteId]: true }))
      
      const response = await fetch(`/api/quotes/${quoteId}/send-signed`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Signed contract sent successfully!')
    } catch (error: any) {
      console.error('Email signed contract error:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setEmailingSigned(prev => ({ ...prev, [quoteId]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Scan Document Dialog */}
      <ScanDocumentDialog
        open={isScanDialogOpen}
        onOpenChange={setIsScanDialogOpen}
        leadId={leadId}
        leadName={leadName}
        onSuccess={() => {
          // Refresh documents list
          // React Query will automatically refetch
        }}
      />

      {/* Upload Section - Collapsible */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsUploadExpanded(!isUploadExpanded)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Upload files related to {leadName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsScanDialogOpen(true)
                }}
                className="gap-2"
              >
                <ScanLine className="h-4 w-4" />
                Scan Document
              </Button>
              {isUploadExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        </CardHeader>
        {isUploadExpanded && (
          <CardContent>
            <DocumentUploadForm leadId={leadId} />
          </CardContent>
        )}
      </Card>

      {/* Signed Contracts Section */}
      {signedQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Signed Contracts
            </CardTitle>
            <CardDescription>
              Fully executed contracts ready to download
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signedQuotes.map(quote => (
                <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{quote.quote_number}</p>
                      <p className="text-sm text-gray-500">
                        {quote.option_label || 'Quote'} • ${quote.total_amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(quote.id)}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isGenerating ? 'Generating...' : 'Download PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailSignedContract(quote.id)}
                      disabled={emailingSigned[quote.id]}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {emailingSigned[quote.id] ? 'Sending...' : 'Email PDF'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Documents</CardTitle>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as 'all' | 'uploaded' | 'generated')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="uploaded">Uploaded Files</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-1">No documents yet</p>
              <p className="text-sm">Upload or generate your first document to get started</p>
            </div>
          ) : (
            <DocumentsTable documents={filteredDocuments} leadId={leadId} router={router} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentUploadForm({ leadId }: { leadId: string }) {
  const { data: company } = useCurrentCompany()
  const uploadDocument = useUploadDocument()

  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('other')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibleToCustomer, setVisibleToCustomer] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        // Auto-fill title with filename (without extension)
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !company) {
      toast.error('Please select a file')
      return
    }

    await uploadDocument.mutateAsync({
      leadId,
      file,
      documentData: {
        company_id: company.id,
        lead_id: leadId,
        document_type: documentType,
        title: title || file.name,
        description: description || null,
        visible_to_customer: visibleToCustomer,
        // uploaded_by will be set in the hook using auth.uid()
      },
    })

    // Reset form
    setFile(null)
    setTitle('')
    setDescription('')
    setVisibleToCustomer(false)
    setDocumentType('other')
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type *</Label>
          <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
            <SelectTrigger id="document-type">
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

        <div className="space-y-2">
          <Label htmlFor="document-title">Document Title *</Label>
          <Input
            id="document-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Signed Contract"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this document"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Upload File *</Label>
        <Input
          id="file"
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.ogg,.aac"
          required
        />
        {file && (
          <p className="text-sm text-gray-500">
            Selected: {file.name} ({formatBytes(file.size)})
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="visible-to-customer"
          checked={visibleToCustomer}
          onCheckedChange={(checked) => setVisibleToCustomer(checked as boolean)}
        />
        <Label
          htmlFor="visible-to-customer"
          className="text-sm font-normal cursor-pointer"
        >
          Make visible to customer (can be shared via link)
        </Label>
      </div>

      <Button type="submit" disabled={!file || uploadDocument.isPending}>
        {uploadDocument.isPending ? (
          <>Uploading...</>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </>
        )}
      </Button>
    </form>
  )
}

function DocumentsTable({ documents, leadId, router }: { documents: any[], leadId: string, router: any }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<any>(null)
  const [emailingDocument, setEmailingDocument] = useState<{ [key: string]: boolean }>({})
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [documentToSign, setDocumentToSign] = useState<any>(null)
  const { data: company } = useCurrentCompany()
  const deleteDocument = useDeleteDocument()

  const handleDeleteClick = (document: any) => {
    setDocumentToDelete(document)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync({
        documentId: documentToDelete.id,
        leadId,
      })
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleDownload = async (doc: any) => {
    try {
      // Get signed URL for download
      const { data: signedUrl, error } = await getDocumentSignedUrl(doc.file_url)
      if (error || !signedUrl) {
        throw new Error(error?.message || 'Failed to get signed URL')
      }

      const response = await fetch(signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download document')
    }
  }

  const handleEmailDocument = async (documentId: string, isGenerated: boolean = false) => {
    try {
      setEmailingDocument(prev => ({ ...prev, [documentId]: true }))
      
      const endpoint = isGenerated 
        ? `/api/generated-documents/${documentId}/send-email`
        : `/api/documents/${documentId}/send-email`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      toast.success('Document sent successfully!')
    } catch (error: any) {
      console.error('Email document error:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setEmailingDocument(prev => ({ ...prev, [documentId]: false }))
    }
  }

  const getSignatureStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      case 'signed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Signed
        </Badge>
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Declined
        </Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      default:
        return null
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => {
              const isGenerated = document.documentSource === 'generated'
              const createdAt = isGenerated ? document.created_at : document.uploaded_at
              
              return (
              <TableRow key={`${document.documentSource}-${document.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isGenerated ? (
                      <FileSignature className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">{document.title}</p>
                      {document.description && (
                        <p className="text-sm text-gray-500">{document.description}</p>
                      )}
                      {isGenerated && document.template && (
                        <p className="text-xs text-gray-400">Template: {document.template.name}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={isGenerated ? "default" : "secondary"}>
                    {isGenerated ? 'Generated' : 'Uploaded'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isGenerated ? (
                    getSignatureStatusBadge(document.status)
                  ) : document.requires_signature && document.signature_status ? (
                    getSignatureStatusBadge(document.signature_status)
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</p>
                    {!isGenerated && document.uploaded_by_user && (
                      <p className="text-gray-500">by {document.uploaded_by_user.full_name}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {!isGenerated && document.file_size ? formatBytes(document.file_size) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isGenerated ? (
                        <>
                          <DropdownMenuItem onClick={() => {
                            router.push(`/admin/document-builder/generated/${document.id}`)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Document
                          </DropdownMenuItem>
                          {!document.company_signature_data && (
                            <DropdownMenuItem onClick={() => {
                              setDocumentToSign(document)
                              setSignDialogOpen(true)
                            }}>
                              <FileSignature className="h-4 w-4 mr-2" />
                              Company Rep Sign
                            </DropdownMenuItem>
                          )}
                          {document.share_token && (
                            <DropdownMenuItem onClick={() => {
                              const shareUrl = `${window.location.origin}/sign/${document.share_token}`
                              navigator.clipboard.writeText(shareUrl)
                              toast.success('Share link copied to clipboard')
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Copy Share Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleEmailDocument(document.id, true)}
                            disabled={emailingDocument[document.id]}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {emailingDocument[document.id] ? 'Sending...' : 'Email to Customer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast.info('PDF download coming soon')
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={async () => {
                            const { data: signedUrl, error } = await getDocumentSignedUrl(document.file_url)
                            if (error || !signedUrl) {
                              toast.error('Failed to view document')
                            } else {
                              // Create a download link for mobile compatibility
                              const link = document.createElement('a')
                              link.href = signedUrl
                              link.target = '_blank'
                              link.rel = 'noopener noreferrer'
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(document)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEmailDocument(document.id, false)}
                            disabled={emailingDocument[document.id]}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {emailingDocument[document.id] ? 'Sending...' : 'Email to Customer'}
                          </DropdownMenuItem>
                          {document.visible_to_customer && (
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(document)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {documentToSign && company && (
        <CompanySignatureDialog
          open={signDialogOpen}
          onOpenChange={setSignDialogOpen}
          documentId={documentToSign.id}
          companyId={company.id}
        />
      )}
    </>
  )
}
