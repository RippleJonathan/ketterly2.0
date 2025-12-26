'use client'

import { useState } from 'react'
import { Plus, Presentation, Settings, Eye, Trash2, Copy } from 'lucide-react'
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

export default function PresentationsSettingsPage() {
  const { data: company } = useCurrentCompany()
  const { data: templates, isLoading } = usePresentationTemplates(company?.id || '')
  const deleteTemplate = useDeletePresentationTemplate()
  const updateTemplate = useUpdatePresentationTemplate()

  const [selectedTemplate, setSelectedTemplate] = useState<PresentationTemplate | null>(null)

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
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await deleteTemplate.mutateAsync(templateId)
      toast.success('Template deleted')
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Presentation Templates</h1>
          <p className="text-muted-foreground">
            Create and manage sales presentation templates
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Presentation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">
                        {template.flow_type === 'both' 
                          ? 'Retail & Insurance'
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
                <CardDescription className="mt-2">
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
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Slides
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
              <p className="text-sm text-muted-foreground mb-4">
                Create your first template to get started
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Editor Modal - Coming next */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Edit Template: {selectedTemplate.name}</h2>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground">Slide builder coming next...</p>
              <Button onClick={() => setSelectedTemplate(null)} className="mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
