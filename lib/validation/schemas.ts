import { z } from 'zod'
import { LeadSource, ServiceType, LeadStatus, LeadSubStatus, Priority } from '@/lib/types/enums'

// Lead validation schema
export const leadFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'State must be 2 characters').optional().or(z.literal('')),
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits').optional().or(z.literal('')),
  source: z.nativeEnum(LeadSource),
  service_type: z.nativeEnum(ServiceType),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW_LEAD),
  sub_status: z.nativeEnum(LeadSubStatus).optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  estimated_value: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export type LeadFormData = z.infer<typeof leadFormSchema>

// Company settings validation schema
export const companySettingsSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'State must be 2 characters').optional().or(z.literal('')),
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex code').optional(),
})

export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>

// User validation schema
export const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'manager', 'user']),
})

export type UserFormData = z.infer<typeof userFormSchema>

// Activity validation schema
export const activityFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  activity_type: z.enum(['note', 'call', 'email', 'sms', 'meeting', 'status_change', 'file_upload', 'payment', 'other']),
})

export type ActivityFormData = z.infer<typeof activityFormSchema>
