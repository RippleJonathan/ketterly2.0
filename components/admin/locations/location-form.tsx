'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers } from '@/lib/hooks/use-users'
import type { Location } from '@/lib/api/locations'

const locationFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location_code: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters (e.g., TX)'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  license_number: z.string().optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
  // Office Manager Commission Settings
  office_manager_id: z.string().optional(),
  commission_enabled: z.boolean().default(false),
  commission_type: z.enum(['percentage', 'flat_amount']).default('percentage'),
  commission_rate: z.number().min(0).max(100).optional(),
  flat_commission_amount: z.number().min(0).optional(),
})

type LocationFormData = z.infer<typeof locationFormSchema>

interface LocationFormProps {
  location?: Location
  existingOfficeManager?: {
    userId: string
    commissionEnabled: boolean
    commissionRate: number | null
    commissionType: string | null
    flatCommissionAmount: number | null
  }
  onSubmit: (data: LocationFormData, officeManagerData?: {
    userId: string | null
    commissionEnabled: boolean
    commissionRate: number
    commissionType: 'percentage' | 'flat_amount'
    flatCommissionAmount: number
  }) => Promise<void>
  onCancel: () => void
}

export function LocationForm({ location, existingOfficeManager, onSubmit, onCancel }: LocationFormProps) {
  // Fetch office role users for office manager selection
  const { data: usersResponse } = useUsers({ role: 'office' })
  const officeUsers = usersResponse?.data || []

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: location ? {
      name: location.name,
      location_code: location.location_code || '',
      address: location.address,
      city: location.city,
      state: location.state,
      zip: location.zip,
      phone: location.phone || '',
      email: location.email || '',
      license_number: location.license_number || '',
      is_primary: location.is_primary,
      is_active: location.is_active,
      notes: location.notes || '',
      // Office manager commission from existing data
      office_manager_id: existingOfficeManager?.userId || '',
      commission_enabled: existingOfficeManager?.commissionEnabled || false,
      commission_type: (existingOfficeManager?.commissionType as 'percentage' | 'flat_amount') || 'percentage',
      commission_rate: existingOfficeManager?.commissionRate || 0,
      flat_commission_amount: existingOfficeManager?.flatCommissionAmount || 0,
    } : {
      name: '',
      location_code: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      license_number: '',
      is_primary: false,
      is_active: true,
      notes: '',
      office_manager_id: '',
      commission_enabled: false,
      commission_type: 'percentage' as const,
      commission_rate: 0,
      flat_commission_amount: 0,
    },
  })

  const handleSubmit = async (data: LocationFormData) => {
    // Extract office manager commission data
    const officeManagerData = data.office_manager_id ? {
      userId: data.office_manager_id,
      commissionEnabled: data.commission_enabled,
      commissionRate: data.commission_rate || 0,
      commissionType: data.commission_type,
      flatCommissionAmount: data.flat_commission_amount || 0,
    } : undefined

    // Remove office manager fields from location data
    const { 
      office_manager_id, 
      commission_enabled, 
      commission_rate, 
      commission_type, 
      flat_commission_amount, 
      ...locationData 
    } = data

    await onSubmit(locationData, officeManagerData)
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name *</FormLabel>
                <FormControl>
                  <Input placeholder="North Dallas Office" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Code</FormLabel>
                <FormControl>
                  <Input placeholder="DFW-N" {...field} />
                </FormControl>
                <FormDescription>Used in order numbering</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Dallas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="TX" maxLength={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP *</FormLabel>
                <FormControl>
                  <Input placeholder="75001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="dallas@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="license_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License Number</FormLabel>
              <FormControl>
                <Input placeholder="LIC-123456" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional location notes..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Office Manager Commission Settings */}
        <div className="rounded-lg border p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Office Manager Commission</h3>
            <p className="text-sm text-muted-foreground">
              Assign an office role user and configure their commission for jobs at this location
            </p>
          </div>

          <FormField
            control={form.control}
            name="office_manager_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Office Manager (Office Role)</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value || '')}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an office user or leave blank..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {officeUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Only users with &quot;office&quot; role can be assigned. Leave blank for no office manager.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('office_manager_id') && (
            <>
              <FormField
                control={form.control}
                name="commission_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Commission</FormLabel>
                      <FormDescription>
                        Automatically create commission for jobs at this location
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('commission_enabled') && (
                <>
                  <FormField
                    control={form.control}
                    name="commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Type</FormLabel>
                        <Select
                          value={field.value || 'percentage'}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage of Job Value</SelectItem>
                            <SelectItem value="flat_amount">Flat Amount per Job</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('commission_type') === 'percentage' ? (
                    <FormField
                      control={form.control}
                      name="commission_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="e.g., 3.00 for 3%"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage of total job value (e.g., 3.00 = 3%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="flat_commission_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat Commission Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g., 100.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Fixed dollar amount per job at this location
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="is_primary"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Primary Location</FormLabel>
                  <FormDescription>
                    This location will be used as default for new leads/quotes
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive locations won't appear in selection dropdowns
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : location ? 'Update Location' : 'Create Location'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
