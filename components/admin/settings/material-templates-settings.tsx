'use client'

import { useState } from 'react'
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/lib/hooks/use-material-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Search, Copy, Trash2, Edit, PackagePlus } from 'lucide-react'
import { MaterialTemplate } from '@/lib/types/material-templates'
import { MaterialTemplateDialog } from './material-template-dialog'

export function MaterialTemplatesSettings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MaterialTemplate | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null)

  const { data: templatesResponse, isLoading } = useTemplates({
    category: selectedCategory,
    is_active: true,
    search: searchQuery || undefined,
  })

  const deleteTemplate = useDeleteTemplate()
  const duplicateTemplate = useDuplicateTemplate()

  const templates = templatesResponse?.data || []

  const categories = Array.from(new Set(templates.map(t => t.category)))

  const handleDelete = async () => {
    if (!deletingTemplateId) return
    await deleteTemplate.mutateAsync(deletingTemplateId)
    setDeletingTemplateId(null)
  }

  const handleDuplicate = async (template: MaterialTemplate) => {
    const newName = `${template.name} (Copy)`
    await duplicateTemplate.mutateAsync({
      templateId: template.id,
      newName,
    })
    setDuplicatingTemplateId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Material Templates</h2>
          <p className="text-muted-foreground">
            Create reusable templates to auto-generate material orders from measurements
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(undefined)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <PackagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first material template to get started
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2">
                  {template.category}
                </Badge>
              </div>

              {/* Items Preview */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {template.items.length} item{template.items.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-1">
                  {template.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="text-xs flex items-center justify-between">
                      <span className="text-muted-foreground truncate flex-1">
                        {item.item}
                      </span>
                      <span className="text-xs font-mono ml-2">
                        {item.per_square} {item.unit}/sq
                      </span>
                    </div>
                  ))}
                  {template.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      + {template.items.length - 3} more
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(template)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(template)}
                  disabled={duplicateTemplate.isPending}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingTemplateId(template.id)}
                  disabled={deleteTemplate.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <MaterialTemplateDialog
        isOpen={isCreateDialogOpen || !!editingTemplate}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setEditingTemplate(null)
        }}
        template={editingTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplateId} onOpenChange={() => setDeletingTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
