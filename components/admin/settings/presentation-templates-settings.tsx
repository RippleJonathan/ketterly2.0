'use client'

import { useState } from 'react'
import { Plus, Presentation, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  usePresentationTemplates,
  useDeletePresentationTemplate,
  useUpdatePresentationTemplate,
} from '@/lib/hooks/use-presentations'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { toast } from 'sonner'
import type { PresentationTemplate } from '@/lib/types/presentations'
import { TemplateEditorDialog } from './template-editor-dialog'
import { CreateTemplateDialog } from './create-template-dialog'

export function PresentationTemplatesSettings() {
  const { data: company } = useCurrentCompany()
  const { data: templates, isLoading } = usePresentationTemplates(company?.id || '')
  const deleteTemplate = useDeletePresentationTemplate()
  const updateTemplate = useUpdatePresentationTemplate()

  const [selectedTemplate, setSelectedTemplate] = useState<PresentationTemplate | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleToggleActive = async (template: PresentationTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        templateId: template.id,
        updates: { is_active: !template.is_active },
      })
      toast.success(template.is_active ? 'Template deactivated' : 'Template activated')
    } catch (error) {
      toast.error('Failed to update template')
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This will also delete all its slides.')) return

    try {
      await deleteTemplate.mutateAsync(templateId)
      toast.success('Template deleted')
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  if (isLoading) {
    return <div>Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Presentation Templates</h2>
          <p className="text-muted-foreground">
            Create and manage sales presentation templates
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Presentation className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.flow_type === 'both' 
                          ? 'Both'
                          : template.flow_type === 'retail'
                          ? 'Retail'
                          : 'Insurance'
                        }
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              {template.description && (
                <CardDescription className="mt-3 line-clamp-2">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTemplate(template)}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(template)}
                >
                  {template.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {(!templates || templates.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No presentation templates</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Create your first template to build interactive sales presentations for your leads
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companyId={company?.id || ''}
      />

      {/* Template Editor Dialog */}
      {selectedTemplate && (
        <TemplateEditorDialog
          template={selectedTemplate}
          open={!!selectedTemplate}
          onOpenChange={(open: boolean) => !open && setSelectedTemplate(null)}
        />
      )}
    </div>
  )
}
