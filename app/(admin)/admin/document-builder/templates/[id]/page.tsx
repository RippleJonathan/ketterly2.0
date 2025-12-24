'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDocumentTemplate, useUpdateDocumentTemplate, useCreateDocumentTemplate } from '@/lib/hooks/use-document-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { DocumentCategory, DocumentSection, DOCUMENT_CATEGORY_LABELS } from '@/lib/types/document-builder'
import { SectionEditor } from '@/components/admin/document-builder/section-editor'
import { AddSectionDialog } from '@/components/admin/document-builder/add-section-dialog'
import { Skeleton } from '@/components/ui/skeleton'

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id === 'new' ? null : params.id as string
  
  const { data: template, isLoading } = useDocumentTemplate(templateId)
  const updateTemplate = useUpdateDocumentTemplate()
  const createTemplate = useCreateDocumentTemplate()

  const [name, setName] = useState(template?.data?.name || '')
  const [description, setDescription] = useState(template?.data?.description || '')
  const [category, setCategory] = useState<DocumentCategory>(template?.data?.category || 'contract')
  const [sections, setSections] = useState<DocumentSection[]>(template?.data?.sections || [])
  const [addSectionOpen, setAddSectionOpen] = useState(false)

  // Update form when template loads
  if (template?.data && name === '' && !isLoading) {
    setName(template.data.name)
    setDescription(template.data.description || '')
    setCategory(template.data.category)
    setSections(template.data.sections)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      return
    }

    if (templateId) {
      // Update existing
      await updateTemplate.mutateAsync({
        templateId,
        updates: { name, description, sections },
      })
    } else {
      // Create new
      const result = await createTemplate.mutateAsync({
        name,
        description,
        category,
        sections,
      })
      
      if (result.data) {
        router.push(`/admin/document-builder/templates/${result.data.id}`)
      }
    }
  }

  const handleAddSection = (section: DocumentSection) => {
    setSections([...sections, section])
  }

  const handleUpdateSection = (index: number, updatedSection: DocumentSection) => {
    const newSections = [...sections]
    newSections[index] = updatedSection
    setSections(newSections)
  }

  const handleDeleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sections.length - 1) return

    const newSections = [...sections]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]]
    setSections(newSections)
  }

  if (isLoading && templateId) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/document-builder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {templateId ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>
        <Button onClick={handleSave} disabled={!name.trim() || updateTemplate.isPending || createTemplate.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateTemplate.isPending || createTemplate.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Work Order Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this template used for?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Sections ({sections.length})</Label>
              <p className="text-sm text-muted-foreground">
                Add, remove, and reorder sections to build your document template
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAddSectionOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sections Editor */}
        <div className="md:col-span-2 space-y-4">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground mb-4">No sections yet</p>
                <Button onClick={() => setAddSectionOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Section
                </Button>
              </CardContent>
            </Card>
          ) : (
            sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                totalSections={sections.length}
                onUpdate={(updatedSection) => handleUpdateSection(index, updatedSection)}
                onDelete={() => handleDeleteSection(index)}
                onMoveUp={() => handleMoveSection(index, 'up')}
                onMoveDown={() => handleMoveSection(index, 'down')}
              />
            ))
          )}
        </div>
      </div>

      <AddSectionDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        onAddSection={handleAddSection}
      />
    </div>
  )
}
