'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MaterialOrder } from '@/lib/types/material-orders'
import { deleteMaterialOrder } from '@/lib/api/material-orders'
import { useUploadDocument, useDocuments } from '@/lib/hooks/use-documents'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCreateEventFromMaterialOrder, useUpdateMaterialOrderDate, useUpdateWorkOrderDate } from '@/lib/hooks/use-calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/formatting'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Upload,
  XCircle,
  Trash2,
  Download,
  Mail,
} from 'lucide-react'
import { MaterialOrderDetailDialog } from './material-order-detail-dialog'
import { SendEmailDialog } from './send-email-dialog'
import { toast } from 'sonner'
import { generatePurchaseOrderPDF } from '@/lib/utils/pdf-generator'
import { getDocumentSignedUrl } from '@/lib/api/documents'

interface MaterialOrderCardProps {
  order: MaterialOrder
  onUpdate?: () => void
}

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: Clock,
    color: 'bg-gray-100 text-gray-700',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Package,
    color: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-700',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    color: 'bg-purple-100 text-purple-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100 text-red-700',
  },
}

// Helper function to parse date strings without timezone issues
// Parses "YYYY-MM-DD" as local date, not UTC
function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function MaterialOrderCard({ order, onUpdate }: MaterialOrderCardProps) {
  const queryClient = useQueryClient()
  const { data: company } = useCurrentCompany()
  const createCalendarEvent = useCreateEventFromMaterialOrder()
  const updateMaterialOrderDate = useUpdateMaterialOrderDate()
  const updateWorkOrderDate = useUpdateWorkOrderDate()
  const [showDetails, setShowDetails] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDocument = useUploadDocument()
  
  // Get documents for this lead to check for invoice
  const { data: documentsResponse } = useDocuments(order.lead_id, {
    document_type: 'receipt'
  })
  // Find invoice for this specific material order by checking description
  const invoiceDocument = documentsResponse?.data?.find(
    doc => doc.description?.includes(order.order_number)
  )
  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  // Debug: Log tax data
  console.log('MaterialOrderCard tax data:', {
    order_number: order.order_number,
    tax_rate: order.tax_rate,
    tax_amount: order.tax_amount,
    total_with_tax: order.total_with_tax,
    total_estimated: order.total_estimated
  })

  const variance = order.total_actual > 0 
    ? order.total_actual - order.total_estimated 
    : null

  const variancePercent = variance && order.total_estimated > 0
    ? ((variance / order.total_estimated) * 100).toFixed(1)
    : null

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete order ${order.order_number}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteMaterialOrder(order.id)
      
      if (result.error) {
        toast.error('Failed to delete order')
        return
      }

      // Invalidate calendar queries to remove associated events
      queryClient.invalidateQueries({ queryKey: ['calendar-events', company?.id] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events-lead', order.lead_id] })

      toast.success('Order and associated calendar events deleted')
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to delete order')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadInvoice = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !company) return

    try {
      await uploadDocument.mutateAsync({
        leadId: order.lead_id,
        file,
        documentData: {
          company_id: company.id,
          lead_id: order.lead_id,
          document_type: 'receipt',
          title: `Invoice - ${order.order_number}`,
          description: `Invoice for material order ${order.order_number}`,
        },
      })
      toast.success('Invoice uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload invoice')
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleViewInvoice = async () => {
    if (!invoiceDocument) return

    try {
      const result = await getDocumentSignedUrl(invoiceDocument.file_url)
      if (result.error || !result.data) {
        toast.error('Failed to load invoice')
        return
      }
      window.open(result.data, '_blank')
    } catch (error) {
      toast.error('Failed to load invoice')
    }
  }

  const handleDownloadPDF = async () => {
    if (!company) {
      toast.error('Company information not loaded')
      return
    }

    setIsGeneratingPDF(true)
    try {
      // Extract location from order's lead relationship (if available)
      const location = (order as any)?.lead?.locations || null
      
      await generatePurchaseOrderPDF({
        order,
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
        location: location,
      })
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendEmail = async (emailData: {
    recipientEmails: string[]
    recipientName: string
    includeMaterialList: boolean
    materialOrderIds?: string[]
    deliveryDate?: string
    scheduledDate?: string
  }) => {
    if (!company) {
      toast.error('Company information not loaded')
      return
    }

    setIsSendingEmail(true)
    try {
      // Step 1: Update order with delivery/scheduled date if provided
      const isWorkOrder = order.order_type === 'work'
      const dateToSave = isWorkOrder ? emailData.scheduledDate : emailData.deliveryDate
      
      if (dateToSave) {
        const supabase = (await import('@/lib/supabase/client')).createClient()
        // Both material and work orders use expected_delivery_date
        const updateField = 'expected_delivery_date'
        
        // Auto-update status from 'draft' to 'scheduled' when date is set
        const updates: any = { [updateField]: dateToSave }
        if (order.status === 'draft') {
          updates.status = 'scheduled'
        }
        
        const { error: updateError } = await supabase
          .from('material_orders')
          .update(updates)
          .eq('id', order.id)
        
        if (updateError) {
          console.error('Failed to update order date:', updateError)
          toast.error('Failed to save date')
          return
        }
      }

      // Step 2: Send email
      const response = await fetch('/api/material-orders/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          recipientEmails: emailData.recipientEmails,
          recipientName: emailData.recipientName,
          includeMaterialList: emailData.includeMaterialList,
          materialOrderIds: emailData.materialOrderIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success(`Email sent to ${emailData.recipientEmails.length} recipient(s)`)
      
      // Step 3: Create calendar event if date was provided
      if (dateToSave && order.lead_id) {
        try {
          console.log('📅 Creating calendar event for:', { 
            orderId: order.id, 
            orderType: isWorkOrder ? 'work' : 'material',
            date: dateToSave,
            leadId: order.lead_id 
          })
          
          const { data: user } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
          
          // Get lead name from the loaded relationship
          const leadName = order.lead?.full_name || 'Unknown Lead'
          
          // Use React Query mutation hook for automatic cache invalidation
          const result = await createCalendarEvent.mutateAsync({
            materialOrderId: order.id,
            deliveryDate: dateToSave,
            leadId: order.lead_id,
            leadName,
            orderNumber: order.order_number,
            createdBy: user.user?.id || '',
            assignedUsers: [],
            isWorkOrder  // Pass flag to create PRODUCTION_LABOR event for work orders
          } as any) // Type assertion because we added isWorkOrder parameter
          
          console.log('✅ Calendar event created successfully:', result)
          // Success toast is handled by the mutation hook
        } catch (calendarError) {
          console.error('❌ Calendar event creation error:', calendarError)
          // Error toast is handled by the mutation hook
        }
      } else {
        console.log('⏭️ Skipping calendar event creation:', { 
          hasDate: !!dateToSave, 
          hasLeadId: !!order.lead_id 
        })
      }
      
      onUpdate?.()
    } catch (error: any) {
      console.error('Email send error:', error)
      toast.error(`Failed to send email: ${error.message}`)
      throw error
    } finally {
      setIsSendingEmail(false)
    }
  }
  // Handle date change - syncs to calendar
  const handleDateChange = async (newDate: string | null) => {
    if (!company) return

    const isWorkOrder = order.order_type === 'work'
    
    try {
      if (isWorkOrder) {
        await updateWorkOrderDate.mutateAsync({
          laborOrderId: order.id,
          scheduledDate: newDate
        })
      } else {
        await updateMaterialOrderDate.mutateAsync({
          materialOrderId: order.id,
          deliveryDate: newDate
        })
      }
      
      setIsEditingDate(false)
      onUpdate?.()
    } catch (error) {
      console.error('Date update error:', error)
      // Error toast handled by mutation hook
    }
  }
  const handleStatusChange = async (newStatus: string) => {
    // Add confirmation for cancel action
    if (newStatus === 'cancelled') {
      if (!confirm(`Are you sure you want to cancel order ${order.order_number}? This cannot be undone.`)) {
        return
      }
    }

    setIsUpdatingStatus(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('material_orders')
        .update({ status: newStatus })
        .eq('id', order.id)

      if (error) throw error

      // Success messages based on status
      const statusMessages: Record<string, string> = {
        completed: 'Order marked as completed',
        cancelled: 'Order cancelled',
        paid: 'Order marked as paid'
      }

      toast.success(statusMessages[newStatus] || `Order status updated to ${newStatus}`)
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleMarkPaid = async (paymentData: any) => {
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('material_orders')
        .update({
          is_paid: true,
          payment_date: paymentData.payment_date,
          payment_amount: paymentData.payment_amount,
          payment_method: paymentData.payment_method,
          payment_notes: paymentData.payment_notes || null,
        })
        .eq('id', order.id)

      if (error) throw error

      toast.success('Payment recorded successfully')
      setShowPaymentDialog(false)
      onUpdate?.()
    } catch (error: any) {
      toast.error('Failed to record payment')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {order.order_number}
              {order.template_name && (
                <Badge variant="outline" className="font-normal">
                  {order.template_name}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {order.supplier?.name && (
                <>
                  <span>{order.supplier.name}</span>
                  <span>•</span>
                </>
              )}
              <span>
                Created {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {order.is_pickup && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Pickup
              </Badge>
            )}
            {order.is_paid && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Paid
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {order.order_date && (
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <p className="font-medium">{format(parseLocalDate(order.order_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
            {/* Editable Delivery/Scheduled Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">
                  {order.order_type === 'work' ? 'Scheduled Date:' : 'Expected Delivery:'}
                </span>
                {(order.expected_delivery_date || order.scheduled_date) && !isEditingDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDate(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {isEditingDate ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    defaultValue={order.order_type === 'work' ? order.scheduled_date || '' : order.expected_delivery_date || ''}
                    onChange={(e) => handleDateChange(e.target.value || null)}
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDate(false)}
                    className="h-8 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  {order.expected_delivery_date ? (
                    <p className="font-medium">
                      {format(
                        parseLocalDate(order.expected_delivery_date)!,
                        'MMM dd, yyyy'
                      )}
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingDate(true)}
                      className="h-8 text-xs"
                    >
                      Set Date
                    </Button>
                  )}
                </>
              )}
            </div>
            {order.actual_delivery_date && (
              <div>
                <span className="text-muted-foreground">Delivered:</span>
                <p className="font-medium text-green-600">
                  {format(parseLocalDate(order.actual_delivery_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.total_estimated)}</span>
              </div>
              {order.order_type !== 'work' && order.tax_rate > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Tax ({(order.tax_rate * 100).toFixed(2)}%):
                    </span>
                    <span className="font-medium">{formatCurrency(order.tax_amount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">Total with Tax:</span>
                    <span className="font-semibold text-lg">{formatCurrency(order.total_with_tax || order.total_estimated)}</span>
                  </div>
                </>
              )}
              {(order.order_type === 'work' || order.tax_rate === 0) && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold text-lg">{formatCurrency(order.total_estimated)}</span>
                </div>
              )}
            </div>

            {/* Variance */}
            {variance !== null && variancePercent !== null && (
              <div className="mt-3 p-2 rounded-lg bg-muted">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Variance:</span>
                  <span
                    className={`font-medium ${
                      variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''
                    }`}
                  >
                    {variance > 0 ? '+' : ''}
                    {formatCurrency(variance)} ({variance > 0 ? '+' : ''}
                    {variancePercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Items Summary */}
          {order.items && order.items.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1">
                      {item.description}
                    </span>
                    <span className="font-mono ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {order.items.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
            {/* New Simplified Status Workflow */}
            
            {/* Mark Completed - only show when scheduled */}
            {order.status === 'scheduled' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleStatusChange('completed')}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Completed
              </Button>
            )}
            
            {/* Mark as Paid - only show when completed */}
            {order.status === 'completed' && !order.is_paid && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPaymentDialog(true)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
            )}
            
            {/* Cancel Order - show for any non-cancelled, non-paid status */}
            {order.status !== 'cancelled' && order.status !== 'paid' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleStatusChange('cancelled')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Order
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
                <FileText className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowEmailDialog(true)}
                disabled={isSendingEmail}
              >
                <Mail className="h-4 w-4 mr-1" />
                {isSendingEmail ? 'Sending...' : 'Email PO'}
              </Button>
              
              {/* 3-dot menu for additional actions */}
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer"
                onChange={(e) => {
                  const action = e.target.value
                  e.target.value = ''
                  
                  if (action === 'download') handleDownloadPDF()
                  else if (action === 'upload') handleUploadInvoice()
                  else if (action === 'view-invoice') handleViewInvoice()
                  else if (action === 'delete') handleDelete()
                }}
                disabled={isGeneratingPDF || uploadDocument.isPending || isDeleting}
              >
                <option value="">More</option>
                <option value="download">Download PDF</option>
                {order.status !== 'cancelled' && <option value="upload">Upload Invoice</option>}
                {invoiceDocument && <option value="view-invoice">View Invoice</option>}
                <option value="delete" className="text-red-600">Delete Order</option>
              </select>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </CardContent>

      <MaterialOrderDetailDialog
        order={order}
        open={showDetails}
        onOpenChange={setShowDetails}
        onUpdate={onUpdate}
      />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleMarkPaid({
              payment_date: formData.get('payment_date'),
              payment_amount: parseFloat(formData.get('payment_amount') as string),
              payment_method: formData.get('payment_method'),
              payment_notes: formData.get('payment_notes'),
            })
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                name="payment_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_amount">Amount</Label>
              <Input
                id="payment_amount"
                name="payment_amount"
                type="number"
                step="0.01"
                required
                defaultValue={order.total_with_tax || order.total_estimated}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" required defaultValue="cash">
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="company_account">Company Account</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_notes">Notes (Optional)</Label>
              <Input
                id="payment_notes"
                name="payment_notes"
                placeholder="Check number, transaction ID, etc."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        order={order}
        orderType={order.order_type || 'material'}
        leadId={order.lead_id}
        onSend={handleSendEmail}
      />
    </Card>
  )
}
