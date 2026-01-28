"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getRevenueCollectionsData, type RevenueCollectionsFilters } from "@/lib/api/revenue-report";
import { useCurrentCompany } from "@/lib/hooks/use-current-company";
import { useLocations } from "@/lib/hooks/use-locations";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";

export default function RevenueCollectionsPage() {
  const { data: company } = useCurrentCompany();
  const { data: locationsData } = useLocations();
  const [filters, setFilters] = useState<RevenueCollectionsFilters>({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 6)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["revenue-collections-report", company?.id, filters],
    queryFn: () => getRevenueCollectionsData(company!.id, filters),
    enabled: !!company?.id,
  });

  const locations = locationsData?.data || [];

  const handleExport = () => {
    if (!revenueData) return;

    const csv = [
      ["Lead Name", "Total", "Due Date", "Days Overdue", "Status"],
      ...revenueData.outstandingInvoices.map((inv) => [
        inv.lead_name,
        inv.total,
        inv.due_date,
        inv.days_overdue,
        inv.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-collections-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const agingChartData = [
    { name: "Current", value: revenueData?.agingReport.current || 0 },
    { name: "1-30 Days", value: revenueData?.agingReport.days_30 || 0 },
    { name: "31-60 Days", value: revenueData?.agingReport.days_60 || 0 },
    { name: "61-90 Days", value: revenueData?.agingReport.days_90 || 0 },
    { name: "90+ Days", value: revenueData?.agingReport.days_90_plus || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue & Collections Report</h1>
          <p className="text-muted-foreground mt-2">
            Track revenue trends, outstanding invoices, and payment aging
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
            <div>
              <Label htmlFor="location">Location</Label>
              <Select
                value={filters.locationId || "all"}
                onValueChange={(value) => 
                  setFilters({ ...filters, locationId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((revenueData?.totalRevenue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${((revenueData?.paidRevenue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${((revenueData?.pendingRevenue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${((revenueData?.overdueRevenue || 0) / 1000).toFixed(1)}k
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Total Revenue" />
              <Line type="monotone" dataKey="paid" stroke="#82ca9d" name="Paid" />
              <Line type="monotone" dataKey="pending" stroke="#ffc658" name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Invoices (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueData?.outstandingInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.lead_name}</TableCell>
                  <TableCell>${invoice.total.toLocaleString()}</TableCell>
                  <TableCell>
                    {invoice.due_date ? format(new Date(invoice.due_date), "MMM dd, yyyy") : "No due date"}
                  </TableCell>
                  <TableCell className={invoice.days_overdue > 0 ? "text-red-600 font-semibold" : ""}>
                    {invoice.days_overdue > 0 ? invoice.days_overdue : "Current"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      invoice.status === "overdue" ? "bg-red-100 text-red-800" :
                      invoice.status === "partial" ? "bg-yellow-100 text-yellow-800" :
                      invoice.status === "sent" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {invoice.status}
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
