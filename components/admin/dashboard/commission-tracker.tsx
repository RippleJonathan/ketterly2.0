'use client'

import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { DollarSign, TrendingUp, Award } from 'lucide-react'
import Link from 'next/link'

export function CommissionTracker() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Commissions</h2>
        <div className="space-y-4">
          <div className="h-20 bg-gray-100 animate-pulse rounded" />
          <div className="h-20 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const thisMonth = stats?.myCommissionsThisMonth || 0
  const total = stats?.myCommissionsTotal || 0
  const leadsThisMonth = stats?.myLeadsThisMonth || 0
  const avgCommissionPerLead = leadsThisMonth > 0 ? thisMonth / leadsThisMonth : 0

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 p-2 rounded-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">My Commissions</h2>
        </div>
        <Link
          href="/admin/reports"
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          View details →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">This Month</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(thisMonth)}</p>
          <p className="text-xs text-gray-500 mt-1">{leadsThisMonth} leads closed</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-600">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>
      </div>

      {leadsThisMonth > 0 && (
        <div className="bg-white/60 rounded-lg p-3 border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Average per lead this month</p>
          <p className="text-lg font-semibold text-green-700">
            {formatCurrency(avgCommissionPerLead)}
          </p>
        </div>
      )}
    </div>
  )
}
