"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  ClipboardCheck,
  Percent,
} from "lucide-react";

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const reports: ReportCard[] = [
  {
    title: "Door Knocking Report",
    description: "Track door knocking performance, knock rates, and lead generation metrics by location and user.",
    icon: ClipboardCheck,
    href: "/admin/door-knocking/analytics",
    color: "text-blue-600",
  },
  {
    title: "Sales Pipeline",
    description: "Monitor leads through each stage of your sales funnel with conversion rates and stage metrics.",
    icon: BarChart3,
    href: "/admin/reports/sales-pipeline",
    color: "text-green-600",
  },
  {
    title: "Revenue & Collections",
    description: "View revenue trends, outstanding invoices, aging reports, and payment collection metrics.",
    icon: DollarSign,
    href: "/admin/reports/revenue-collections",
    color: "text-emerald-600",
  },
  {
    title: "Work in Progress",
    description: "Track active projects, production timelines, material costs, and completion percentages.",
    icon: TrendingUp,
    href: "/admin/reports/work-in-progress",
    color: "text-orange-600",
  },
  {
    title: "Team Performance",
    description: "Analyze individual and team metrics including conversion rates, revenue, and response times.",
    icon: Users,
    href: "/admin/reports/team-performance",
    color: "text-purple-600",
  },
  {
    title: "Commission Reports",
    description: "View detailed commission breakdowns, earnings by rep, and commission plan performance.",
    icon: Percent,
    href: "/admin/commissions",
    color: "text-indigo-600",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Access comprehensive reports to analyze your business performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gray-100 ${report.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{report.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={report.href}>
                  <Button className="w-full">
                    View Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
