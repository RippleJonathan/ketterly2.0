'use client'

import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { 
  Users, 
  FileText, 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatCard } from '@/components/admin/dashboard/stat-card'
import { PipelineChart } from '@/components/admin/dashboard/pipeline-chart'
import { RevenueChart } from '@/components/admin/dashboard/revenue-chart'
import { UpcomingSchedule } from '@/components/admin/dashboard/upcoming-schedule'
import { RecentActivity } from '@/components/admin/dashboard/recent-activity'
import { UrgencyAlerts } from '@/components/admin/dashboard/urgency-alerts'
import { CommissionTracker } from '@/components/admin/dashboard/commission-tracker'

export default function DashboardPage() {
  const router = useRouter()
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { data: stats, isLoading } = useDashboardStats()

  const isSales = user?.role === 'sales' || user?.role === 'marketing'
  const isProduction = user?.role === 'production_manager' || user?.role === 'installer'
  const isOffice = user?.role === 'office'
  const isAdmin = user?.role === 'admin'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with {company?.name || 'your business'} today
        </p>
      </div>

      {/* Key Metrics - Role Specific */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sales & Admin: Lead Metrics */}
        {(isSales || isAdmin) && (
          <>
            <StatCard
              title="Total Leads"
              value={stats?.totalLeads || 0}
              change={{
                value: stats?.newLeadsThisWeek || 0,
                type: 'positive',
                label: 'this week',
              }}
              icon={Users}
              color="blue"
              onClick={() => router.push('/admin/leads')}
              loading={isLoading}
            />
            <StatCard
              title="Active Leads"
              value={stats?.activeLeads || 0}
              change={{
                value: stats?.newLeadsToday || 0,
                type: 'positive',
                label: 'today',
              }}
              icon={TrendingUp}
              color="green"
              onClick={() => router.push('/admin/leads?filter=active')}
              loading={isLoading}
            />
          </>
        )}

        {/* Sales & Admin: Quote Metrics */}
        {(isSales || isAdmin) && (
          <StatCard
            title="Pending Quotes"
            value={stats?.pendingQuotes || 0}
            change={{
              value: `${stats?.quoteWinRate.toFixed(0) || 0}%`,
              type: 'neutral',
              label: 'win rate',
            }}
            icon={FileText}
            color="purple"
            onClick={() => router.push('/admin/leads?filter=pending_quotes')}
            loading={isLoading}
          />
        )}

        {/* Production: Project Metrics */}
        {(isProduction || isAdmin) && (
          <StatCard
            title="Active Projects"
            value={stats?.activeProjects || 0}
            change={{
              value: stats?.scheduledThisWeek || 0,
              type: 'positive',
              label: 'scheduled',
            }}
            icon={Briefcase}
            color="orange"
            onClick={() => router.push('/admin/calendar')}
            loading={isLoading}
          />
        )}

        {/* Office & Admin: Financial Metrics */}
        {(isOffice || isAdmin) && (
          <>
            <StatCard
              title="Outstanding Invoices"
              value={stats?.outstandingInvoices || 0}
              change={{
                value: stats?.overdueInvoices || 0,
                type: stats?.overdueInvoices ? 'negative' : 'neutral',
                label: 'overdue',
              }}
              icon={DollarSign}
              color="yellow"
              onClick={() => router.push('/admin/invoices?status=outstanding')}
              loading={isLoading}
            />
            <StatCard
              title="Revenue This Month"
              value={formatCurrency(stats?.revenueThisMonth || 0)}
              icon={TrendingUp}
              color="green"
              onClick={() => router.push('/admin/reports')}
              loading={isLoading}
            />
          </>
        )}

        {/* Everyone gets at least one card if role-specific aren't shown */}
        {!isSales && !isAdmin && !isOffice && !isProduction && (
          <StatCard
            title="My Schedule Today"
            value="0"
            icon={Calendar}
            color="blue"
            onClick={() => router.push('/admin/calendar')}
            loading={isLoading}
          />
        )}
      </div>

      {/* Urgency Alerts - Always Show if Any Exist */}
      {(stats?.unsignedQuotesOlderThan7Days || stats?.invoicesOverdue30Plus || stats?.overdueFollowUps) ? (
        <UrgencyAlerts />
      ) : null}

      {/* Main Content Grid - Role Specific */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Sales & Marketing: Commission Tracker */}
          {isSales && <CommissionTracker />}

          {/* Everyone: My Schedule */}
          <UpcomingSchedule myEventsOnly={!isAdmin} limit={5} />

          {/* Sales & Admin: Pipeline Chart */}
          {(isSales || isAdmin) && <PipelineChart />}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Recent Activity Feed */}
          <RecentActivity />

          {/* Office & Admin: Revenue Chart */}
          {(isOffice || isAdmin) && <RevenueChart />}
        </div>
      </div>
    </div>
  )
}
