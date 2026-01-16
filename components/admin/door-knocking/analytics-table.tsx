'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import type { DoorKnockUserStats } from '@/lib/api/door-knock-analytics';
import { formatCurrency } from '@/lib/utils/formatting';

interface AnalyticsTableProps {
  data: DoorKnockUserStats[];
  totals: {
    total_pins: number;
    appointment_pins: number;
    appointment_rate: number;
    leads_created: number;
    signed_contracts: number;
    total_revenue: number;
  } | null;
}

export function AnalyticsTable({ data, totals }: AnalyticsTableProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.total_revenue - a.total_revenue);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No door knocking activity found for the selected period.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rep Name</TableHead>
            <TableHead className="text-right">Total Knocks</TableHead>
            <TableHead className="text-right">Appointments</TableHead>
            <TableHead className="text-right">Appointment %</TableHead>
            <TableHead className="text-right">Leads Created</TableHead>
            <TableHead className="text-right">Signed Contracts</TableHead>
            <TableHead className="text-right">Total Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((stats) => (
            <TableRow key={stats.user_id}>
              <TableCell className="font-medium">{stats.user_name}</TableCell>
              <TableCell className="text-right">{stats.total_pins}</TableCell>
              <TableCell className="text-right">{stats.appointment_pins}</TableCell>
              <TableCell className="text-right">
                <span className={
                  stats.appointment_rate >= 20 ? 'text-green-600 font-semibold' :
                  stats.appointment_rate >= 10 ? 'text-yellow-600' :
                  'text-muted-foreground'
                }>
                  {stats.appointment_rate.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right">{stats.leads_created}</TableCell>
              <TableCell className="text-right">
                <span className={stats.signed_contracts > 0 ? 'text-green-600 font-semibold' : ''}>
                  {stats.signed_contracts}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(stats.total_revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {totals && (
          <TableFooter>
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold">TOTALS</TableCell>
              <TableCell className="text-right font-bold">{totals.total_pins}</TableCell>
              <TableCell className="text-right font-bold">{totals.appointment_pins}</TableCell>
              <TableCell className="text-right font-bold">
                {totals.appointment_rate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right font-bold">{totals.leads_created}</TableCell>
              <TableCell className="text-right font-bold">{totals.signed_contracts}</TableCell>
              <TableCell className="text-right font-bold text-green-600">
                {formatCurrency(totals.total_revenue)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
