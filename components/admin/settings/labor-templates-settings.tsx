// Labor Templates Settings Component
// Displays list of labor templates with create/edit/delete actions

'use client'

import { useState } from 'react'
import { useLaborTemplates, useDeleteLaborTemplate } from '@/lib/hooks/use-labor-templates'
import { LaborTemplate } from '@/lib/types/labor-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Edit, Trash2, Search, Clock, Users } from 'lucide-react'
import { LaborTemplateDialog } from './labor-template-dialog'

export function LaborTemplatesSettings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<LaborTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: templatesData, isLoading } = useLaborTemplates({
    search: searchQuery || undefined,
  })
  const templates = templatesData?.data || []
  const deleteTemplate = useDeleteLaborTemplate()

  const handleCreate = () => {
    setSelectedTemplate(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (template: LaborTemplate) => {
    setSelectedTemplate(template)
    setIsDialogOpen(true)
  }

  const handleDelete = async (template: LaborTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return
    await deleteTemplate.mutateAsync(template.id)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setSelectedTemplate(null)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'roofing':
        return 'bg-blue-100 text-blue-800'
      case 'siding':
        return 'bg-green-100 text-green-800'
      case 'windows':
        return 'bg-purple-100 text-purple-800'
      case 'gutters':
        return 'bg-orange-100 text-orange-800'
      case 'repairs':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Labor Order Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create reusable labor task lists for common jobs
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No labor templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Create labor templates to quickly add common task lists to your labor orders
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge className={`mt-2 ${getCategoryColor(template.category)}`}>
                      {template.category}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(template)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {template.description && (
                  <CardDescription className="text-sm line-clamp-2 mb-3">
                    {template.description}
                  </CardDescription>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Labor template</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Dialog */}
      <LaborTemplateDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        template={selectedTemplate}
      />
    </div>
  )
}
