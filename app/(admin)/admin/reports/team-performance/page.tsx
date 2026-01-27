"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTeamPerformanceData, type TeamPerformanceFilters } from "@/lib/api/team-performance-report";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";
import { Loader2, Download, Trophy, Medal, Award } from "lucide-react";
import { format } from "date-fns";

export default function TeamPerformancePage() {
  const { data: company } = useCurrentCompany();
  const [filters, setFilters] = useState<TeamPerformanceFilters>({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-performance-report", company?.id, filters],
    queryFn: () => getTeamPerformanceData(company!.id, filters),
    enabled: !!company?.id,
  });

  const handleExport = () => {
    if (!teamData) return;

    const csv = [
      [
        "Rank",
        "Name",
        "Role",
        "Location",
        "Total Leads",
        "Converted",
        "Conversion Rate",
        "Total Revenue",
        "Avg Deal Size",
        "Commissions",
        "Quotes Created",
        "Avg Response Time (hrs)",
      ],
      ...teamData.topPerformers.map((member, idx) => [
        idx + 1,
        member.userName,
        member.role,
        member.location,
        member.totalLeads,
        member.convertedLeads,
        `${member.conversionRate.toFixed(1)}%`,
        member.totalRevenue,
        member.averageDealSize,
        member.totalCommissions,
        member.quotesCreated,
        member.averageResponseTime.toFixed(1),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-performance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Performance Report</h1>
          <p className="text-muted-foreground mt-2">
            Analyze individual and team metrics to identify top performers
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((teamData?.totalTeamRevenue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teamData?.teamAverages.conversionRate || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(teamData?.teamAverages.averageResponseTime || 0).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Conv. Rate</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Avg Deal</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamData?.topPerformers.map((member, index) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="font-medium">#{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{member.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {member.totalLeads} 
                    <span className="text-muted-foreground text-sm ml-1">
                      ({member.convertedLeads} won)
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={
                      member.conversionRate >= (teamData?.teamAverages.conversionRate || 0)
                        ? "text-green-600 font-semibold"
                        : "text-muted-foreground"
                    }>
                      {member.conversionRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${(member.totalRevenue / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell>
                    ${(member.averageDealSize / 1000).toFixed(1)}k
                  </TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    ${member.totalCommissions.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={
                      member.averageResponseTime <= (teamData?.teamAverages.averageResponseTime || 999)
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }>
                      {member.averageResponseTime.toFixed(1)}h
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
