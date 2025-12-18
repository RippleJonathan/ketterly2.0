'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { createLeadAction } from '@/lib/actions/leads'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const quickLeadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().min(5, 'Address required'),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  source: z.string(),
  service_type: z.string(),
  sales_rep_id: z.string().optional().or(z.literal('')),
  marketing_rep_id: z.string().optional().or(z.literal('')),
  sales_manager_id: z.string().optional().or(z.literal('')),
  production_manager_id: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
})

type QuickLeadFormData = z.infer<typeof quickLeadSchema>

interface QuickAddLeadButtonProps {
  variant?: 'fab' | 'header'
}

export function QuickAddLeadButton({ variant = 'fab' }: QuickAddLeadButtonProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([])
  const { data: userData } = useCurrentUser()
  const { data: company } = useCurrentCompany()
  const user = userData?.data
  const queryClient = useQueryClient()

  // Fetch company users for assignment
  useEffect(() => {
    if (!company?.id) return

    const fetchUsers = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('full_name')

      if (data) {
        setUsers(data)
      }
    }

    fetchUsers()
  }, [company?.id])

  const form = useForm<QuickLeadFormData>({
    resolver: zodResolver(quickLeadSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      source: 'phone',
      service_type: 'repair',
      sales_rep_id: '',
      marketing_rep_id: '',
      sales_manager_id: '',
      production_manager_id: '',
      notes: '',
    },
  })

  // Auto-fill assignment based on current user's role
  useEffect(() => {
    if (!user?.id || !user?.role) return

    const role = user.role
    if (role === 'sales' && !form.watch('sales_rep_id')) {
      form.setValue('sales_rep_id', user.id)
    } else if (role === 'marketing' && !form.watch('marketing_rep_id')) {
      form.setValue('marketing_rep_id', user.id)
    } else if (role === 'sales_manager' && !form.watch('sales_manager_id')) {
      form.setValue('sales_manager_id', user.id)
    } else if (role === 'production' && !form.watch('production_manager_id')) {
      form.setValue('production_manager_id', user.id)
    }
  }, [user, form])

  const onSubmit = async (data: QuickLeadFormData) => {
    if (!company?.id || !user?.id) {
      toast.error('Missing company or user information')
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        ...data,
        email: data.email || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        status: 'new',
        sales_rep_id: data.sales_rep_id || null,
        marketing_rep_id: data.marketing_rep_id || null,
        sales_manager_id: data.sales_manager_id || null,
        production_manager_id: data.production_manager_id || null,
      }

      const result = await createLeadAction(
        company.id,
        submitData,
        user.id
      )
      
      if (result.success) {
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
        queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
        
        toast.success('Lead created successfully!')
        setOpen(false)
        form.reset()
      } else {
        throw new Error(result.error || 'Failed to create lead')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Quick Add Button - Two Variants */}
      {variant === 'header' ? (
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
          title="Quick Add Lead"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Quick Add Lead Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Lead</DialogTitle>
            <DialogDescription>
              Quickly capture a new lead. You can add more details later.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
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

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="(555) 123-4567"
                type="tel"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...form.register('email')}
                placeholder="john@example.com"
                type="email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Address with Autocomplete */}
            <div>
              <AddressAutocomplete
                value={form.watch('address') || ''}
                onChange={(value) => form.setValue('address', value)}
                onAddressSelect={(components) => {
                  form.setValue('city', components.city)
                  form.setValue('state', components.state)
                  form.setValue('zip', components.zip)
                }}
                label="Address"
                placeholder="123 Main St"
                required
                error={form.formState.errors.address?.message}
              />
            </div>

            {/* City, State, Zip - Hidden but auto-populated */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="city" className="text-xs text-gray-500">City</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="City"
                  className="text-sm"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-xs text-gray-500">State</Label>
                <Input
                  id="state"
                  {...form.register('state')}
                  placeholder="ST"
                  className="text-sm"
                  maxLength={2}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="zip" className="text-xs text-gray-500">ZIP</Label>
                <Input
                  id="zip"
                  {...form.register('zip')}
                  placeholder="12345"
                  className="text-sm"
                  readOnly
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <Label htmlFor="source">Lead Source *</Label>
              <Select
                value={form.watch('source')}
                onValueChange={(value) => form.setValue('source', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="door_knocking">Door Knocking</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Type */}
            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Select
                value={form.watch('service_type')}
                onValueChange={(value) => form.setValue('service_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="new_construction">New Construction</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sales Rep */}
            <div>
              <Label htmlFor="sales_rep_id">Sales Rep</Label>
              <Select
                value={form.watch('sales_rep_id') || ''}
                onValueChange={(value) => form.setValue('sales_rep_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marketing Rep */}
            <div>
              <Label htmlFor="marketing_rep_id">Marketing Rep (Optional)</Label>
              <Select
                value={form.watch('marketing_rep_id') || ''}
                onValueChange={(value) => form.setValue('marketing_rep_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sales Manager */}
            <div>
              <Label htmlFor="sales_manager_id">Sales Manager (Optional)</Label>
              <Select
                value={form.watch('sales_manager_id') || ''}
                onValueChange={(value) => form.setValue('sales_manager_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Manager */}
            <div>
              <Label htmlFor="production_manager_id">Production Manager (Optional)</Label>
              <Select
                value={form.watch('production_manager_id') || ''}
                onValueChange={(value) => form.setValue('production_manager_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Quick Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Any quick notes about this lead..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  form.reset()
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
