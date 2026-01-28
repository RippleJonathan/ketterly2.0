'use client'

import { MapPin } from 'lucide-react'

interface LeadSummaryCardProps {
  lead: any
  leadId: string
}

export function LeadSummaryCard({ lead, leadId }: LeadSummaryCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="space-y-3">
        {/* Customer Name */}
        <h1 className="text-2xl font-bold text-gray-900">
          {lead.full_name}
        </h1>

        {/* Customer Address */}
        {lead.address && (
          <div className="flex items-start gap-2 text-gray-700">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base hover:text-blue-600 transition-colors"
            >
              <div>{lead.address}</div>
              {(lead.city || lead.state || lead.zip) && (
                <div>
                  {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                </div>
              )}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}