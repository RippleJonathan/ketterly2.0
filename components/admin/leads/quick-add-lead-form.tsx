'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'
import { createLeadAction } from '@/lib/actions/leads'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useQueryClient } from '@tanstack/react-query'

// Simplified schema for quick add
const quickAddSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  source: z.string(),
  service_type: z.string(),
  notes: z.string().optional().or(z.literal('')),
})

type QuickAddFormData = z.infer<typeof quickAddSchema>

const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'door_knocking', label: 'Door Knocking' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'call_in', label: 'Call In' },
  { value: 'other', label: 'Other' },
]

const SERVICE_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'new_construction', label: 'New Construction' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance' },
]

interface QuickAddLeadFormProps {
  onSuccess?: () => void
}

export function QuickAddLeadForm({ onSuccess }: QuickAddLeadFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      source: 'website',
      service_type: 'repair',
      notes: '',
    },
  })

  const onSubmit = async (data: QuickAddFormData) => {
    if (!company?.id || !user?.id) {
      toast.error('Missing company or user information')
      return
    }

    setIsSubmitting(true)

    try {
      // Create lead with current user as creator, unassigned
      const result = await createLeadAction(
        company.id,
        {
          ...data,
          email: data.email || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          notes: data.notes || null,
          status: 'new',
          assigned_to: null, // Quick add leaves unassigned
        },
        user.id
      )

      if (result.success) {
        // Invalidate leads cache
        queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
        queryClient.invalidateQueries({ queryKey: ['lead-financials'] })

        toast.success('Lead created successfully!')
        form.reset()
        onSuccess?.()

        // Navigate to lead detail page
        if (result.data?.id) {
          router.push(`/admin/leads/${result.data.id}`)
        }
      } else {
        toast.error(result.error || 'Failed to create lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          {...form.register('full_name')}
          placeholder="John Smith"
        />
        {form.formState.errors.full_name && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.full_name.message}
          </p>
        )}
      </div>

      {/* Phone & Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            {...form.register('phone')}
            placeholder="(555) 123-4567"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="john@example.com"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          {...form.register('address')}
          placeholder="123 Main St"
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      {/* City, State, Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            {...form.register('city')}
            placeholder="Dallas"
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            {...form.register('state')}
            placeholder="TX"
            maxLength={2}
          />
        </div>
        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            {...form.register('zip')}
            placeholder="75001"
            maxLength={5}
          />
        </div>
      </div>

      {/* Source & Service Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="source">Source *</Label>
          <Select
            value={form.watch('source')}
            onValueChange={(value) => form.setValue('source', value)}
          >
            <SelectTrigger id="source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="service_type">Service Type *</Label>
          <Select
            value={form.watch('service_type')}
            onValueChange={(value) => form.setValue('service_type', value)}
          >
            <SelectTrigger id="service_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register('notes')}
          placeholder="Additional details about the lead..."
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  )
}
