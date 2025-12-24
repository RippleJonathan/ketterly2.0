'use client'

import { useState } from 'react'
import { useDocumentTemplates, useDuplicateDocumentTemplate, useDeleteDocumentTemplate } from '@/lib/hooks/use-document-builder'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Copy, Edit, FileText, MoreVertical, Plus, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_CATEGORY_COLORS } from '@/lib/types/document-builder'
import { Skeleton } from '@/components/ui/skeleton'

export function TemplatesList() {
  const router = useRouter()
  const { data: templates, isLoading } = useDocumentTemplates()
  const duplicateTemplate = useDuplicateDocumentTemplate()
  const deleteTemplate = useDeleteDocumentTemplate()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')

  const selectedTemplate = templates?.data?.find(t => t.id === selectedTemplateId)

  const handleDuplicate = async () => {
    if (!selectedTemplateId || !newTemplateName.trim()) return

    await duplicateTemplate.mutateAsync({
      templateId: selectedTemplateId,
      newName: newTemplateName,
    })

    setDuplicateDialogOpen(false)
    setNewTemplateName('')
    setSelectedTemplateId(null)
  }

  const handleDelete = async () => {
    if (!selectedTemplateId) return

    await deleteTemplate.mutateAsync(selectedTemplateId)
    setDeleteDialogOpen(false)
    setSelectedTemplateId(null)
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Separate global and company templates
  const globalTemplates = templates?.data?.filter(t => t.company_id === null) || []
  const companyTemplates = templates?.data?.filter(t => t.company_id !== null) || []

  return (
    <>
      <div className="space-y-6">
        {/* Global Templates */}
        {globalTemplates.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Platform Templates</h3>
              <p className="text-sm text-muted-foreground">
                Pre-built templates you can duplicate and customize
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {globalTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </CardTitle>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplateId(template.id)
                              setNewTemplateName(`${template.name} (Copy)`)
                              setDuplicateDialogOpen(true)
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant={DOCUMENT_CATEGORY_COLORS[template.category] as any}>
                      {DOCUMENT_CATEGORY_LABELS[template.category]}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Company Templates */}
        {companyTemplates.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Your Templates</h3>
              <p className="text-sm text-muted-foreground">
                Custom templates for your company
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companyTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </CardTitle>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/document-builder/templates/${template.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplateId(template.id)
                              setNewTemplateName(`${template.name} (Copy)`)
                              setDuplicateDialogOpen(true)
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedTemplateId(template.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={DOCUMENT_CATEGORY_COLORS[template.category] as any}>
                        {DOCUMENT_CATEGORY_LABELS[template.category]}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {globalTemplates.length === 0 && companyTemplates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first document template to get started
              </p>
              <Button onClick={() => router.push('/admin/document-builder/templates/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedTemplate?.name}" that you can customize
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Template Name</Label>
              <Input
                id="new-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!newTemplateName.trim() || duplicateTemplate.isPending}
            >
              {duplicateTemplate.isPending ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTemplate?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
