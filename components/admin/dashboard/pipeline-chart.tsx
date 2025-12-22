'use client'

import { usePipelineMetrics } from '@/lib/hooks/use-dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export function PipelineChart() {
  const { data: metrics, isLoading } = usePipelineMetrics()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
        <div className="h-64 bg-gray-100 animate-pulse rounded" />
      </div>
    )
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No pipeline data available
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
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sales Pipeline</h2>
        <p className="text-sm text-gray-600 mt-1">Leads and potential revenue by stage</p>
      </div>

      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="stage"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }: { active?: boolean; payload?: readonly any[] }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0].payload
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-900">{data.stage}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">{data.count}</span> leads
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{formatCurrency(data.value)}</span> potential
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {metrics.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.stage} className="text-center">
            <div
              className="w-4 h-4 rounded-full mx-auto mb-1"
              style={{ backgroundColor: metric.color }}
            />
            <p className="text-xs font-medium text-gray-700">{metric.stage}</p>
            <p className="text-sm font-semibold text-gray-900">{metric.count}</p>
            <p className="text-xs text-gray-500">{formatCurrency(metric.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
