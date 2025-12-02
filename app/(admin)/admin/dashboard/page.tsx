'use client'

import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useLeads } from '@/lib/hooks/use-leads'
import { Users, FileText, Briefcase, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function DashboardPage() {
  const { data: company } = useCurrentCompany()
  const { data: leadsResponse } = useLeads()
  const leads = leadsResponse?.data || []

  // Calculate stats
  const totalLeads = leads.length
  const newLeads = leads.filter((l: any) => l.status === 'new').length
  const qualifiedLeads = leads.filter((l: any) => l.status === 'qualified').length
  const wonLeads = leads.filter((l: any) => l.status === 'won').length

  const stats = [
    {
      name: 'Total Leads',
      value: totalLeads,
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'blue',
    },
    {
      name: 'New Leads',
      value: newLeads,
      change: '+5',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'green',
    },
    {
      name: 'Qualified',
      value: qualifiedLeads,
      change: '+3',
      changeType: 'positive',
      icon: FileText,
      color: 'purple',
    },
    {
      name: 'Won',
      value: wonLeads,
      change: '+2',
      changeType: 'positive',
      icon: Briefcase,
      color: 'orange',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with {company?.name || 'your business'} today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClass = colorClasses[stat.color as keyof typeof colorClasses]

          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${colorClass} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Leads
          </h2>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead: any) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {lead.full_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{lead.full_name}</p>
                    <p className="text-sm text-gray-600">{lead.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <Users className="w-6 h-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                New Lead
              </p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                New Quote
              </p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                New Project
              </p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <TrendingUp className="w-6 h-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                View Reports
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
