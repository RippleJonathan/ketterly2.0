'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Phone, Mail, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { PipelineProgress } from '@/components/admin/leads/pipeline-progress'
import { LEAD_STATUS_LABELS } from '@/lib/constants/leads'
import Link from 'next/link'
import { format } from 'date-fns'

interface LeadSummaryCardProps {
  lead: any
  leadId: string
}

export function LeadSummaryCard({ lead, leadId }: LeadSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Name */}
          <h2 className="text-lg font-bold text-gray-900 leading-tight flex-1">
            {lead.full_name}
          </h2>

          {/* Collapse/Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Contact Info + Sales Rep */}
            <div className="space-y-3">
              {/* Contact Info */}
              <div className="space-y-1.5 text-sm">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <a href={`tel:${lead.phone}`} className="hover:text-blue-600 transition-colors">
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600 transition-colors truncate">
                      {lead.email}
                    </a>
                  </div>
                )}

                {lead.address && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leading-tight hover:text-blue-600 transition-colors"
                    >
                      {lead.address}
                      {(lead.city || lead.state || lead.zip) && (
                        <div>
                          {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </a>
                  </div>
                )}
              </div>

              {/* Sales Rep */}
              <div>
                <div className="text-xs text-gray-600 mb-1">Sales Rep:</div>
                <div className="text-sm font-medium text-gray-900">
                  {(lead as any).sales_rep_user?.full_name || 'Unassigned'}
                </div>
              </div>
            </div>

            {/* Right Column: Additional Details in 2 sub-columns */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Sub-Left Column */}
                <div className="space-y-3">
                  {/* Location */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Location:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {(lead as any).location?.name || 'No Location'}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Status:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] || lead.status}
                    </div>
                  </div>
                </div>

                {/* Sub-Right Column */}
                <div className="space-y-3">
                  {/* Created At */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Created:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(lead.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {/* Last Edited */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Last Edited:</div>
                    <div className="text-sm font-medium text-gray-900">
                      {lead.updated_at ? format(new Date(lead.updated_at), 'MMM d, yyyy') : 'Never'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Pipeline Status:</div>
            <PipelineProgress leadId={leadId} currentStatus={lead.status} compact />
          </div>
        </div>
      )}
    </div>
  )
}