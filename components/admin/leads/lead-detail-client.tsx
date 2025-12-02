'use client'

import { PipelineProgress } from './pipeline-progress'
import { AssignUserDropdown } from './assign-user-dropdown'
import { useLead } from '@/lib/hooks/use-leads'
import {
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
  getPriorityBadgeClasses,
} from '@/lib/constants/leads'
import type { Lead } from '@/lib/types'

interface LeadDetailClientProps {
  leadId: string
  initialLead: any
}

export function LeadDetailClient({ leadId, initialLead }: LeadDetailClientProps) {
  // Use React Query to get live data
  const { data: leadResponse } = useLead(leadId)
  const lead = leadResponse?.data || initialLead

  return (
    <>
      {/* Pipeline Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Status</h2>
        <PipelineProgress leadId={leadId} currentStatus={lead.status} />
      </div>

      {/* Lead Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-sm text-gray-500">Priority</p>
            <span className={getPriorityBadgeClasses(lead.priority as any)}>
              {LEAD_PRIORITY_LABELS[lead.priority as keyof typeof LEAD_PRIORITY_LABELS]}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Service</p>
            <p className="text-gray-900 font-medium">
              {lead.service_type}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Source</p>
            <p className="text-gray-900 font-medium">
              {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Assigned To</p>
            <AssignUserDropdown leadId={leadId} currentAssignedTo={lead.assigned_to} />
          </div>
        </div>
      </div>
    </>
  )
}
