"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getWorkInProgressData, type WIPFilters } from "@/lib/api/wip-report";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";

export default function WorkInProgressPage() {
  const { data: company } = useCurrentCompany();
  const [filters, setFilters] = useState<WIPFilters>({});

  const { data: wipData, isLoading } = useQuery({
    queryKey: ["work-in-progress-report", company?.id, filters],
    queryFn: () => getWorkInProgressData(company!.id, filters),
    enabled: !!company?.id,
  });

  const handleExport = () => {
    if (!wipData) return;

    const csv = [
      ["Customer", "Address", "Stage", "Days in Production", "Total Value", "Material Costs", "Completion %"],
      ...wipData.projects.map((project) => [
        project.customer_name,
        project.address,
        project.sub_status,
        project.days_in_production,
        project.total_value,
        project.material_costs,
        project.completion_percentage,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-in-progress-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work in Progress Report</h1>
          <p className="text-muted-foreground mt-2">
            Track active projects, timelines, and completion status
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subStatus">Production Stage</Label>
              <Select
                value={filters.subStatus || "all"}
                onValueChange={(value) => 
                  setFilters({ ...filters, subStatus: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger id="subStatus">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="materials_ordered">Materials Ordered</SelectItem>
                  <SelectItem value="materials_received">Materials Received</SelectItem>
                  <SelectItem value="crew_assigned">Crew Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="final_inspection">Final Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wipData?.totalProjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days in Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wipData?.averageDaysInProduction || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((wipData?.totalValue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((wipData?.totalMaterialCosts || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={wipData?.projectsByStage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Project Count" />
              <Bar yAxisId="right" dataKey="avgDays" fill="#82ca9d" name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wipData?.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.customer_name}</TableCell>
                  <TableCell className="text-sm">{project.address}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                      {project.sub_status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>{project.days_in_production}</TableCell>
                  <TableCell>${project.total_value.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={project.completion_percentage} className="w-20" />
                      <span className="text-sm text-muted-foreground">
                        {project.completion_percentage}%
                      </span>
                    </div>
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
