'use client';

import { useState, useMemo, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsTable } from '@/components/admin/door-knocking/analytics-table';
import { useDoorKnockAnalytics } from '@/lib/hooks/use-door-knock-analytics';
import { useCurrentCompany } from '@/lib/hooks/use-current-company';
import { useUsers } from '@/lib/hooks/use-users';
import { Loader2, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from 'date-fns';

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all';

function DoorKnockingAnalyticsContent() {
  const { data: company } = useCurrentCompany();
  const { data: usersData } = useUsers(company?.data?.id || '');
  const users = usersData?.data || [];

  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [selectedUser, setSelectedUser] = useState<string>('all');

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
      userId: selectedUser === 'all' ? undefined : selectedUser,
    };
  }, [dateRange, selectedUser]);

  const { data: analyticsData, isLoading } = useDoorKnockAnalytics(
    company?.data?.id || '',
    filters
  );

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="user-filter">Filter by Rep</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="user-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reps</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                Appointments Set
              </CardDescription>
              <CardTitle className="text-3xl">{totals.appointment_pins}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold text-green-600">
                {totals.appointment_rate.toFixed(1)}% conversion rate
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
            <AnalyticsTable data={stats} totals={totals ?? null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DoorKnockingAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <DoorKnockingAnalyticsContent />
    </Suspense>
  );
}
