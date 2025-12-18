import { LeadStatus, LeadSubStatus } from '@/lib/types/enums'

/**
 * Status Transition System
 * 
 * This module handles all lead status transitions with:
 * - Automatic transitions based on actions
 * - Manual transitions with validation
 * - Permission checking
 * - Status history logging (via database trigger)
 */

// Type definitions for better type safety
export interface StatusTransition {
  from_status: LeadStatus
  from_sub_status: LeadSubStatus | null
  to_status: LeadStatus
  to_sub_status: LeadSubStatus | null
  automated: boolean
  metadata?: Record<string, any>
}

export interface StatusValidationResult {
  valid: boolean
  error?: string
  requiresPermission?: string
}

/**
 * Valid sub-statuses for each main status
 */
export const VALID_SUB_STATUSES: Record<LeadStatus, LeadSubStatus[]> = {
  [LeadStatus.NEW_LEAD]: [
    LeadSubStatus.UNCONTACTED,
    LeadSubStatus.CONTACTED,
    LeadSubStatus.QUALIFIED,
    LeadSubStatus.NOT_QUALIFIED,
  ],
  [LeadStatus.QUOTE]: [
    LeadSubStatus.ESTIMATING,
    LeadSubStatus.QUOTE_SENT,
    LeadSubStatus.QUOTE_VIEWED,
    LeadSubStatus.NEGOTIATING,
    LeadSubStatus.APPROVED,
    LeadSubStatus.DECLINED,
    LeadSubStatus.EXPIRED,
  ],
  [LeadStatus.PRODUCTION]: [
    LeadSubStatus.CONTRACT_SIGNED,
    LeadSubStatus.SCHEDULED,
    LeadSubStatus.MATERIALS_ORDERED,
    LeadSubStatus.IN_PROGRESS,
    LeadSubStatus.COMPLETED,
    LeadSubStatus.INSPECTION_NEEDED,
    LeadSubStatus.INSPECTION_PASSED,
    LeadSubStatus.ON_HOLD,
    LeadSubStatus.CANCELLED,
  ],
  [LeadStatus.INVOICED]: [
    LeadSubStatus.DRAFT,
    LeadSubStatus.SENT,
    LeadSubStatus.VIEWED,
    LeadSubStatus.PARTIAL_PAYMENT,
    LeadSubStatus.PAID,
    LeadSubStatus.OVERDUE,
    LeadSubStatus.COLLECTIONS,
    LeadSubStatus.WRITTEN_OFF,
  ],
  [LeadStatus.CLOSED]: [
    LeadSubStatus.COMPLETED,
    LeadSubStatus.LOST,
    LeadSubStatus.CANCELLED,
    LeadSubStatus.ARCHIVED,
  ],
}

/**
 * Default sub-status when transitioning to a new main status
 */
export const DEFAULT_SUB_STATUSES: Record<LeadStatus, LeadSubStatus> = {
  [LeadStatus.NEW_LEAD]: LeadSubStatus.UNCONTACTED,
  [LeadStatus.QUOTE]: LeadSubStatus.ESTIMATING,
  [LeadStatus.PRODUCTION]: LeadSubStatus.CONTRACT_SIGNED,
  [LeadStatus.INVOICED]: LeadSubStatus.DRAFT,
  [LeadStatus.CLOSED]: LeadSubStatus.COMPLETED,
}

/**
 * Permissions required for certain transitions
 * Format: "status:sub_status" -> permission
 */
export const TRANSITION_PERMISSIONS: Record<string, string> = {
  'quote:negotiating': 'can_approve_quotes', // Requires manager+ per user notes
  'invoiced:written_off': 'can_manage_invoices',
  'closed:*': 'can_close_leads', // Any transition to closed requires permission
}

/**
 * Validate if a status transition is allowed
 */
export function validateStatusTransition(
  currentStatus: LeadStatus,
  currentSubStatus: LeadSubStatus | null,
  newStatus: LeadStatus,
  newSubStatus: LeadSubStatus | null
): StatusValidationResult {
  // Check if sub-status is valid for the main status
  if (newSubStatus && !VALID_SUB_STATUSES[newStatus].includes(newSubStatus)) {
    return {
      valid: false,
      error: `Invalid sub-status '${newSubStatus}' for status '${newStatus}'`,
    }
  }

  // Check if permission is required
  const permissionKey = `${newStatus}:${newSubStatus || '*'}`
  const wildcardKey = `${newStatus}:*`
  
  if (TRANSITION_PERMISSIONS[permissionKey] || TRANSITION_PERMISSIONS[wildcardKey]) {
    return {
      valid: true,
      requiresPermission: TRANSITION_PERMISSIONS[permissionKey] || TRANSITION_PERMISSIONS[wildcardKey],
    }
  }

  return { valid: true }
}

/**
 * Get the appropriate sub-status when changing main status
 * If no sub-status provided, use the default for that status
 */
export function getTargetSubStatus(
  status: LeadStatus,
  requestedSubStatus?: LeadSubStatus | null
): LeadSubStatus {
  if (requestedSubStatus && VALID_SUB_STATUSES[status].includes(requestedSubStatus)) {
    return requestedSubStatus
  }
  return DEFAULT_SUB_STATUSES[status]
}

/**
 * Automatic Transitions
 * These functions return the new status/sub-status for various actions
 */

export function getStatusAfterQuoteCreated(): StatusTransition {
  return {
    from_status: LeadStatus.NEW_LEAD,
    from_sub_status: null,
    to_status: LeadStatus.QUOTE,
    to_sub_status: LeadSubStatus.ESTIMATING,
    automated: true,
    metadata: { action: 'quote_created' },
  }
}

export function getStatusAfterQuoteSent(): StatusTransition {
  return {
    from_status: LeadStatus.QUOTE,
    from_sub_status: LeadSubStatus.ESTIMATING,
    to_status: LeadStatus.QUOTE,
    to_sub_status: LeadSubStatus.QUOTE_SENT,
    automated: true,
    metadata: { action: 'quote_sent' },
  }
}

export function getStatusAfterQuoteViewed(): StatusTransition {
  return {
    from_status: LeadStatus.QUOTE,
    from_sub_status: LeadSubStatus.QUOTE_SENT,
    to_status: LeadStatus.QUOTE,
    to_sub_status: LeadSubStatus.QUOTE_VIEWED,
    automated: true,
    metadata: { action: 'quote_viewed' },
  }
}

export function getStatusAfterQuoteApproved(): StatusTransition {
  return {
    from_status: LeadStatus.QUOTE,
    from_sub_status: null,
    to_status: LeadStatus.QUOTE,
    to_sub_status: LeadSubStatus.APPROVED,
    automated: true,
    metadata: { action: 'quote_approved' },
  }
}

export function getStatusAfterContractSigned(): StatusTransition {
  return {
    from_status: LeadStatus.QUOTE,
    from_sub_status: LeadSubStatus.APPROVED,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.CONTRACT_SIGNED,
    automated: true,
    metadata: { action: 'contract_signed' },
  }
}

export function getStatusAfterJobScheduled(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: null,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.SCHEDULED,
    automated: true,
    metadata: { action: 'job_scheduled' },
  }
}

export function getStatusAfterMaterialsOrdered(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: null,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.MATERIALS_ORDERED,
    automated: true,
    metadata: { action: 'materials_ordered' },
  }
}

export function getStatusAfterJobStarted(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: null,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.IN_PROGRESS,
    automated: true,
    metadata: { action: 'job_started' },
  }
}

export function getStatusAfterJobCompleted(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: LeadSubStatus.IN_PROGRESS,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.COMPLETED,
    automated: true,
    metadata: { action: 'job_completed' },
  }
}

export function getStatusAfterInspectionPassed(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: LeadSubStatus.INSPECTION_NEEDED,
    to_status: LeadStatus.PRODUCTION,
    to_sub_status: LeadSubStatus.INSPECTION_PASSED,
    automated: true,
    metadata: { action: 'inspection_passed' },
  }
}

export function getStatusAfterInvoiceCreated(): StatusTransition {
  return {
    from_status: LeadStatus.PRODUCTION,
    from_sub_status: LeadSubStatus.COMPLETED,
    to_status: LeadStatus.INVOICED,
    to_sub_status: LeadSubStatus.DRAFT,
    automated: true,
    metadata: { action: 'invoice_created' },
  }
}

export function getStatusAfterInvoiceSent(): StatusTransition {
  return {
    from_status: LeadStatus.INVOICED,
    from_sub_status: LeadSubStatus.DRAFT,
    to_status: LeadStatus.INVOICED,
    to_sub_status: LeadSubStatus.SENT,
    automated: true,
    metadata: { action: 'invoice_sent' },
  }
}

export function getStatusAfterInvoiceViewed(): StatusTransition {
  return {
    from_status: LeadStatus.INVOICED,
    from_sub_status: LeadSubStatus.SENT,
    to_status: LeadStatus.INVOICED,
    to_sub_status: LeadSubStatus.VIEWED,
    automated: true,
    metadata: { action: 'invoice_viewed' },
  }
}

export function getStatusAfterPartialPayment(): StatusTransition {
  return {
    from_status: LeadStatus.INVOICED,
    from_sub_status: null,
    to_status: LeadStatus.INVOICED,
    to_sub_status: LeadSubStatus.PARTIAL_PAYMENT,
    automated: true,
    metadata: { action: 'partial_payment_received' },
  }
}

export function getStatusAfterFullPayment(allExpensesPaid: boolean): StatusTransition {
  // Per user notes: Can only close when ALL payments received AND all expenses/commissions paid
  if (allExpensesPaid) {
    return {
      from_status: LeadStatus.INVOICED,
      from_sub_status: LeadSubStatus.PAID,
      to_status: LeadStatus.CLOSED,
      to_sub_status: LeadSubStatus.COMPLETED,
      automated: true,
      metadata: { action: 'fully_paid_and_expenses_settled' },
    }
  } else {
    return {
      from_status: LeadStatus.INVOICED,
      from_sub_status: null,
      to_status: LeadStatus.INVOICED,
      to_sub_status: LeadSubStatus.PAID,
      automated: true,
      metadata: { action: 'payment_received_full' },
    }
  }
}

export function getStatusAfterInvoiceOverdue(): StatusTransition {
  return {
    from_status: LeadStatus.INVOICED,
    from_sub_status: null,
    to_status: LeadStatus.INVOICED,
    to_sub_status: LeadSubStatus.OVERDUE,
    automated: true,
    metadata: { action: 'invoice_overdue' },
  }
}

/**
 * Format status for display
 */
export function formatStatusDisplay(status: LeadStatus, subStatus?: LeadSubStatus | null): string {
  const mainStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  
  if (!subStatus) return mainStatus
  
  const sub = subStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return `${mainStatus} - ${sub}`
}

/**
 * Get status badge color based on status
 */
export function getStatusColor(status: LeadStatus, subStatus?: LeadSubStatus | null): string {
  // Special handling for certain sub-statuses
  if (subStatus === LeadSubStatus.DECLINED || subStatus === LeadSubStatus.LOST) {
    return 'red'
  }
  if (subStatus === LeadSubStatus.CANCELLED || subStatus === LeadSubStatus.ON_HOLD) {
    return 'yellow'
  }
  if (subStatus === LeadSubStatus.COMPLETED || subStatus === LeadSubStatus.PAID) {
    return 'green'
  }
  if (subStatus === LeadSubStatus.OVERDUE || subStatus === LeadSubStatus.EXPIRED) {
    return 'red'
  }

  // Default colors by main status
  switch (status) {
    case LeadStatus.NEW_LEAD:
      return 'blue'
    case LeadStatus.QUOTE:
      return 'purple'
    case LeadStatus.PRODUCTION:
      return 'orange'
    case LeadStatus.INVOICED:
      return 'teal'
    case LeadStatus.CLOSED:
      return 'gray'
    default:
      return 'gray'
  }
}
