'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useLeadFinancials } from '@/lib/hooks/use-financials'
import { formatCurrency } from '@/lib/utils/formatting'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  Download,
  PenTool,
  Mail,
} from 'lucide-react'
import { useGenerateChangeOrderPDF } from '@/lib/hooks/use-generate-change-order-pdf'
import { ChangeOrderSignatureDialog } from '@/components/admin/change-orders/change-order-signature-dialog'
import { useAuth } from '@/lib/hooks/use-auth'

interface FinancialsTabProps {
  leadId: string
}

export function FinancialsTab({ leadId }: FinancialsTabProps) {
  const queryClient = useQueryClient()
  const { data: financialsResponse, isLoading } = useLeadFinancials(leadId)
  const { generateAndDownload, isGenerating } = useGenerateChangeOrderPDF()
  const { user } = useAuth()
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<any>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)

  const handleSendToCustomer = async (changeOrderId: string) => {
    try {
      setSendingEmail(changeOrderId)
      const response = await fetch(`/api/change-orders/${changeOrderId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      // Show success toast
      const { toast } = await import('sonner')
      toast.success('Change order sent to customer successfully!')
      
      // Refetch financials to update status
      window.location.reload()
    } catch (error: any) {
      const { toast } = await import('sonner')
      toast.error(error.message || 'Failed to send email')
    } finally {
      setSendingEmail(null)
    }
  }

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
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.estimated_revenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contract + Change Orders
            </p>
          </CardContent>
        </Card>

        {/* Total Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.total_costs)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Materials + Labor
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
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
            <div className="text-xs mt-1">
              {getProfitabilityBadge()}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.payments_received)}
            </div>
            {summary.estimated_revenue > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {((summary.payments_received / summary.estimated_revenue) * 100).toFixed(1)}% of total
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Original Contract */}
            {revenue.quote && (
              <div className="flex justify-between items-start pb-3 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Original Contract</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(revenue.quote.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{formatCurrency(summary.quote_total)}</p>
                  <Badge className={statusColors[revenue.quote.status] || 'bg-gray-100 text-gray-800'}>
                    {revenue.quote.status}
                  </Badge>
                </div>
              </div>
            )}

            {/* Change Orders */}
            {revenue.change_orders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Change Orders</p>
                {revenue.change_orders.map((co) => (
                  <div key={co.id} className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{co.change_order_number}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(co.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCurrency(co.amount)}</p>
                      <Badge className={statusColors[co.status] || 'bg-gray-100 text-gray-800'}>
                        {co.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Invoice Items (Future) */}
            {revenue.invoices.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-sm font-medium text-gray-700">Invoice Adjustments</p>
                {revenue.invoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center pl-4 py-2 bg-blue-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(inv.invoice_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(inv.total)}</p>
                      <Badge className={statusColors[inv.status] || 'bg-gray-100 text-gray-800'}>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Revenue */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total Revenue</span>
              <span className="font-bold text-xl text-blue-600">{formatCurrency(summary.estimated_revenue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Material Orders */}
            {costs.material_orders.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Material Orders</p>
                {costs.material_orders.map((mo) => (
                  <div key={mo.id} className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{mo.order_number}</p>
                      <p className="text-xs text-gray-500">{mo.supplier_name || 'Unknown Supplier'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">{formatCurrency(mo.total)}</p>
                      <Badge className={statusColors[mo.status] || 'bg-gray-100 text-gray-800'}>
                        {mo.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t text-sm">
                  <span className="font-medium">Materials Subtotal</span>
                  <span className="font-semibold">{formatCurrency(summary.material_costs)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No material orders yet
              </div>
            )}

            {/* Labor / Work Orders */}
            {costs.work_orders.length > 0 ? (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-sm font-medium text-gray-700">Work Orders</p>
                {costs.work_orders.map((wo) => (
                  <div key={wo.id} className="flex justify-between items-center pl-4 py-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{wo.order_number}</p>
                      <p className="text-xs text-gray-500">{wo.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">{formatCurrency(wo.total)}</p>
                      <Badge className={statusColors[wo.status] || 'bg-gray-100 text-gray-800'}>
                        {wo.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t text-sm">
                  <span className="font-medium">Labor Subtotal</span>
                  <span className="font-semibold">{formatCurrency(summary.labor_costs)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm border-t">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No work orders yet
              </div>
            )}

            {/* Total Costs */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total Costs</span>
              <span className="font-bold text-xl text-orange-600">{formatCurrency(summary.total_costs)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary - The Bottom Line */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300">
        <CardHeader>
          <CardTitle className="text-xl">Profitability Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gross Profit */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="font-medium">{formatCurrency(summary.estimated_revenue)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Total Costs</span>
                <span className="font-medium text-orange-600">-{formatCurrency(summary.total_costs)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-gray-400">
                <span className="font-bold text-gray-900">Gross Profit</span>
                <span className={`font-bold text-lg ${summary.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.estimated_profit)}
                </span>
              </div>
            </div>

            {/* Gross Margin */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Gross Margin</p>
              <div className="text-center">
                <div className={`text-4xl font-bold ${summary.estimated_margin >= 25 ? 'text-green-600' : summary.estimated_margin >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {summary.estimated_margin.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.estimated_margin >= 40 && 'Excellent profitability! 🎉'}
                  {summary.estimated_margin >= 25 && summary.estimated_margin < 40 && 'Healthy profit margin'}
                  {summary.estimated_margin >= 0 && summary.estimated_margin < 25 && 'Low margin - watch costs'}
                  {summary.estimated_margin < 0 && 'Loss - immediate attention needed'}
                </p>
              </div>
            </div>

            {/* Overhead & Bottom Line (Future) */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Gross Profit</span>
                <span className="font-medium text-green-600">{formatCurrency(summary.estimated_profit)}</span>
              </div>
              <div className="flex justify-between items-baseline text-gray-400">
                <span className="text-sm">Overhead</span>
                <span className="font-medium">-{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-gray-400">
                <span className="font-bold text-gray-900">Net Profit</span>
                <span className={`font-bold text-lg ${summary.estimated_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.estimated_profit)}
                </span>
              </div>
              <p className="text-xs text-gray-400 italic mt-2">
                (Overhead allocation coming soon)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Orders Management Section */}
      {revenue.change_orders.filter(co => co.status !== 'approved').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Change Orders Awaiting Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Change Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenue.change_orders
                  .filter(co => co.status !== 'approved')
                  .map((co) => (
                    <TableRow key={co.id}>
                      <TableCell className="font-medium">{co.change_order_number}</TableCell>
                      <TableCell>{format(new Date(co.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        +{formatCurrency(co.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[co.status] || 'bg-gray-100 text-gray-800'}>
                          {co.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {co.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendToCustomer(co.id)}
                              disabled={sendingEmail === co.id}
                              className="h-8 px-2"
                            >
                              {sendingEmail === co.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4 mr-1" />
                              )}
                              Send to Customer
                            </Button>
                          )}
                          {co.status === 'pending_company_signature' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedChangeOrder(co)
                                setSignatureDialogOpen(true)
                              }}
                              className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <PenTool className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateAndDownload(co as any)}
                            disabled={isGenerating}
                            className="h-8 w-8 p-0"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="sr-only">Download PDF</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Change Order Signature Dialog */}
      {selectedChangeOrder && (
        <ChangeOrderSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          changeOrderId={selectedChangeOrder.id}
          changeOrderNumber={selectedChangeOrder.change_order_number}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
            queryClient.invalidateQueries({ queryKey: ['contract'] })
            setSignatureDialogOpen(false)
            setSelectedChangeOrder(null)
          }}
        />
      )}
    </div>
  )
}
