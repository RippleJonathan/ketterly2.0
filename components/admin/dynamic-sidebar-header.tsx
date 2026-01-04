'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLead } from '@/lib/hooks/use-leads'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

export function DynamicSidebarHeader() {
  const pathname = usePathname()
  const { data: company } = useCurrentCompany()
  
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

          <div className="text-sm text-gray-600">
            Lead Details
          </div>
        </div>
      </div>
    )
  }
        
        {/* Settings page */}
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
