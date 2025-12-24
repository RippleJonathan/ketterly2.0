'use client'

import { useState } from 'react'
import { DocumentSection, SectionType } from '@/lib/types/document-builder'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Layout,
  Type,
  User,
  DollarSign,
  FileSignature,
  FileText,
} from 'lucide-react'

interface AddSectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSection: (section: DocumentSection) => void
}

const SECTION_TYPES = [
  {
    type: 'header' as SectionType,
    icon: Layout,
    title: 'Header',
    description: 'Company letterhead with logo and contact information',
    template: {
      id: `header-${Date.now()}`,
      type: 'header' as SectionType,
      title: 'Header',
      content: {
        text: '<div style="text-align: center;"><h1>{{company.name}}</h1><p>{{company.address}}<br/>{{company.city}}, {{company.state}} {{company.zip}}<br/>Phone: {{company.phone}} | Email: {{company.email}}</p><hr style="margin: 1.5rem 0;"/></div>',
      },
      settings: {
        borderBottom: true,
        padding: '1rem',
      },
    },
  },
  {
    type: 'text' as SectionType,
    icon: Type,
    title: 'Text Block',
    description: 'Free-form text content with variables',
    template: {
      id: `text-${Date.now()}`,
      type: 'text' as SectionType,
      title: 'Text Block',
      content: {
        text: '<p>Enter your content here...</p><p>You can use variables like {{company.name}}, {{customer.name}}, {{today}}, etc.</p>',
      },
      settings: {
        padding: '1rem',
      },
    },
  },
  {
    type: 'customer_info' as SectionType,
    icon: User,
    title: 'Customer Information',
    description: 'Display customer name, address, and contact details',
    template: {
      id: `customer-${Date.now()}`,
      type: 'customer_info' as SectionType,
      title: 'Customer Information',
      content: {
        fields: [
          { label: 'Customer Name', variable: 'customer.name', format: 'text' as const },
          { label: 'Property Address', variable: 'customer.address', format: 'text' as const },
          { label: 'Phone', variable: 'customer.phone', format: 'phone' as const },
          { label: 'Email', variable: 'customer.email', format: 'email' as const },
        ],
      },
      settings: {
        padding: '1rem',
        borderBottom: true,
      },
    },
  },
  {
    type: 'pricing_table' as SectionType,
    icon: DollarSign,
    title: 'Pricing Table',
    description: 'Line items, subtotal, tax, and total from quote',
    template: {
      id: `pricing-${Date.now()}`,
      type: 'pricing_table' as SectionType,
      title: 'Pricing',
      content: {
        showLineItems: true,
        showSubtotal: true,
        showTax: true,
        showTotal: true,
      },
      settings: {
        padding: '1rem',
        borderTop: true,
        borderBottom: true,
      },
    },
  },
  {
    type: 'signatures' as SectionType,
    icon: FileSignature,
    title: 'Signature Block',
    description: 'Customer and company representative signatures',
    template: {
      id: `signatures-${Date.now()}`,
      type: 'signatures' as SectionType,
      title: 'Signatures',
      content: {
        signers: [
          {
            type: 'customer' as const,
            label: 'Customer Signature',
            showDate: true,
            showName: true,
          },
          {
            type: 'company' as const,
            label: 'Company Representative',
            showDate: true,
            showName: true,
          },
        ],
      },
      settings: {
        padding: '2rem 1rem',
        borderTop: true,
      },
    },
  },
]

export function AddSectionDialog({ open, onOpenChange, onAddSection }: AddSectionDialogProps) {
  const handleAddSection = (template: DocumentSection) => {
    // Generate unique ID
    const newSection = {
      ...template,
      id: `${template.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    onAddSection(newSection)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
          <DialogDescription>
            Choose a section type to add to your document template
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {SECTION_TYPES.map((sectionType) => {
            const Icon = sectionType.icon
            return (
              <Card
                key={sectionType.type}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAddSection(sectionType.template)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{sectionType.title}</CardTitle>
                  </div>
                  <CardDescription>{sectionType.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
