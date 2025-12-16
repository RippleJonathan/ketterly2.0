'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLead } from '@/lib/hooks/use-leads'
import { LEAD_SOURCE_LABELS } from '@/lib/constants/leads'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Button } from '@/components/ui/button'
import { Pencil, Phone, Mail, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { PipelineProgress } from '@/components/admin/leads/pipeline-progress'
import { useState } from 'react'

export function DynamicSidebarHeader() {
  const pathname = usePathname()
  const { data: company } = useCurrentCompany()
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Extract lead ID from pathname if we're on a lead detail page
  const leadIdMatch = pathname.match(/\/admin\/leads\/([^\/\?]+)/)
  const leadId = leadIdMatch ? leadIdMatch[1] : null
  
  // Only fetch lead data if we're on a lead detail page
  const { data: leadResponse } = useLead(leadId || '')
  const lead = leadResponse?.data

  // Lead detail page
  if (leadId && lead) {
    return (
      <div className="border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="p-4">
          <Link href="/admin/dashboard" className="block mb-3">
            <h1 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {company?.name || 'Ketterly'}
            </h1>
          </Link>
          
          <div className="flex items-start justify-between gap-2">
            {/* Name */}
            <h2 className="text-lg font-bold text-gray-900 leading-tight flex-1">
              {lead.full_name}
            </h2>
            
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
          {/* Contact Info */}
          <div className="space-y-1.5 text-xs">
            {lead.phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-3 w-3 text-gray-500" />
                <a href={`tel:${lead.phone}`} className="hover:text-blue-600 transition-colors">
                  {lead.phone}
                </a>
              </div>
            )}
            
            {lead.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-3 w-3 text-gray-500" />
                <a href={`mailto:${lead.email}`} className="hover:text-blue-600 transition-colors truncate">
                  {lead.email}
                </a>
              </div>
            )}
            
            {lead.address && (
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="leading-tight">
                  {lead.address}
                  {(lead.city || lead.state || lead.zip) && (
                    <div>
                      {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lead Source */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Lead Source:</div>
            <div className="text-xs font-medium text-gray-900">
              {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS]}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <div className="text-xs text-gray-600 mb-1">Assigned to:</div>
            <div className="text-xs font-medium text-gray-900">
              {(lead as any).assigned_user?.full_name || 'Unassigned'}
            </div>
          </div>

          {/* Status Bar */}
          <div>
            <div className="text-xs text-gray-600 mb-2">Status:</div>
            <PipelineProgress leadId={leadId} currentStatus={lead.status} compact />
          </div>

          {/* Edit Lead Button */}
          <Link href={`/admin/leads/${leadId}/edit`} className="block">
            <Button variant="outline" size="sm" className="w-full">
              <Pencil className="h-3 w-3 mr-2" />
              Edit Lead
            </Button>
          </Link>
        </div>
        )}
      </div>
    )
  }

  // Settings page
  if (pathname.includes('/admin/settings')) {
    return (
      <div className="p-6 border-b border-gray-200">
        <Link href="/admin/dashboard" className="block">
          <h1 className="text-xl font-bold text-gray-900">
            {company?.name || 'Ketterly'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Settings</p>
        </Link>
      </div>
    )
  }

  // Default - Company info
  return (
    <div className="p-6 border-b border-gray-200">
      <Link href="/admin/dashboard" className="block">
        <h1 className="text-xl font-bold text-gray-900">
          {company?.name || 'Ketterly'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">CRM Dashboard</p>
      </Link>
    </div>
  )
}
