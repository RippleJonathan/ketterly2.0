'use client'

import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { 
  Plus,
  MapPin,
  Users, 
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UpcomingSchedule } from '@/components/admin/dashboard/upcoming-schedule'
import { RecentJobs } from '@/components/admin/dashboard/recent-jobs'
import { Leaderboard } from '@/components/admin/dashboard/leaderboard'

export default function DashboardPage() {
  const router = useRouter()
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const { data: stats, isLoading } = useDashboardStats()

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isOffice = user?.role === 'office'
  const isSales = user?.role === 'sales' || user?.role === 'sales_manager'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {isAdmin && `Here's what's happening with ${company?.name || 'your business'} today`}
          {isOffice && `Here's what's happening at your location today`}
          {isSales && `Here's your performance today`}
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => router.push('/admin/leads/new')}
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">New Lead</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => router.push('/admin/door-knocking')}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-sm font-medium">Map</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => router.push('/admin/leads')}
        >
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Leads</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => router.push('/admin/calendar')}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">Calendar</span>
        </Button>
      </div>

      {/* This Month Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {isLoading ? '...' : stats?.totalLeadsThisMonth || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Leads</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {isLoading ? '...' : stats?.signedContractsThisMonth || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Signed Contracts</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {isLoading ? '...' : formatCurrency(stats?.revenueThisMonth || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <UpcomingSchedule myEventsOnly={!isAdmin} limit={5} />

      {/* Recent Jobs */}
      <RecentJobs limit={5} />

      {/* Leaderboard */}
      <Leaderboard limit={5} />
    </div>
  )
}
