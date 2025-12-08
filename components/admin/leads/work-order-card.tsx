// Work Order Card Component
// Mirrors material-order-card.tsx for displaying work order summary and actions

'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/formatting'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Mail,
  Trash2,
  Download,
  XCircle,
  Send,
  Users,
  PlayCircle,
  DollarSign,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { WorkOrder, PAYMENT_METHODS } from '@/lib/types/work-orders'
import { EditWorkOrderDialog } from './edit-work-order-dialog'
import { generateWorkOrderPDF } from '@/lib/utils/pdf-generator'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'

interface WorkOrderCardProps {
  workOrder: WorkOrder
  onUpdate?: () => void
}

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    color: 'bg-blue-100 text-blue-700',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-700',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700',
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    color: 'bg-orange-100 text-orange-700',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
  },
}

export function WorkOrderCard({ workOrder, onUpdate }: WorkOrderCardProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const supabase = createClient()
  const { data: company } = useCurrentCompany()

  const status = statusConfig[workOrder.status]
  const StatusIcon = status.icon

  // Update status
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', workOrder.id)

      if (error) throw error

      toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig].label}`)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Mark as paid
  const handleMarkPaid = async (paymentData: {
    payment_date: string
    payment_amount: number
    payment_method: string
    payment_notes: string
  }) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          is_paid: true,
          payment_date: paymentData.payment_date,
          payment_amount: paymentData.payment_amount,
          payment_method: paymentData.payment_method,
          payment_notes: paymentData.payment_notes || null,
        })
        .eq('id', workOrder.id)

      if (error) throw error

      toast.success('Payment recorded successfully')
      setShowPaymentDialog(false)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to record payment')
    }
  }

  // Delete work order
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this work order? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', workOrder.id)

      if (error) throw error

      toast.success('Work order deleted')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to delete work order')
    } finally {
      setIsDeleting(false)
    }
  }

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!company) {
      toast.error('Company data not loaded')
      return
    }

    setIsGeneratingPDF(true)
    try {
      await generateWorkOrderPDF({
        workOrder,
        company: {
          name: company.name,
          logo_url: company.logo_url,
          address: company.address,
          city: company.city,
          state: company.state,
          zip: company.zip,
          contact_phone: company.contact_phone,
          contact_email: company.contact_email,
        },
      })
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Send email
  const handleSendEmail = async (recipientEmail: string, recipientName?: string) => {
    setIsSendingEmail(true)
    try {
      const response = await fetch('/api/work-orders/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          recipientEmail,
          recipientName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success('Work order sent successfully')
      setShowEmailDialog(false)
      onUpdate?.()
    } catch (error: any) {
      console.error('Email send error:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg truncate">{workOrder.title}</CardTitle>
                {workOrder.is_paid && (
                  <Badge variant="default" className="bg-green-500">
                    Paid
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="truncate">
                    {workOrder.subcontractor_name || 'Internal Work'}
                  </span>
                </div>
                {workOrder.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(workOrder.scheduled_date), 'MMM d, yyyy')}</span>
                    {workOrder.estimated_duration_hours && (
                      <span className="text-xs">
                        ({workOrder.estimated_duration_hours}h estimated)
                      </span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground truncate">
                  {workOrder.job_site_address}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(workOrder.total_amount)}</div>
                {workOrder.work_order_number && (
                  <div className="text-xs text-muted-foreground">
                    {workOrder.work_order_number}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Cost Breakdown */}
            {(workOrder.labor_cost > 0 || workOrder.materials_cost > 0) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {workOrder.labor_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor:</span>
                    <span>{formatCurrency(workOrder.labor_cost)}</span>
                  </div>
                )}
                {workOrder.materials_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials:</span>
                    <span>{formatCurrency(workOrder.materials_cost)}</span>
                  </div>
                )}
                {workOrder.equipment_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipment:</span>
                    <span>{formatCurrency(workOrder.equipment_cost)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Status Progression Buttons */}
              {workOrder.status === 'draft' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('sent')}
                  disabled={isUpdatingStatus}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Mark as Sent
                </Button>
              )}
              {workOrder.status === 'sent' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('accepted')}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Mark Accepted
                </Button>
              )}
              {workOrder.status === 'accepted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('scheduled')}
                  disabled={isUpdatingStatus}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Mark Scheduled
                </Button>
              )}
              {workOrder.status === 'scheduled' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdatingStatus}
                >
                  <PlayCircle className="h-3 w-3 mr-1" />
                  Start Work
                </Button>
              )}
              {workOrder.status === 'in_progress' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdatingStatus}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Mark Completed
                </Button>
              )}

              {/* Payment Button */}
              {!workOrder.is_paid && workOrder.status !== 'cancelled' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Mark as Paid
                </Button>
              )}

              {/* View Details */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetailDialog(true)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Details
              </Button>

              {/* Edit */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>

              {/* Download PDF */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                <Download className="h-3 w-3 mr-1" />
                {isGeneratingPDF ? 'Generating...' : 'PDF'}
              </Button>

              {/* Send Email */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEmailDialog(true)}
                disabled={isSendingEmail}
              >
                <Mail className="h-3 w-3 mr-1" />
                {isSendingEmail ? 'Sending...' : 'Email'}
              </Button>

              {/* Delete */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>

            {/* Timestamps */}
            <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
              <span>Created {formatDistanceToNow(new Date(workOrder.created_at))} ago</span>
              {workOrder.last_emailed_at && (
                <span>
                  Last emailed {formatDistanceToNow(new Date(workOrder.last_emailed_at))} ago
                  ({workOrder.email_count} times)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            workOrder={workOrder}
            onSubmit={handleMarkPaid}
            onCancel={() => setShowPaymentDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Order Details</DialogTitle>
          </DialogHeader>
          <WorkOrderDetails workOrder={workOrder} onClose={() => setShowDetailDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditWorkOrderDialog
        workOrder={workOrder}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onUpdate={onUpdate}
      />

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Work Order via Email</DialogTitle>
          </DialogHeader>
          <EmailWorkOrderForm
            workOrder={workOrder}
            onSend={handleSendEmail}
            onCancel={() => setShowEmailDialog(false)}
            isSending={isSendingEmail}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function WorkOrderDetails({ workOrder, onClose }: { workOrder: WorkOrder; onClose: () => void }) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Work Order #</Label>
          <p className="font-medium">{workOrder.work_order_number || 'N/A'}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Status</Label>
          <p className="font-medium">{statusConfig[workOrder.status].label}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Subcontractor</Label>
          <p className="font-medium">{workOrder.subcontractor_name}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Total Amount</Label>
          <p className="font-medium text-lg">{formatCurrency(workOrder.total_amount)}</p>
        </div>
      </div>

      {/* Description */}
      {workOrder.description && (
        <div>
          <Label className="text-muted-foreground">Description</Label>
          <p className="mt-1">{workOrder.description}</p>
        </div>
      )}

      {/* Scheduling */}
      <div className="grid grid-cols-2 gap-4">
        {workOrder.scheduled_date && (
          <div>
            <Label className="text-muted-foreground">Scheduled Date</Label>
            <p>{format(new Date(workOrder.scheduled_date), 'MMMM d, yyyy')}</p>
          </div>
        )}
        {workOrder.estimated_duration_hours && (
          <div>
            <Label className="text-muted-foreground">Estimated Duration</Label>
            <p>{workOrder.estimated_duration_hours} hours</p>
          </div>
        )}
      </div>

      {/* Job Site */}
      <div>
        <Label className="text-muted-foreground">Job Site</Label>
        <p>{workOrder.job_site_address}</p>
        {(workOrder.job_site_city || workOrder.job_site_state) && (
          <p className="text-sm text-muted-foreground">
            {workOrder.job_site_city}, {workOrder.job_site_state} {workOrder.job_site_zip}
          </p>
        )}
      </div>

      {/* Cost Breakdown */}
      <div>
        <Label className="text-muted-foreground mb-2">Cost Breakdown</Label>
        <div className="space-y-1">
          {workOrder.labor_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Labor</span>
              <span className="font-medium">{formatCurrency(workOrder.labor_cost)}</span>
            </div>
          )}
          {workOrder.materials_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Materials</span>
              <span className="font-medium">{formatCurrency(workOrder.materials_cost)}</span>
            </div>
          )}
          {workOrder.equipment_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Equipment</span>
              <span className="font-medium">{formatCurrency(workOrder.equipment_cost)}</span>
            </div>
          )}
          {workOrder.other_costs > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Other</span>
              <span className="font-medium">{formatCurrency(workOrder.other_costs)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-2">
            <span className="font-medium">Subtotal</span>
            <span className="font-medium">{formatCurrency(workOrder.subtotal)}</span>
          </div>
          {workOrder.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">Tax ({(workOrder.tax_rate * 100).toFixed(2)}%)</span>
              <span className="font-medium">{formatCurrency(workOrder.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1 text-lg">
            <span className="font-bold">Total</span>
            <span className="font-bold">{formatCurrency(workOrder.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      {workOrder.line_items && workOrder.line_items.length > 0 && (
        <div>
          <Label className="text-muted-foreground mb-2">Line Items</Label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Unit</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {workOrder.line_items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2 capitalize">{item.item_type}</td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{item.unit}</td>
                    <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Special Instructions */}
      {workOrder.special_instructions && (
        <div>
          <Label className="text-muted-foreground">Special Instructions</Label>
          <p className="mt-1 text-sm">{workOrder.special_instructions}</p>
        </div>
      )}

      {/* Internal Notes */}
      {workOrder.internal_notes && (
        <div>
          <Label className="text-muted-foreground">Internal Notes</Label>
          <p className="mt-1 text-sm text-muted-foreground">{workOrder.internal_notes}</p>
        </div>
      )}

      {/* Payment Info */}
      {workOrder.is_paid && (
        <div className="border-t pt-4">
          <Label className="text-muted-foreground mb-2">Payment Information</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Date Paid</span>
              <p>{workOrder.payment_date ? format(new Date(workOrder.payment_date), 'MMMM d, yyyy') : 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Amount</span>
              <p className="font-medium">{formatCurrency(workOrder.payment_amount || 0)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Method</span>
              <p className="capitalize">{workOrder.payment_method?.replace('_', ' ')}</p>
            </div>
            {workOrder.payment_notes && (
              <div>
                <span className="text-sm text-muted-foreground">Notes</span>
                <p>{workOrder.payment_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

function EmailWorkOrderForm({
  workOrder,
  onSend,
  onCancel,
  isSending,
}: {
  workOrder: WorkOrder
  onSend: (email: string, name?: string) => void
  onCancel: () => void
  isSending: boolean
}) {
  const [recipientEmail, setRecipientEmail] = useState(workOrder.subcontractor_email || '')
  const [recipientName, setRecipientName] = useState(workOrder.subcontractor_name || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientEmail) {
      toast.error('Recipient email is required')
      return
    }
    onSend(recipientEmail, recipientName)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recipient_name">Recipient Name</Label>
        <Input
          id="recipient_name"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Subcontractor name..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient_email">Recipient Email *</Label>
        <Input
          id="recipient_email"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="email@example.com"
          required
        />
      </div>

      <div className="bg-gray-50 p-3 rounded-md text-sm">
        <p className="font-medium">Work Order: {workOrder.work_order_number}</p>
        <p className="text-gray-600">{workOrder.title}</p>
        {workOrder.subcontractor_name && !workOrder.subcontractor_email && (
          <p className="text-amber-600 mt-2">
            ⚠️ No email on file for {workOrder.subcontractor_name}. Please enter one above.
          </p>
        )}
        {!workOrder.subcontractor_name && (
          <p className="text-blue-600 mt-2">
            📋 Internal work order - enter recipient email to send a copy.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSending}>
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </form>
  )
}

function PaymentForm({
  workOrder,
  onSubmit,
  onCancel,
}: {
  workOrder: WorkOrder
  onSubmit: (data: {
    payment_date: string
    payment_amount: number
    payment_method: string
    payment_notes: string
  }) => void
  onCancel: () => void
}) {
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [paymentAmount, setPaymentAmount] = useState(workOrder.total_amount.toString())
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      payment_date: paymentDate,
      payment_amount: parseFloat(paymentAmount),
      payment_method: paymentMethod,
      payment_notes: paymentNotes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="payment_date">Payment Date</Label>
        <Input
          id="payment_date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_amount">Amount Paid</Label>
        <Input
          id="payment_amount"
          type="number"
          step="0.01"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
          <SelectTrigger>
            <SelectValue placeholder="Select method..." />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_notes">Notes (Optional)</Label>
        <Input
          id="payment_notes"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          placeholder="Check #, transaction ID, etc."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Record Payment</Button>
      </div>
    </form>
  )
}
