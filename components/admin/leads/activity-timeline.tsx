'use client'

import { useActivities } from '@/lib/hooks/use-activities'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Phone, Mail, MessageSquare, Calendar, FileText, CreditCard, ArrowRightLeft } from 'lucide-react'

interface ActivityTimelineProps {
  leadId: string
}

const ACTIVITY_ICONS = {
  note: FileText,
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Calendar,
  status_change: ArrowRightLeft,
  file_upload: FileText,
  payment: CreditCard,
  other: Activity,
}

const ACTIVITY_COLORS = {
  note: 'text-blue-600 bg-blue-100',
  call: 'text-green-600 bg-green-100',
  email: 'text-purple-600 bg-purple-100',
  sms: 'text-orange-600 bg-orange-100',
  meeting: 'text-red-600 bg-red-100',
  status_change: 'text-indigo-600 bg-indigo-100',
  file_upload: 'text-gray-600 bg-gray-100',
  payment: 'text-emerald-600 bg-emerald-100',
  other: 'text-slate-600 bg-slate-100',
}

export function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const { data: activitiesResponse, isLoading } = useActivities('lead', leadId)
  const activities = activitiesResponse?.data || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-100 animate-pulse rounded" />
        <div className="h-12 bg-gray-100 animate-pulse rounded" />
        <div className="h-12 bg-gray-100 animate-pulse rounded" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => {
          const Icon = ACTIVITY_ICONS[activity.activity_type] || Activity
          const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.other

          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                        {activity.created_by_user && (
                          <span className="ml-2 text-gray-500 font-normal">
                            by {activity.created_by_user.full_name}
                          </span>
                        )}
                      </p>
                      {activity.description && (
                        <p className="mt-0.5 text-sm text-gray-500">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <time dateTime={activity.created_at}>
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
