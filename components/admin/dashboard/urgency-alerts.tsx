'use client'

import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { AlertTriangle, FileText, DollarSign, Bell } from 'lucide-react'
import Link from 'next/link'

export function UrgencyAlerts() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h2>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const alerts = [
    {
      id: 'unsigned-quotes',
      title: 'Unsigned Quotes (7+ days)',
      count: stats?.unsignedQuotesOlderThan7Days || 0,
      icon: FileText,
      color: 'yellow',
      href: '/admin/leads?filter=unsigned_quotes',
    },
    {
      id: 'overdue-invoices',
      title: 'Invoices 30+ Days Overdue',
      count: stats?.invoicesOverdue30Plus || 0,
      icon: DollarSign,
      color: 'red',
      href: '/admin/invoices?status=overdue',
    },
    {
      id: 'overdue-followups',
      title: 'Overdue Follow-ups',
      count: stats?.overdueFollowUps || 0,
      icon: Bell,
      color: 'orange',
      href: '/admin/leads?filter=overdue_followups',
    },
  ]

  const activeAlerts = alerts.filter(alert => alert.count > 0)

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h2>
        <div className="text-center py-6 text-green-600">
          <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-gray-500 mt-1">No urgent items require attention</p>
        </div>
      </div>
    )
  }

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
  }

  const iconColorClasses = {
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold text-gray-900">Needs Attention</h2>
      </div>

      <div className="space-y-3">
        {activeAlerts.map((alert) => {
          const Icon = alert.icon
          const colorClass = colorClasses[alert.color as keyof typeof colorClasses]
          const iconColorClass = iconColorClasses[alert.color as keyof typeof iconColorClasses]

          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={`block p-4 rounded-lg border ${colorClass} hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${iconColorClass} p-2 rounded-lg`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-700">{alert.count} items</p>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
