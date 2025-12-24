'use client'

import { useState } from 'react'
import { DocumentSection } from '@/lib/types/document-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowUp,
  ArrowDown,
  Trash,
  Edit,
  Check,
  X,
  Type,
  User,
  DollarSign,
  FileSignature,
  Layout,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

interface SectionEditorProps {
  section: DocumentSection
  index: number
  totalSections: number
  onUpdate: (section: DocumentSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const SECTION_ICONS = {
  header: Layout,
  text: Type,
  customer_info: User,
  pricing_table: DollarSign,
  signatures: FileSignature,
  terms: Type,
  custom: Type,
}

const SECTION_TYPE_LABELS = {
  header: 'Header',
  text: 'Text Block',
  customer_info: 'Customer Info',
  pricing_table: 'Pricing Table',
  signatures: 'Signatures',
  terms: 'Terms',
  custom: 'Custom',
}

export function SectionEditor({
  section,
  index,
  totalSections,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [title, setTitle] = useState(section.title || '')
  const [content, setContent] = useState(
    section.content.text || JSON.stringify(section.content, null, 2)
  )

  const Icon = SECTION_ICONS[section.type] || Type

  const handleSave = () => {
    const updatedSection: DocumentSection = {
      ...section,
      title,
      content: section.type === 'text' || section.type === 'header'
        ? { text: content }
        : section.content,
    }
    onUpdate(updatedSection)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(section.title || '')
    setContent(section.content.text || JSON.stringify(section.content, null, 2))
    setIsEditing(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">
                  {section.title || SECTION_TYPE_LABELS[section.type]}
                </CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {SECTION_TYPE_LABELS[section.type]}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                disabled={index === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                disabled={index === totalSections - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Section Title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={SECTION_TYPE_LABELS[section.type]}
                />
              </div>

              {(section.type === 'text' || section.type === 'header') && (
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    placeholder="Enter content... You can use {{variables}} like {{company.name}}, {{customer.name}}, {{today}}, etc."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    HTML is supported. Use variables like {'{{company.name}}'}, {'{{customer.address}}'}, {'{{today}}'}, etc.
                  </p>
                </div>
              )}

              {section.type === 'customer_info' && (
                <div className="space-y-2">
                  <Label>Customer Info Fields</Label>
                  <p className="text-sm text-muted-foreground">
                    This section will automatically display: Customer Name, Address, Phone, Email
                  </p>
                </div>
              )}

              {section.type === 'pricing_table' && (
                <div className="space-y-2">
                  <Label>Pricing Table</Label>
                  <p className="text-sm text-muted-foreground">
                    This section will automatically display line items from the linked quote
                  </p>
                </div>
              )}

              {section.type === 'signatures' && (
                <div className="space-y-2">
                  <Label>Signature Block</Label>
                  <p className="text-sm text-muted-foreground">
                    This section will display signature fields for customer and company representative
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(section.type === 'text' || section.type === 'header') && (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.content.text || '' }}
                />
              )}
              {section.type === 'customer_info' && (
                <div className="text-sm text-muted-foreground">
                  Customer information fields (Name, Address, Phone, Email)
                </div>
              )}
              {section.type === 'pricing_table' && (
                <div className="text-sm text-muted-foreground">
                  Quote line items, subtotal, tax, and total
                </div>
              )}
              {section.type === 'signatures' && (
                <div className="text-sm text-muted-foreground">
                  Customer and company signature fields
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{section.title || SECTION_TYPE_LABELS[section.type]}" from the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
