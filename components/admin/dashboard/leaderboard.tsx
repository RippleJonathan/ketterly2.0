'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, TrendingUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

interface LeaderboardEntry {
  user_id: string
  full_name: string
  revenue: number
  contracts: number
}

type TimePeriod = 'week' | 'month' | 'year'

export function Leaderboard({ limit = 5 }: { limit?: number }) {
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const [showTop10, setShowTop10] = useState(false)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  const displayLimit = showTop10 ? 10 : limit

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', company?.id, displayLimit, timePeriod],
    queryFn: async () => {
      const supabase = createClient()
      
      // Calculate time period start
      const now = new Date()
      let startDate: Date
      
      if (timePeriod === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay())) // Start of week
      } else if (timePeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Start of month
      } else {
        startDate = new Date(now.getFullYear(), 0, 1) // Start of year
      }
      
      const startOfPeriod = startDate.toISOString()

      // Get all invoices this period with their lead's sales rep
      // Count ALL invoices to show sales made (not just money collected)
      const { data: invoices } = await supabase
        .from('customer_invoices')
        .select(`
          id,
          total,
          created_at,
          lead_id,
          leads!inner (
            sales_rep_id,
            users:sales_rep_id (
              id,
              full_name
            ),
            deleted_at
          )
        `)
        .eq('company_id', company!.id)
        .gte('created_at', startOfPeriod)
        .is('deleted_at', null)
        .is('leads.deleted_at', null)

      if (!invoices) return { byRevenue: [], byContracts: [] }

      // Aggregate by user
      const userStats = new Map<string, LeaderboardEntry>()

      invoices.forEach((invoice: any) => {
        const salesRepId = invoice.leads?.sales_rep_id
        const salesRep = invoice.leads?.users
        
        if (!salesRepId || !salesRep) return

        const existing = userStats.get(salesRepId)

        if (existing) {
          existing.revenue += invoice.total || 0
          existing.contracts += 1
        } else {
          userStats.set(salesRepId, {
            user_id: salesRepId,
            full_name: salesRep.full_name,
            revenue: invoice.total || 0,
            contracts: 1,
          })
        }
      })

      const entries = Array.from(userStats.values())

      return {
        byRevenue: [...entries].sort((a, b) => b.revenue - a.revenue).slice(0, displayLimit),
        byContracts: [...entries].sort((a, b) => b.contracts - a.contracts).slice(0, displayLimit),
      }
    },
    enabled: !!company?.id,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getPeriodLabel = () => {
    if (timePeriod === 'week') return 'This Week'
    if (timePeriod === 'month') return 'This Month'
    return 'This Year'
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard ({getPeriodLabel()})
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant={timePeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={timePeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('month')}
          >
            Month
          </Button>
          <Button
            variant={timePeriod === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('year')}
          >
            Year
          </Button>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTop10(!showTop10)}
            >
              {showTop10 ? 'Top 5' : 'Top 10'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue">By Revenue</TabsTrigger>
            <TabsTrigger value="contracts">By Contracts</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            {leaderboard?.byRevenue && leaderboard.byRevenue.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.byRevenue.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      entry.user_id === user?.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-8 flex-shrink-0">
                        {getMedalEmoji(index) || `#${index + 1}`}
                      </span>
                      <div>
                        <p className="font-medium">
                          {entry.full_name}
                          {entry.user_id === user?.id && (
                            <span className="text-sm text-blue-600 ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.contracts} {entry.contracts === 1 ? 'contract' : 'contracts'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(entry.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data for this period
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            {leaderboard?.byContracts && leaderboard.byContracts.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.byContracts.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      entry.user_id === user?.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-8 flex-shrink-0">
                        {getMedalEmoji(index) || `#${index + 1}`}
                      </span>
                      <div>
                        <p className="font-medium">
                          {entry.full_name}
                          {entry.user_id === user?.id && (
                            <span className="text-sm text-blue-600 ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(entry.revenue)} in revenue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        {entry.contracts} {entry.contracts === 1 ? 'contract' : 'contracts'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data for this period
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
