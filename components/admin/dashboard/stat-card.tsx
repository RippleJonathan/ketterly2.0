'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string | number
    type: 'positive' | 'negative' | 'neutral'
    label?: string
  }
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow'
  onClick?: () => void
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    lightBg: 'bg-blue-50',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    lightBg: 'bg-green-50',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    lightBg: 'bg-purple-50',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    lightBg: 'bg-orange-50',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    lightBg: 'bg-red-50',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    lightBg: 'bg-yellow-50',
  },
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  onClick,
  loading,
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn(colors.bg, 'p-3 rounded-lg')}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
              change.type === 'positive' && 'bg-green-100 text-green-700',
              change.type === 'negative' && 'bg-red-100 text-red-700',
              change.type === 'neutral' && 'bg-gray-100 text-gray-700'
            )}
          >
            {change.type === 'positive' && '+'}
            {change.value}
            {change.label && <span className="text-xs ml-1">{change.label}</span>}
          </div>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-9 bg-gray-200 animate-pulse rounded mb-2" />
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        )}
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'blue' | 'green' | 'red' | 'yellow'
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  color = 'blue',
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border transition-all',
        color === 'blue' && 'bg-blue-50 border-blue-200',
        color === 'green' && 'bg-green-50 border-green-200',
        color === 'red' && 'bg-red-50 border-red-200',
        color === 'yellow' && 'bg-yellow-50 border-yellow-200',
        onClick && 'cursor-pointer hover:shadow-md'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-700 mt-1">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {trend && trendValue && (
          <div
            className={cn(
              'text-sm font-semibold',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-gray-600'
            )}
          >
            {trend === 'up' && '↗'}
            {trend === 'down' && '↘'}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )
}
