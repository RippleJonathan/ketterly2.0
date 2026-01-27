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
            <TableHead className="text-right">Leads Created</TableHead>
            <TableHead className="text-right">Knock-to-Lead %</TableHead>
            <TableHead className="text-right">Signed Contracts</TableHead>
            <TableHead className="text-right">Close Rate %</TableHead>
            <TableHead className="text-right">Total Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((stats) => {
            const knockToLeadRate = stats.total_pins > 0 ? (stats.leads_created / stats.total_pins) * 100 : 0;
            const closeRate = stats.leads_created > 0 ? (stats.signed_contracts / stats.leads_created) * 100 : 0;
            
            return (
              <TableRow key={stats.user_id}>
                <TableCell className="font-medium">{stats.user_name}</TableCell>
                <TableCell className="text-right">{stats.total_pins}</TableCell>
                <TableCell className="text-right">{stats.leads_created}</TableCell>
                <TableCell className="text-right">
                  <span className={
                    knockToLeadRate >= 30 ? 'text-green-600 font-semibold' :
                    knockToLeadRate >= 15 ? 'text-yellow-600' :
                    'text-muted-foreground'
                  }>
                    {knockToLeadRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={stats.signed_contracts > 0 ? 'text-green-600 font-semibold' : ''}>
                    {stats.signed_contracts}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={
                    closeRate >= 50 ? 'text-green-600 font-semibold' :
                    closeRate >= 25 ? 'text-yellow-600' :
                    closeRate > 0 ? 'text-muted-foreground' :
                    'text-gray-400'
                  }>
                    {closeRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(stats.total_revenue)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {totals && (
          <TableFooter>
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold">TOTALS</TableCell>
              <TableCell className="text-right font-bold">{totals.total_pins}</TableCell>
              <TableCell className="text-right font-bold">{totals.leads_created}</TableCell>
              <TableCell className="text-right font-bold">
                {totals.total_pins > 0 ? ((totals.leads_created / totals.total_pins) * 100).toFixed(1) : 0}%
              </TableCell>
              <TableCell className="text-right font-bold">{totals.signed_contracts}</TableCell>
              <TableCell className="text-right font-bold">
                {totals.leads_created > 0 ? ((totals.signed_contracts / totals.leads_created) * 100).toFixed(1) : 0}%
              </TableCell>
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
