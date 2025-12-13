'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useLeadFinancials } from '@/lib/hooks/use-financials'
import { formatCurrency } from '@/lib/utils/formatting'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

interface FinancialsTabProps {
  leadId: string
}

export function FinancialsTab({ leadId }: FinancialsTabProps) {
  const { data: financialsResponse, isLoading } = useLeadFinancials(leadId)
  const [view, setView] = useState<'overview' | 'revenue' | 'costs'>('overview')

  const financials = financialsResponse?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!financials) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Unable to load financial data</p>
      </div>
    )
  }

  const { summary, revenue, costs } = financials

  // Determine profitability status
  const getProfitabilityBadge = () => {
    if (!summary.has_quote) {
      return <Badge variant="outline">No Quote Yet</Badge>
    }
    
    const margin = summary.has_invoice ? summary.actual_margin : summary.estimated_margin
    
    if (margin >= 40) {
      return <Badge className="bg-green-600">Great! ({margin.toFixed(1)}%)</Badge>
    } else if (margin >= 25) {
      return <Badge className="bg-green-500">Good ({margin.toFixed(1)}%)</Badge>
    } else if (margin >= 0) {
      return <Badge className="bg-orange-500">Low ({margin.toFixed(1)}%)</Badge>
    } else {
      return <Badge className="bg-red-600">Loss ({margin.toFixed(1)}%)</Badge>
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ordered: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    scheduled: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Profitability Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quote + Change Orders (Revenue Source) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Estimate)</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.estimated_revenue)}
            </div>
            <div className="text-xs space-y-0.5 mt-2">
              <p className="text-gray-600">
                Quote: {formatCurrency(summary.quote_total)}
              </p>
              {summary.change_orders_total > 0 && (
                <p className="text-green-600">
                  + Change Orders: {formatCurrency(summary.change_orders_total)}
                </p>
              )}
            </div>
            {!summary.has_quote && (
              <Badge variant="outline" className="mt-2">No Quote Yet</Badge>
            )}
          </CardContent>
        </Card>

        {/* Estimated Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Profit</CardTitle>
            {summary.estimated_profit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.estimated_profit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {getProfitabilityBadge()}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Revenue - Costs
            </p>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_costs)}
            </div>
            <div className="text-xs space-y-0.5 mt-2">
              <p className="text-gray-600">
                Materials: {formatCurrency(summary.material_costs)}
              </p>
              <p className="text-gray-600">
                Labor: {formatCurrency(summary.labor_costs)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Collection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.payments_received)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Collected from customer
            </p>
            {summary.estimated_revenue > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (summary.payments_received / summary.estimated_revenue) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((summary.payments_received / summary.estimated_revenue) * 100).toFixed(1)}% of estimate
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estimate Workflow Info */}
      {summary.has_quote && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Estimate-Based Workflow</h4>
              <p className="text-sm text-blue-800">
                Financials are calculated from your <strong>estimate (quote + change orders)</strong>.
                Commissions are based on this total revenue. No separate invoice needed for calculations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actual vs Estimated Comparison (if has payments) */}
      {summary.has_payments && summary.payments_cleared > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actual vs Estimated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Estimated (Quote vs Costs)</h4>
                <div className="bg-blue-50 p-4 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">{formatCurrency(summary.estimated_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Costs:</span>
                    <span className="font-medium">{formatCurrency(summary.total_costs)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Profit:</span>
                    <span className={summary.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summary.estimated_profit)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    Margin: {summary.estimated_margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Actual (Collected vs Costs)</h4>
                <div className="bg-green-50 p-4 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collected:</span>
                    <span className="font-medium">{formatCurrency(summary.actual_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Costs Paid:</span>
                    <span className="font-medium">{formatCurrency(summary.total_costs_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Profit:</span>
                    <span className={summary.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summary.actual_profit)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    Margin: {summary.actual_margin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {Math.abs(summary.actual_revenue - summary.estimated_revenue) > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-yellow-800">Collection vs Quote: </span>
                    <span className="text-yellow-700">
                      {summary.actual_revenue > summary.estimated_revenue ? '+' : ''}
                      {formatCurrency(summary.actual_revenue - summary.estimated_revenue)}
                      {' '}
                      ({((summary.actual_revenue - summary.estimated_revenue) / summary.estimated_revenue * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Breakdown Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Details</TabsTrigger>
          <TabsTrigger value="costs">Cost Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!summary.has_quote && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No quote created yet</p>
                  <p className="text-sm">Create a quote to start tracking financials</p>
                </div>
              )}

              {summary.has_quote && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Quote Created</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(summary.quote_total)}</span>
                  </div>

                  {summary.change_orders_total > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Change Orders ({revenue.change_orders.length})</span>
                      </div>
                      <span className="font-semibold text-blue-600">+{formatCurrency(summary.change_orders_total)}</span>
                    </div>
                  )}

                  {summary.material_costs > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Material Orders ({costs.material_orders.length})</span>
                      </div>
                      <span className="font-semibold text-orange-600">-{formatCurrency(summary.material_costs)}</span>
                    </div>
                  )}

                  {summary.labor_costs > 0 && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Work Orders ({costs.work_orders.length})</span>
                      </div>
                      <span className="font-semibold text-purple-600">-{formatCurrency(summary.labor_costs)}</span>
                    </div>
                  )}

                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${summary.estimated_profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {summary.estimated_profit >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                      <span className="font-semibold text-lg">Net Profit</span>
                    </div>
                    <span className={`font-bold text-xl ${summary.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.estimated_profit)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Details Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {/* Quote */}
          {revenue.quote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      Created {format(new Date(revenue.quote.created_at), 'MMM d, yyyy')}
                    </p>
                    <Badge className="mt-1">{revenue.quote.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(revenue.quote.total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Orders */}
          {revenue.change_orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CO #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenue.change_orders.map((co) => (
                      <TableRow key={co.id}>
                        <TableCell className="font-medium">{co.change_order_number}</TableCell>
                        <TableCell>{format(new Date(co.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[co.status] || 'bg-gray-100 text-gray-800'}>
                            {co.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(co.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          {revenue.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenue.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.balance_due)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[inv.status] || 'bg-gray-100 text-gray-800'}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {revenue.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payments Received</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cleared</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenue.payments.map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell className="font-medium">{pay.payment_number}</TableCell>
                        <TableCell>{format(new Date(pay.payment_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {pay.cleared ? (
                            <Badge className="bg-green-100 text-green-800">Cleared</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(pay.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Costs Details Tab */}
        <TabsContent value="costs" className="space-y-4">
          {/* Material Orders */}
          {costs.material_orders.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Material Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs.material_orders.map((mo) => (
                      <TableRow key={mo.id}>
                        <TableCell className="font-medium">{mo.order_number}</TableCell>
                        <TableCell>{mo.supplier_name || '-'}</TableCell>
                        <TableCell>{format(new Date(mo.order_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[mo.status] || 'bg-gray-100 text-gray-800'}>
                            {mo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(mo.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Total Material Costs:
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {formatCurrency(costs.total_material_costs)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No material orders yet</p>
              </CardContent>
            </Card>
          )}

          {/* Work Orders */}
          {costs.work_orders.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Work Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs.work_orders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium">{wo.order_number}</TableCell>
                        <TableCell>{wo.description}</TableCell>
                        <TableCell>
                          {wo.scheduled_date ? format(new Date(wo.scheduled_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[wo.status] || 'bg-gray-100 text-gray-800'}>
                            {wo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-purple-600">
                          {formatCurrency(wo.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Total Labor Costs:
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {formatCurrency(costs.total_labor_costs)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No work orders yet</p>
              </CardContent>
            </Card>
          )}

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Material Costs:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(costs.total_material_costs)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Labor Costs:</span>
                  <span className="font-medium text-purple-600">{formatCurrency(costs.total_labor_costs)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t pt-2">
                  <span>Total Costs:</span>
                  <span>{formatCurrency(costs.total_costs)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
