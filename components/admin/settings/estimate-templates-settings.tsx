// Estimate Templates Settings Component
// Mirror of material-templates-settings.tsx for estimate templates

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  useEstimateTemplates,
  useDeleteEstimateTemplate,
} from '@/lib/hooks/use-estimate-templates'
import { EstimateTemplate } from '@/lib/types/estimate-templates'
import { EstimateTemplateDialog } from './estimate-template-dialog'
import { Plus, Edit2, Trash2, FileText } from 'lucide-react'
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

export function EstimateTemplatesSettings() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<EstimateTemplate | null>(null)

  const { data: templatesData, isLoading } = useEstimateTemplates()
  const templates = templatesData?.data || []
  const deleteTemplate = useDeleteEstimateTemplate()

  const handleCreate = () => {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  const handleEdit = (template: EstimateTemplate) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  const handleDeleteClick = (template: EstimateTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete.id)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTemplate(null)
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, EstimateTemplate[]>)

  const categoryLabels: Record<string, string> = {
    roofing: 'Roofing',
    siding: 'Siding',
    windows: 'Windows',
    gutters: 'Gutters',
    repairs: 'Repairs',
    other: 'Other',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Estimate Templates</h2>
          <p className="text-muted-foreground">
            Create reusable templates to quickly populate estimates with common line items
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No estimate templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first template to quickly populate estimates with common materials
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {categoryLabels[category] || 'Other'}
                <Badge variant="secondary">{categoryTemplates.length}</Badge>
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EstimateTemplateDialog
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        template={editingTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
