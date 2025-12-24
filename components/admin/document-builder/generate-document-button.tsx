'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Loader2 } from 'lucide-react'
import { useDocumentTemplates, useCreateGeneratedDocument } from '@/lib/hooks/use-document-builder'
import { DocumentCategory } from '@/lib/types/document-builder'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface GenerateDocumentButtonProps {
  leadId?: string
  quoteId?: string
  projectId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function GenerateDocumentButton({
  leadId,
  quoteId,
  projectId,
  variant = 'default',
  size = 'default',
}: GenerateDocumentButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [documentTitle, setDocumentTitle] = useState('')

  const { data: templates, isLoading: templatesLoading } = useDocumentTemplates()
  const createDocument = useCreateGeneratedDocument()

  const handleGenerate = async () => {
    if (!selectedTemplateId || !documentTitle.trim()) return

    const result = await createDocument.mutateAsync({
      templateId: selectedTemplateId,
      title: documentTitle,
      leadId,
      quoteId,
      projectId,
    })

    if (result.data) {
      setOpen(false)
      router.push(`/admin/document-builder/generated/${result.data.id}`)
    }
  }

  const selectedTemplate = templates?.data?.find(t => t.id === selectedTemplateId)

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4 mr-2" />
        Generate Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Document</DialogTitle>
            <DialogDescription>
              Create a document from a template with data automatically filled in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g., Service Agreement - Smith Residence"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Template *</Label>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {templates?.data?.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'ring-2 ring-primary'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {template.name}
                            </CardTitle>
                            {template.description && (
                              <CardDescription className="text-sm">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          {template.is_global && (
                            <Badge variant="secondary" className="ml-2">
                              Platform
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                        </p>
                      </CardHeader>
                    </Card>
                  ))}
                  {(!templates?.data || templates.data.length === 0) && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No templates available
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplateId || !documentTitle.trim() || createDocument.isPending}
              >
                {createDocument.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
