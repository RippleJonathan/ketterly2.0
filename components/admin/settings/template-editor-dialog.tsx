'use client'

import { useState } from 'react'
import { Plus, GripVertical, Trash2, Edit, Eye } from 'lucide-react'
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
import { usePresentationSlides } from '@/lib/hooks/use-presentations'
import type { PresentationTemplate, PresentationSlide } from '@/lib/types/presentations'
import { SlideEditorDialog } from './slide-editor-dialog'
import { CreateSlideDialog } from './create-slide-dialog'

interface TemplateEditorDialogProps {
  template: PresentationTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateEditorDialog({ template, open, onOpenChange }: TemplateEditorDialogProps) {
  const { data: slides, isLoading } = usePresentationSlides(template.id)
  const [selectedSlide, setSelectedSlide] = useState<PresentationSlide | null>(null)
  const [createSlideOpen, setCreateSlideOpen] = useState(false)

  const getSlideTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      company_info: 'Company Info',
      customer_info: 'Customer Info',
      static: 'Static Content',
      dynamic_pricing: 'Pricing Grid',
      closing: 'Closing/CTA',
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
              <div className="space-y-4">
                {slides.map((slide, index) => (
                  <Card key={slide.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        {/* Drag Handle */}
                        <div className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
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
                              <Badge variant="secondary" className="text-xs">Retail</Badge>
                            )}
                            {slide.show_for_insurance && (
                              <Badge variant="secondary" className="text-xs">Insurance</Badge>
                            )}
                            {slide.requires_estimates && (
                              <Badge variant="secondary" className="text-xs">Needs Estimates</Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSlide(slide)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Delete slide
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
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
