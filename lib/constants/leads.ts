/**
 * Lead Management Constants
 * 
 * Centralized constants for lead statuses, sources, priorities, and their visual representations.
 * Used throughout the lead management system for consistency.
 */

// ============================================================================
// Lead Statuses
// ============================================================================

export const LEAD_STATUSES = {
  NEW: 'new',
  QUOTE: 'quote',
  PRODUCTION: 'production',
  INVOICED: 'invoiced',
  CLOSED: 'closed',
  LOST: 'lost',
  ARCHIVED: 'archived',
} as const

export type LeadStatus = typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  quote: 'Quote',
  production: 'Production',
  invoiced: 'Invoiced',
  closed: 'Closed',
  lost: 'Lost',
  archived: 'Archived',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  quote: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  production: 'bg-green-100 text-green-700 border-green-200',
  invoiced: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  closed: 'bg-teal-100 text-teal-700 border-teal-200',
  lost: 'bg-gray-100 text-gray-700 border-gray-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200',
}

// Status order for pipeline progress
export const LEAD_STATUS_ORDER: LeadStatus[] = [
  'new',
  'quote',
  'production',
  'invoiced',
  'closed',
  // Note: 'lost' and 'archived' are terminal states, not shown in linear progression
]

// ============================================================================
// Lead Sources
// ============================================================================

export const LEAD_SOURCES = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  HOMEADVISOR: 'homeadvisor',
  ANGI: 'angi',
  THUMBTACK: 'thumbtack',
  YELP: 'yelp',
  DIRECT: 'direct',
  OTHER: 'other',
} as const

export type LeadSource = typeof LEAD_SOURCES[keyof typeof LEAD_SOURCES]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  google: 'Google Ads',
  facebook: 'Facebook',
  instagram: 'Instagram',
  homeadvisor: 'HomeAdvisor',
  angi: 'Angi',
  thumbtack: 'Thumbtack',
  yelp: 'Yelp',
  direct: 'Direct',
  other: 'Other',
}

export const LEAD_SOURCE_ICONS: Record<LeadSource, string> = {
  website: '🌐',
  referral: '👥',
  google: '🔍',
  facebook: '👍',
  instagram: '📷',
  homeadvisor: '🏠',
  angi: '🔧',
  thumbtack: '📌',
  yelp: '⭐',
  direct: '📞',
  other: '❓',
}

// ============================================================================
// Lead Priorities
// ============================================================================

export const LEAD_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export type LeadPriority = typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES]

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const LEAD_PRIORITY_COLORS: Record<LeadPriority, string> = {
  low: 'bg-gray-100 text-gray-600 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
}

// ============================================================================
// Service Types (from database schema)
// ============================================================================

export const SERVICE_TYPES = {
  INSPECTION: 'inspection',
  REPAIR: 'repair',
  REPLACEMENT: 'replacement',
  NEW_CONSTRUCTION: 'new_construction',
  MAINTENANCE: 'maintenance',
  EMERGENCY: 'emergency',
  GUTTER: 'gutter',
  SIDING: 'siding',
  WINDOWS: 'windows',
  OTHER: 'other',
} as const

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  inspection: 'Inspection',
  repair: 'Repair',
  replacement: 'Full Replacement',
  new_construction: 'New Construction',
  maintenance: 'Maintenance',
  emergency: 'Emergency',
  gutter: 'Gutter Work',
  siding: 'Siding',
  windows: 'Windows',
  other: 'Other',
}

export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  inspection: '🔍',
  repair: '🔧',
  replacement: '🏗️',
  new_construction: '🏠',
  maintenance: '🛠️',
  emergency: '🚨',
  gutter: '💧',
  siding: '🏘️',
  windows: '🪟',
  other: '📋',
}

// ============================================================================
// Filter Options
// ============================================================================

export const LEAD_FILTER_OPTIONS = {
  statuses: Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
  sources: Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
  priorities: Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
  serviceTypes: Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
}

// Convenience export for form dropdowns
export const SERVICE_TYPE_OPTIONS = LEAD_FILTER_OPTIONS.serviceTypes

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the badge classes for a lead status
 */
export function getStatusBadgeClasses(status: LeadStatus): string {
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${LEAD_STATUS_COLORS[status]}`
}

/**
 * Get the badge classes for a lead priority
 */
export function getPriorityBadgeClasses(priority: LeadPriority): string {
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${LEAD_PRIORITY_COLORS[priority]}`
}

/**
 * Get the current stage index in the pipeline (0-based)
 */
export function getStatusStageIndex(status: LeadStatus): number {
  return LEAD_STATUS_ORDER.indexOf(status)
}

/**
 * Calculate pipeline progress percentage (0-100)
 */
export function getStatusProgressPercentage(status: LeadStatus): number {
  const index = getStatusStageIndex(status)
  if (index === -1) return 0 // Lost status
  return Math.round(((index + 1) / LEAD_STATUS_ORDER.length) * 100)
}
