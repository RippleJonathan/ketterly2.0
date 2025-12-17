'use client'

import { useState, useEffect } from 'react'
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
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import {
  LEAD_FILTER_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from '@/lib/constants/leads'
import { createLeadAction, updateLeadAction } from '@/lib/actions/leads'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  assigned_to: z.string().optional(),
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
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const queryClient = useQueryClient()

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
          assigned_to: lead.assigned_to || '',
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
          assigned_to: '',
          notes: '',
        },
  })

  // Fetch users for assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!company?.id) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', company.id)
        .order('full_name')

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setUsers(data || [])
    }

    fetchUsers()
  }, [company?.id])

  const onSubmit = async (data: LeadFormData) => {
    if (!company?.id || !user?.id) {
      toast.error('Missing company or user information')
      return
    }

    setIsSubmitting(true)
    try {
      // Convert empty string to null for assigned_to
      const submitData = {
        ...data,
        assigned_to: data.assigned_to || null,
      }
      
      if (mode === 'create') {
        const result = await createLeadAction(company.id, submitData, user.id)
        
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
          queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
          toast.success('Lead created successfully!')
          router.push('/admin/leads')
        } else {
          throw new Error(result.error || 'Failed to create lead')
        }
      } else if (lead) {
        const result = await updateLeadAction(company.id, lead.id, submitData, user.id)
        
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
          queryClient.invalidateQueries({ queryKey: ['leads', company.id, lead.id] })
          queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
          toast.success('Lead updated successfully!')
          router.push(`/admin/leads/${lead.id}`)
        } else {
          throw new Error(result.error || 'Failed to update lead')
        }
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save lead')
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
            <AddressAutocomplete
              value={watch('address') || ''}
              onChange={(value) => setValue('address', value)}
              onAddressSelect={(components) => {
                setValue('city', components.city)
                setValue('state', components.state)
                setValue('zip', components.zip)
              }}
              label="Street Address"
              placeholder="123 Main St"
            />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} placeholder="Austin" />
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register('state')} placeholder="TX" maxLength={2} />
          </div>

          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input id="zip" {...register('zip')} placeholder="78701" maxLength={10} />
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

          <div>
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select
              value={watch('assigned_to') || 'unassigned'}
              onValueChange={(value) => setValue('assigned_to', value === 'unassigned' ? '' : value)}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
