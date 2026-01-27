'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsTable } from '@/components/admin/door-knocking/analytics-table';
import { useDoorKnockAnalytics } from '@/lib/hooks/use-door-knock-analytics';
import { useCurrentCompany } from '@/lib/hooks/use-current-company';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Loader2, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from 'date-fns';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all';

export default function DoorKnockingAnalyticsPage() {
  const { data: company } = useCurrentCompany();
  const { data: currentUser } = useCurrentUser();

  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Office users should see only their location data
  const userRole = currentUser?.data?.role;
  const userLocationId = currentUser?.data?.location_id;
  const isOfficeUser = userRole === 'office';

  // Calculate date filters
  const filters = useMemo(() => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now).toISOString();
        endDate = endOfDay(now).toISOString();
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
        endDate = endOfDay(now).toISOString();
        break;
      case 'month':
        startDate = startOfMonth(now).toISOString();
        endDate = endOfDay(now).toISOString();
        break;
      case 'year':
        startDate = startOfYear(now).toISOString();
        endDate = endOfDay(now).toISOString();
        break;
      case 'all':
      default:
        startDate = undefined;
        endDate = undefined;
    }

    return {
      startDate,
      endDate,
      locationId: isOfficeUser ? userLocationId : undefined, // Office users see only their location
    };
  }, [dateRange, isOfficeUser, userLocationId]);

  const { data: analyticsData, isLoading } = useDoorKnockAnalytics(
    company?.id || '',
    filters
  );

  console.log('[Analytics Page] Company ID:', company?.id);
  console.log('[Analytics Page] Filters:', filters);
  console.log('[Analytics Page] Analytics data:', analyticsData);
  console.log('[Analytics Page] Is loading:', isLoading);

  const stats = analyticsData?.data || [];
  const totals = analyticsData?.totals;

  const dateRangeLabel = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
  }[dateRange];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Door Knocking Analytics</h1>
        <p className="text-muted-foreground">
          Track performance metrics and revenue from door-to-door canvassing
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="date-range">Date Range</Label>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger id="date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Total Door Knocks
              </CardDescription>
              <CardTitle className="text-3xl">{totals.total_pins}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Leads Created
              </CardDescription>
              <CardTitle className="text-3xl">{totals.leads_created}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {totals.total_pins > 0 ? ((totals.leads_created / totals.total_pins) * 100).toFixed(1) : 0}% knock-to-lead rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Signed Contracts
              </CardDescription>
              <CardTitle className="text-3xl">{totals.signed_contracts}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                From {totals.leads_created} leads created
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <DollarSign className="w-4 h-4" />
                Total Revenue
              </CardDescription>
              <CardTitle className="text-3xl text-green-700 dark:text-green-400">
                ${totals.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 dark:text-green-500">
                From door knocking leads
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rep Performance</CardTitle>
          <CardDescription>
            Detailed breakdown of door knocking performance by sales rep
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <AnalyticsTable data={stats} totals={totals || null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
