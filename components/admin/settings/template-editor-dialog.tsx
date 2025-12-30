'use client'

import { useState } from 'react'
import { Plus, GripVertical, Trash2, Edit, Eye, Copy } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  usePresentationSlides,
  useUpdatePresentationSlide,
  useDeletePresentationSlide,
  useCreatePresentationSlide,
} from '@/lib/hooks/use-presentations'
import type { PresentationTemplate, PresentationSlide } from '@/lib/types/presentations'
import { SlideEditorDialog } from './slide-editor-dialog'
import { CreateSlideDialog } from './create-slide-dialog'
import { toast } from 'sonner'

interface TemplateEditorDialogProps {
  template: PresentationTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateEditorDialog({ template, open, onOpenChange }: TemplateEditorDialogProps) {
  const { data: slides, isLoading } = usePresentationSlides(template.id)
  const [selectedSlide, setSelectedSlide] = useState<PresentationSlide | null>(null)
  const [createSlideOpen, setCreateSlideOpen] = useState(false)
  const updateSlide = useUpdatePresentationSlide()
  const deleteSlide = useDeletePresentationSlide()
  const createSlide = useCreatePresentationSlide()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && slides) {
      const oldIndex = slides.findIndex((s) => s.id === active.id)
      const newIndex = slides.findIndex((s) => s.id === over.id)

      const reorderedSlides = arrayMove(slides, oldIndex, newIndex)

      // Update slide_order for all affected slides
      const updates = reorderedSlides.map((slide, index) => ({
        slideId: slide.id,
        updates: { slide_order: index },
      }))

      try {
        // Execute all updates
        await Promise.all(
          updates.map((update) =>
            updateSlide.mutateAsync(update)
          )
        )
        toast.success('Slides reordered successfully')
      } catch (error) {
        toast.error('Failed to reorder slides')
      }
    }
  }

  const handleDuplicateSlide = async (slide: PresentationSlide) => {
    try {
      await createSlide.mutateAsync({
        template_id: template.id,
        title: `${slide.title} (Copy)`,
        slide_type: slide.slide_type,
        content: slide.content,
        slide_order: (slides?.length || 0),
        show_for_retail: slide.show_for_retail,
        show_for_insurance: slide.show_for_insurance,
        requires_estimates: slide.requires_estimates,
        action_button_enabled: slide.action_button_enabled,
        action_button_label: slide.action_button_label,
        action_button_type: slide.action_button_type,
        action_button_config: slide.action_button_config,
      })
      toast.success('Slide duplicated successfully')
    } catch (error) {
      toast.error('Failed to duplicate slide')
    }
  }

  const handleDeleteSlide = async (slideId: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return

    try {
      await deleteSlide.mutateAsync(slideId)
      toast.success('Slide deleted successfully')
    } catch (error) {
      toast.error('Failed to delete slide')
    }
  }

  const getSlideTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      company_info: 'Company Info',
      customer_info: 'Customer Info',
      static: 'Static Content',
      dynamic_pricing: 'Pricing Grid',
      closing: 'Closing/CTA',
      measurement_data: 'Measurements',
      photo_gallery: 'Photo Gallery',
      video: 'Video',
    }
    return labels[type] || type
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Template: {template.name}</DialogTitle>
            <DialogDescription>
              Manage slides for this presentation template. Drag to reorder slides.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background z-10 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Badge>{template.flow_type}</Badge>
                <span className="text-sm text-muted-foreground">
                  {slides?.length || 0} slides
                </span>
              </div>
              <Button onClick={() => setCreateSlideOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </div>

            {/* Slides List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading slides...</div>
            ) : slides && slides.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {slides.map((slide, index) => (
                      <SortableSlideCard
                        key={slide.id}
                        slide={slide}
                        index={index}
                        onEdit={() => setSelectedSlide(slide)}
                        onDuplicate={() => handleDuplicateSlide(slide)}
                        onDelete={() => handleDeleteSlide(slide.id)}
                        getSlideTypeLabel={getSlideTypeLabel}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No slides yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first slide to start building the presentation
                  </p>
                  <Button onClick={() => setCreateSlideOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slide
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Slide Dialog */}
      <CreateSlideDialog
        templateId={template.id}
        templateFlowType={template.flow_type}
        open={createSlideOpen}
        onOpenChange={setCreateSlideOpen}
        slideCount={slides?.length || 0}
      />

      {/* Edit Slide Dialog */}
      {selectedSlide && (
        <SlideEditorDialog
          slide={selectedSlide}
          templateFlowType={template.flow_type}
          open={!!selectedSlide}
          onOpenChange={(open: boolean) => !open && setSelectedSlide(null)}
        />
      )}
    </>
  )
}

// Sortable Slide Card Component
interface SortableSlideCardProps {
  slide: PresentationSlide
  index: number
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  getSlideTypeLabel: (type: string) => string
}

function SortableSlideCard({
  slide,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  getSlideTypeLabel,
}: SortableSlideCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="group hover:shadow-md transition-shadow"
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Slide Number */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold shrink-0">
            {index + 1}
          </div>

          {/* Slide Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {slide.title || 'Untitled Slide'}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {getSlideTypeLabel(slide.slide_type)}
              </Badge>
              {slide.show_for_retail && (
                <Badge variant="secondary" className="text-xs">
                  Retail
                </Badge>
              )}
              {slide.show_for_insurance && (
                <Badge variant="secondary" className="text-xs">
                  Insurance
                </Badge>
              )}
              {slide.requires_estimates && (
                <Badge variant="secondary" className="text-xs">
                  Needs Estimates
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit} title="Edit slide">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate slide">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Delete slide"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
