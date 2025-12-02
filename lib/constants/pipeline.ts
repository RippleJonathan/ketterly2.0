/**
 * Lead Pipeline Stages and Checklist Configuration
 * 
 * Defines the multi-stage workflow with sub-task checklists for each stage
 */

// Main pipeline stages
export const LEAD_STAGES = {
  NEW: 'new',
  QUOTE: 'quote',
  PRODUCTION: 'production',
  INVOICED: 'invoiced',
  CLOSED: 'closed',
  LOST: 'lost',
  ARCHIVED: 'archived',
} as const

export type LeadStage = typeof LEAD_STAGES[keyof typeof LEAD_STAGES]

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New Lead',
  quote: 'Quote',
  production: 'Production',
  invoiced: 'Invoiced',
  closed: 'Closed',
  lost: 'Lost',
  archived: 'Archived',
}

export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  quote: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  production: 'bg-orange-100 text-orange-700 border-orange-200',
  invoiced: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  closed: 'bg-teal-100 text-teal-700 border-teal-200',
  lost: 'bg-gray-100 text-gray-700 border-gray-200',
  archived: 'bg-slate-100 text-slate-700 border-slate-200',
}

// Checklist items for each stage
export interface ChecklistItem {
  key: string
  label: string
  order: number
}

export const STAGE_CHECKLIST_ITEMS: Record<string, ChecklistItem[]> = {
  new: [
    { key: 'contacted', label: 'Contacted', order: 1 },
    { key: 'qualified', label: 'Qualified', order: 2 },
  ],
  quote: [
    { key: 'quote_sent', label: 'Quote Sent', order: 1 },
    { key: 'follow_up', label: 'Follow Up', order: 2 },
    { key: 'won', label: 'Won', order: 3 },
  ],
  production: [
    { key: 'deposit_collected', label: 'Deposit Collected', order: 1 },
    { key: 'materials_ordered', label: 'Materials Ordered', order: 2 },
    { key: 'crew_scheduled', label: 'Crew Scheduled', order: 3 },
    { key: 'complete', label: 'Complete', order: 4 },
  ],
  invoiced: [
    { key: 'invoice_sent', label: 'Invoice Sent', order: 1 },
    { key: 'final_payment_collected', label: 'Final Payment Collected', order: 2 },
  ],
  closed: [
    { key: 'expenses_paid', label: 'All Expenses Paid', order: 1 },
    { key: 'commission_paid', label: 'Commission Paid', order: 2 },
    { key: 'review_requested', label: 'Review Requested', order: 3 },
    { key: 'archived', label: 'Archived', order: 4 },
  ],
}

// Pipeline order (for progress visualization)
export const PIPELINE_STAGE_ORDER: LeadStage[] = [
  'new',
  'quote',
  'production',
  'invoiced',
  'closed',
]

/**
 * Get stage badge classes
 */
export function getStageBadgeClasses(stage: LeadStage): string {
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${LEAD_STAGE_COLORS[stage]}`
}

/**
 * Get checklist completion percentage for a stage
 */
export function getStageCompletionPercentage(
  completedItems: Set<string>,
  stageKey: string
): number {
  const items = STAGE_CHECKLIST_ITEMS[stageKey] || []
  if (items.length === 0) return 100
  
  const completed = items.filter(item => completedItems.has(item.key)).length
  return Math.round((completed / items.length) * 100)
}
