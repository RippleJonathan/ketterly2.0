'use client'

import { useRecentActivity } from '@/lib/hooks/use-dashboard'
import { UserPlus, FileText, CheckCircle, DollarSign, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ACTIVITY_ICONS = {
  lead_created: UserPlus,
  quote_sent: FileText,
  quote_signed: CheckCircle,
  invoice_paid: CheckCircle,
  payment_received: DollarSign,
}

const ACTIVITY_COLORS = {
  lead_created: 'bg-blue-100 text-blue-600',
  quote_sent: 'bg-purple-100 text-purple-600',
  quote_signed: 'bg-green-100 text-green-600',
  invoice_paid: 'bg-green-100 text-green-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
}

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity(10)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type] || Activity
          const colorClass = ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600'
          const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })

          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`${colorClass} p-2 rounded-lg shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-700 truncate">{activity.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-gray-500">{timeAgo}</p>
                  {activity.amount && (
                    <span className="text-xs font-semibold text-green-600">
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
