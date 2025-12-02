'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  LEAD_FILTER_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from '@/lib/constants/leads'
import { useCreateLead, useUpdateLead } from '@/lib/hooks/use-leads'
import type { Lead } from '@/lib/types'

const leadFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  service_type: z.string().min(1, 'Service type is required'),
  source: z.string().min(1, 'Source is required'),
  status: z.string().min(1, 'Status is required'),
  priority: z.string().min(1, 'Priority is required'),
  notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadFormSchema>

interface LeadFormProps {
  lead?: Lead
  mode: 'create' | 'edit'
}

export function LeadForm({ lead, mode }: LeadFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead
      ? {
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address || '',
          city: lead.city || '',
          state: lead.state || '',
          zip: lead.zip || '',
          service_type: lead.service_type,
          source: lead.source,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes || '',
        }
      : {
          full_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          service_type: 'repair',
          source: 'website',
          status: 'new',
          priority: 'medium',
          notes: '',
        },
  })

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        await createLead.mutateAsync(data as any)
        router.push('/admin/leads')
      } else if (lead) {
        await updateLead.mutateAsync({ leadId: lead.id, updates: data as any })
        router.push(`/admin/leads/${lead.id}`)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="John Smith"
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Main St"
            />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} placeholder="Austin" />
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register('state')} placeholder="TX" />
          </div>

          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input id="zip" {...register('zip')} placeholder="78701" />
          </div>
        </div>
      </div>

      {/* Lead Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Lead Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="service_type">Service Type *</Label>
            <Select
              value={watch('service_type')}
              onValueChange={(value) => setValue('service_type', value)}
            >
              <SelectTrigger id="service_type" className={errors.service_type ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_type && (
              <p className="text-red-500 text-sm mt-1">{errors.service_type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="source">Lead Source *</Label>
            <Select
              value={watch('source')}
              onValueChange={(value) => setValue('source', value)}
            >
              <SelectTrigger id="source" className={errors.source ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_FILTER_OPTIONS.sources.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-red-500 text-sm mt-1">{errors.source.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value)}
            >
              <SelectTrigger id="status" className={errors.status ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_FILTER_OPTIONS.statuses.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="priority">Priority *</Label>
            <Select
              value={watch('priority')}
              onValueChange={(value) => setValue('priority', value)}
            >
              <SelectTrigger id="priority" className={errors.priority ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_FILTER_OPTIONS.priorities.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Notes</h2>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Any additional information about this lead..."
            rows={6}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Lead' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
