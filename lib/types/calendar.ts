// Calendar System Type Definitions

export enum EventType {
  CONSULTATION = 'consultation',
  PRODUCTION_MATERIALS = 'production_materials',
  PRODUCTION_LABOR = 'production_labor',
  ADJUSTER_MEETING = 'adjuster_meeting',
  OTHER = 'other',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.CONSULTATION]: 'Consultation',
  [EventType.PRODUCTION_MATERIALS]: 'Production - Materials',
  [EventType.PRODUCTION_LABOR]: 'Production - Labor',
  [EventType.ADJUSTER_MEETING]: 'Adjuster Meeting',
  [EventType.OTHER]: 'Other',
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.CONSULTATION]: 'blue',
  [EventType.PRODUCTION_MATERIALS]: 'green',
  [EventType.PRODUCTION_LABOR]: 'orange',
  [EventType.ADJUSTER_MEETING]: 'red',
  [EventType.OTHER]: 'purple',
}

export const EVENT_TYPE_BG_COLORS: Record<EventType, string> = {
  [EventType.CONSULTATION]: 'bg-blue-50',
  [EventType.PRODUCTION_MATERIALS]: 'bg-green-50',
  [EventType.PRODUCTION_LABOR]: 'bg-orange-50',
  [EventType.ADJUSTER_MEETING]: 'bg-red-50',
  [EventType.OTHER]: 'bg-purple-50',
}

export const EVENT_TYPE_BORDER_COLORS: Record<EventType, string> = {
  [EventType.CONSULTATION]: 'border-blue-500',
  [EventType.PRODUCTION_MATERIALS]: 'border-green-500',
  [EventType.PRODUCTION_LABOR]: 'border-orange-500',
  [EventType.ADJUSTER_MEETING]: 'border-red-500',
  [EventType.OTHER]: 'border-purple-500',
}

export const EVENT_TYPE_TEXT_COLORS: Record<EventType, string> = {
  [EventType.CONSULTATION]: 'text-blue-700',
  [EventType.PRODUCTION_MATERIALS]: 'text-green-700',
  [EventType.PRODUCTION_LABOR]: 'text-orange-700',
  [EventType.ADJUSTER_MEETING]: 'text-red-700',
  [EventType.OTHER]: 'text-purple-700',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.SCHEDULED]: 'Scheduled',
  [EventStatus.CONFIRMED]: 'Confirmed',
  [EventStatus.COMPLETED]: 'Completed',
  [EventStatus.CANCELLED]: 'Cancelled',
  [EventStatus.RESCHEDULED]: 'Rescheduled',
}

export const EVENT_TYPE_DEFAULT_DURATION: Record<EventType, number | null> = {
  [EventType.CONSULTATION]: 60, // 1 hour in minutes
  [EventType.PRODUCTION_MATERIALS]: null, // All day
  [EventType.PRODUCTION_LABOR]: null, // All day
  [EventType.ADJUSTER_MEETING]: 60, // 1 hour in minutes
  [EventType.OTHER]: 60, // 1 hour in minutes
}

export const EVENT_TYPE_DEFAULT_ALL_DAY: Record<EventType, boolean> = {
  [EventType.CONSULTATION]: false,
  [EventType.PRODUCTION_MATERIALS]: true,
  [EventType.PRODUCTION_LABOR]: true,
  [EventType.ADJUSTER_MEETING]: false,
  [EventType.OTHER]: false,
}

// Recurrence pattern types
export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum RecurrenceEndType {
  NEVER = 'never',
  AFTER_OCCURRENCES = 'after_occurrences',
  ON_DATE = 'on_date',
}

export interface RecurrencePattern {
  frequency: RecurrenceFrequency
  interval: number // e.g., every 2 weeks
  days_of_week?: string[] // ['monday', 'wednesday', 'friday']
  day_of_month?: number // 1-31
  end_type: RecurrenceEndType
  end_after_occurrences?: number
  end_date?: string // ISO date string
}

// Base calendar event type from database
export interface CalendarEvent {
  id: string
  company_id: string
  lead_id: string | null
  event_type: EventType
  title: string
  description: string | null
  event_date: string // ISO date string
  start_time: string | null // HH:MM:SS
  end_time: string | null // HH:MM:SS
  is_all_day: boolean
  assigned_users: string[] // Array of user IDs
  created_by: string
  location: string | null
  status: EventStatus
  material_order_id: string | null
  labor_order_id: string | null
  related_event_id: string | null
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Calendar event with relations
export interface CalendarEventWithRelations extends CalendarEvent {
  lead?: {
    id: string
    full_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    location_id: string | null
  }
  assigned_users_data?: Array<{
    id: string
    full_name: string
    email: string
    role: string
  }>
  created_by_user?: {
    id: string
    full_name: string
  }
  material_order?: {
    id: string
    order_number: string
    delivery_date: string
  }
  labor_order?: {
    id: string
    order_number: string
    start_date: string
    end_date: string
  }
  related_event?: {
    id: string
    event_type: EventType
    title: string
    event_date: string
  }
}

// For creating a new event
export interface CalendarEventInsert {
  company_id: string
  lead_id?: string | null
  event_type: EventType
  title: string
  description?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  is_all_day?: boolean
  assigned_users?: string[]
  created_by: string
  location?: string | null
  status?: EventStatus
  material_order_id?: string | null
  labor_order_id?: string | null
  related_event_id?: string | null
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  notes?: string | null
}

// For updating an event
export interface CalendarEventUpdate {
  event_type?: EventType
  title?: string
  description?: string | null
  event_date?: string
  start_time?: string | null
  end_time?: string | null
  is_all_day?: boolean
  assigned_users?: string[]
  location?: string | null
  status?: EventStatus
  related_event_id?: string | null
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern | null
  notes?: string | null
}

// Filter options for querying events
export interface EventFilters {
  event_types?: EventType[]
  statuses?: EventStatus[]
  assigned_user_ids?: string[]
  lead_id?: string
  start_date?: string // ISO date string
  end_date?: string // ISO date string
  search?: string // Search in title, description, location
  is_all_day?: boolean
  exclude_cancelled?: boolean
  location_id?: string // For filtering by location (office/location users)
}

// View types for calendar
export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  LIST = 'list',
}

// For checking event conflicts
export interface EventConflict {
  conflict_count: number
  conflicting_events: Array<{
    id: string
    title: string
    start_time: string
    end_time: string
  }>
}

// Duration presets for event creation
export const DURATION_PRESETS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: 'All Day', minutes: null },
] as const

// Days of week for recurrence
export const DAYS_OF_WEEK = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
] as const
