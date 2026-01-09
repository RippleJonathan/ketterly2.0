'use client'

import { useState, useEffect } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import {
  LEAD_FILTER_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/lib/constants/leads'
import { updateLeadAction } from '@/lib/actions/leads'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { useLocations } from '@/lib/hooks/use-locations'
import { useUserLocations } from '@/lib/hooks/use-location-users'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Mail, Phone, MapPin, Pencil, X, Save } from 'lucide-react'
import { format } from 'date-fns'
import type { Lead } from '@/lib/types'
import { TeamHierarchy } from '@/components/admin/leads/team-hierarchy'

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
  location_id: z.string().optional(),
  sales_rep_id: z.string().optional(),
  marketing_rep_id: z.string().optional(),
  sales_manager_id: z.string().optional(),
  production_manager_id: z.string().optional(),
  notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadFormSchema>

interface EditableDetailsTabProps {
  lead: any
  onEditToggle?: (isEditing: boolean) => void
}

export function EditableDetailsTab({ lead, onEditToggle }: EditableDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([])
  
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const queryClient = useQueryClient()
  const { data: locations } = useLocations(true)
  const { data: userLocations } = useUserLocations(user?.id)
  
  // Check team assignment permissions
  const { data: canAssignSalesRep } = useCheckPermission(user?.id, 'can_assign_sales_rep')
  const { data: canAssignSalesManager } = useCheckPermission(user?.id, 'can_assign_sales_manager')
  const { data: canAssignMarketingRep } = useCheckPermission(user?.id, 'can_assign_marketing_rep')
  const { data: canAssignProductionManager } = useCheckPermission(user?.id, 'can_assign_production_manager')
  
  const isAdmin = user?.role && ['admin', 'office', 'super_admin'].includes(user.role as string)
  const availableLocations = isAdmin
    ? locations?.data || []
    : userLocations?.data?.map((ul: any) => ul.locations).filter(Boolean) || []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
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
      location_id: lead.location_id || '',
      priority: lead.priority,
      sales_rep_id: lead.sales_rep_id || lead.assigned_to || '',
      marketing_rep_id: lead.marketing_rep_id || '',
      sales_manager_id: lead.sales_manager_id || '',
      production_manager_id: lead.production_manager_id || '',
      notes: lead.notes || '',
    },
  })

  // Fetch users for assignment dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!company?.id || !user?.id) return

      const supabase = createClient()
      const selectedLocationId = watch('location_id')
      
      if (!selectedLocationId) {
        setUsers([])
        return
      }
      
      const { data: locationUserData, error } = await supabase
        .from('location_users')
        .select('user_id, users!location_users_user_id_fkey(id, full_name, email, role)')
        .eq('location_id', selectedLocationId)
      
      if (error) {
        console.error('Error fetching location users:', error)
        return
      }
      
      const locationUsers = locationUserData?.map((lu: any) => lu.users) || []
      setUsers(locationUsers)
    }

    fetchUsers()
  }, [company?.id, user?.id, watch('location_id')])

  // Auto-assign Team Lead when sales rep changes
  useEffect(() => {
    async function autoAssignTeamLead() {
      const salesRepId = watch('sales_rep_id')
      const locationId = watch('location_id')
      
      if (!salesRepId || !locationId) {
        return
      }

      const supabase = createClient()
      
      // Query sales rep's team to get team lead
      const { data: salesRepTeam } = await supabase
        .from('location_users')
        .select(`
          team_id,
          teams!inner(
            team_lead_id
          )
        `)
        .eq('user_id', salesRepId)
        .not('team_id', 'is', null)
        .maybeSingle()

      if (salesRepTeam?.teams) {
        const team = salesRepTeam.teams as any
        const teamLeadId = team.team_lead_id
        
        // Only auto-assign if not already set or different
        if (teamLeadId && teamLeadId !== watch('sales_manager_id')) {
          console.log('Auto-assigning Team Lead:', teamLeadId)
          setValue('sales_manager_id', teamLeadId)
          toast.info('Team Lead auto-assigned from sales rep\'s team')
        }
      } else {
        // Sales rep has no team, clear team lead if it was auto-assigned
        // (Only clear if you want to enforce team-based assignment)
        console.log('Sales rep has no team')
      }
    }

    autoAssignTeamLead()
  }, [watch('sales_rep_id'), watch('location_id')])

  const handleEdit = () => {
    setIsEditing(true)
    onEditToggle?.(true)
  }

  const handleCancel = () => {
    reset()
    setIsEditing(false)
    onEditToggle?.(false)
  }

  const onSubmit = async (data: LeadFormData) => {
    if (!company?.id || !user?.id) {
      toast.error('Missing company or user information')
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        ...data,
        location_id: data.location_id || null,
        sales_rep_id: data.sales_rep_id || null,
        marketing_rep_id: data.marketing_rep_id || null,
        sales_manager_id: data.sales_manager_id || null,
        production_manager_id: data.production_manager_id || null,
      }

      const result = await updateLeadAction(company.id, lead.id, submitData, user.id)
      
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
        queryClient.invalidateQueries({ queryKey: ['leads', company.id, lead.id] })
        queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
        toast.success('Lead updated successfully!')
        setIsEditing(false)
        onEditToggle?.(false)
        // Reload the page to get fresh data
        window.location.reload()
      } else {
        throw new Error(result.error || 'Failed to update lead')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEditing) {
    // View Mode - Read Only
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Button */}
        <div className="lg:col-span-2 flex justify-end">
          <Button onClick={handleEdit} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Lead Details
          </Button>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                  {lead.phone}
                </a>
              </div>
            </div>
            {lead.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">
                    {lead.address}
                    {lead.city && `, ${lead.city}`}
                    {lead.state && `, ${lead.state}`}
                    {lead.zip && ` ${lead.zip}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lead Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Source</p>
              <p className="text-gray-900 font-medium">
                {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-900">
                {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-gray-900">
                {format(new Date(lead.updated_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Service Type</p>
              <p className="text-gray-900 font-medium">
                {SERVICE_TYPE_LABELS[lead.service_type as keyof typeof SERVICE_TYPE_LABELS] || lead.service_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lead Source</p>
              <p className="text-gray-900 font-medium">
                {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="text-gray-900 font-medium">
                {lead.location?.name || 'No Location'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-gray-900 font-medium">
                {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] || lead.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <p className="text-gray-900 font-medium">
                {LEAD_PRIORITY_LABELS[lead.priority as keyof typeof LEAD_PRIORITY_LABELS] || lead.priority}
              </p>
            </div>
          </div>
        </div>

        {/* Team Hierarchy - Full organizational view */}
        <TeamHierarchy
          leadId={lead.id}
          locationId={lead.location_id}
          salesRepId={lead.sales_rep_id}
          marketingRepId={lead.marketing_rep_id}
          salesManagerId={lead.sales_manager_id}
          productionManagerId={lead.production_manager_id}
        />

        {/* Notes */}
        {lead.notes && (
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>
    )
  }

  // Edit Mode - Editable Form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <AddressAutocomplete
                value={watch('address') || ''}
                onChange={(value) => setValue('address', value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} maxLength={2} />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" {...register('zip')} />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Select value={watch('service_type')} onValueChange={(value) => setValue('service_type', value)}>
                <SelectTrigger>
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
                <p className="text-sm text-red-600 mt-1">{errors.service_type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="source">Lead Source *</Label>
              <Select value={watch('source')} onValueChange={(value) => setValue('source', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_FILTER_OPTIONS.sources.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.source && (
                <p className="text-sm text-red-600 mt-1">{errors.source.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={watch('priority')} onValueChange={(value) => setValue('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_FILTER_OPTIONS.priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location_id">Location</Label>
              <Select value={watch('location_id')} onValueChange={(value) => setValue('location_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Team Assignments */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Assignments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="sales_rep_id">Sales Rep</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select 
                        value={watch('sales_rep_id')} 
                        onValueChange={(value) => setValue('sales_rep_id', value)}
                        disabled={!canAssignSalesRep}
                      >
                        <SelectTrigger disabled={!canAssignSalesRep}>
                          <SelectValue placeholder="Select sales rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => ['sales', 'sales_manager', 'admin'].includes(u.role)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {!canAssignSalesRep && (
                    <TooltipContent>
                      <p>You don't have permission to assign sales representatives</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <Label htmlFor="marketing_rep_id">Marketing Rep</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select 
                        value={watch('marketing_rep_id')} 
                        onValueChange={(value) => setValue('marketing_rep_id', value)}
                        disabled={!canAssignMarketingRep}
                      >
                        <SelectTrigger disabled={!canAssignMarketingRep}>
                          <SelectValue placeholder="Select marketing rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => ['marketing', 'admin'].includes(u.role)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {!canAssignMarketingRep && (
                    <TooltipContent>
                      <p>You don't have permission to assign marketing representatives</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <Label htmlFor="sales_manager_id">Sales Manager</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select 
                        value={watch('sales_manager_id')} 
                        onValueChange={(value) => setValue('sales_manager_id', value)}
                        disabled={!canAssignSalesManager}
                      >
                        <SelectTrigger disabled={!canAssignSalesManager}>
                          <SelectValue placeholder="Select sales manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => ['sales_manager', 'admin'].includes(u.role)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {!canAssignSalesManager && (
                    <TooltipContent>
                      <p>You don't have permission to assign sales managers</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <Label htmlFor="production_manager_id">Production Manager</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select 
                        value={watch('production_manager_id')} 
                        onValueChange={(value) => setValue('production_manager_id', value)}
                        disabled={!canAssignProductionManager}
                      >
                        <SelectTrigger disabled={!canAssignProductionManager}>
                          <SelectValue placeholder="Select production manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => ['production', 'admin'].includes(u.role)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {!canAssignProductionManager && (
                    <TooltipContent>
                      <p>You don't have permission to assign production managers</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
          <Textarea
            {...register('notes')}
            placeholder="Add any additional notes about this lead..."
            rows={4}
          />
        </div>
      </div>
    </form>
  )
}
