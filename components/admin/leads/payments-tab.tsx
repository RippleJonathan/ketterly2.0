'use client'

import { useState, useEffect } from 'react'
import { useInvoices, usePayments, useUpdatePayment, useDeleteInvoice, useDeletePayment } from '@/lib/hooks/use-invoices'
import { useIsAdminOrOffice } from '@/lib/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/formatting'
import { format } from 'date-fns'
import { Plus, FileText, DollarSign, Download, Mail, Trash2, MoreVertical, Edit } from 'lucide-react'
import { InvoiceStatus, PaymentMethod } from '@/lib/types/invoices'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateInvoiceDialog } from './create-invoice-dialog'
import { InvoiceBuilder } from '@/components/admin/invoices/invoice-builder'
import { EditInvoiceDialog } from '@/components/admin/invoices/edit-invoice-dialog'
import { RecordPaymentDialog } from './record-payment-dialog'
import { SendInvoiceEmailDialog } from './send-invoice-email-dialog'
import { EditPaymentDialog } from './edit-payment-dialog'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PaymentsTabProps {
  leadId: string
}

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
  void: 'bg-gray-100 text-gray-700',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  ach: 'ACH',
  wire_transfer: 'Wire Transfer',
  financing: 'Financing',
  other: 'Other',
}

export function PaymentsTab({ leadId }: PaymentsTabProps) {
  const supabase = createClient()
  const [view, setView] = useState<'invoices' | 'payments'>('invoices')
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false)
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const [showEditInvoice, setShowEditInvoice] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false)
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>()
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; invoice_number: string; balance_due: number } | undefined>()
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<any>()
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null)
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<any>()
  const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string; invoice_number: string } | null>(null)
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; payment_number: string } | null>(null)
  
  // Fetch contract for this lead (if exists)
  const { data: contract } = useQuery({
    queryKey: ['lead-contract', leadId],
    queryFn: async () => {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id')
        .eq('lead_id', leadId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!quotes) return null

      const { data } = await supabase
        .from('signed_contracts')
        .select('id, contract_number, quote_id')
        .eq('quote_id', quotes.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return data
    }
  })

  const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({ lead_id: leadId })
  const { data: paymentsResponse, isLoading: paymentsLoading } = usePayments({ lead_id: leadId })
  const updatePayment = useUpdatePayment()
  const deleteInvoice = useDeleteInvoice()
  const deletePayment = useDeletePayment()
  const isAdminOrOffice = useIsAdminOrOffice()

  const invoices = invoicesResponse?.data || []
  const payments = paymentsResponse?.data || []

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0)
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance_due, 0)

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download-pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalInvoiced)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === 'invoices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('invoices')}
          >
            Invoices ({invoices.length})
          </Button>
          <Button
            variant={view === 'payments' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('payments')}
          >
            Payments ({payments.length})
          </Button>
        </div>

        <div className="flex gap-2">
          {view === 'invoices' && (
            <Button 
              size="sm" 
              onClick={() => {
                if (contract) {
                  setShowInvoiceBuilder(true)
                } else {
                  setShowCreateInvoice(true)
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {contract ? 'Create Invoice from Contract' : 'Create Invoice'}
            </Button>
          )}
          {view === 'payments' && (
            <Button size="sm" onClick={() => setShowRecordPayment(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      {view === 'invoices' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No invoices yet
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date
                        ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(invoice.amount_paid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.balance_due)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status]}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditInvoiceId(invoice.id)
                              setShowEditInvoice(true)
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Edit Invoice
                          </DropdownMenuItem>
                          {invoice.balance_due > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvoice({
                                    id: invoice.id,
                                    invoice_number: invoice.invoice_number,
                                    balance_due: invoice.balance_due,
                                  })
                                  setShowRecordPayment(true)
                                }}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Record Payment
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedInvoiceForEmail(invoice)
                              setShowSendEmail(true)
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Email Invoice
                          </DropdownMenuItem>
                          {isAdminOrOffice && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setInvoiceToDelete({
                                    id: invoice.id,
                                    invoice_number: invoice.invoice_number,
                                  })
                                  setShowDeleteInvoiceDialog(true)
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payments Table */}
      {view === 'payments' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Cleared</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No payments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.payment_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {payment.invoice?.invoice_number || '-'}
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabels[payment.payment_method]}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {payment.reference_number || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.cleared ? (
                        <Badge className="bg-green-100 text-green-700">
                          {payment.cleared_date
                            ? format(new Date(payment.cleared_date), 'MMM d')
                            : 'Cleared'}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updatePayment.mutate({
                              paymentId: payment.id,
                              updates: {
                                cleared: true,
                                cleared_date: new Date().toISOString(),
                              },
                            })
                          }}
                        >
                          <Badge className="bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200">
                            Mark Cleared
                          </Badge>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPaymentForEdit(payment)
                            setShowEditPayment(true)
                          }}
                          title="Edit Payment"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdminOrOffice && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setPaymentToDelete({
                                id: payment.id,
                                payment_number: payment.payment_number,
                              })
                              setShowDeletePaymentDialog(true)
                            }}
                            title="Delete Payment"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <CreateInvoiceDialog
        open={showCreateInvoice}
        onOpenChange={setShowCreateInvoice}
        leadId={leadId}
        quoteId={selectedQuoteId}
      />

      {contract && (
        <InvoiceBuilder
          open={showInvoiceBuilder}
          onOpenChange={setShowInvoiceBuilder}
          leadId={leadId}
          quoteId={contract.quote_id}
          contractId={contract.id}
        />
      )}
      
      <RecordPaymentDialog
        open={showRecordPayment}
        onOpenChange={setShowRecordPayment}
        leadId={leadId}
        invoice={selectedInvoice}
      />
      
      <SendInvoiceEmailDialog
        open={showSendEmail}
        onOpenChange={setShowSendEmail}
        invoiceId={selectedInvoiceForEmail?.id || ''}
        invoiceNumber={selectedInvoiceForEmail?.invoice_number || ''}
        customerEmail={selectedInvoiceForEmail?.lead?.email}
        customerName={selectedInvoiceForEmail?.lead?.full_name}
      />

      {editInvoiceId && (
        <EditInvoiceDialog
          open={showEditInvoice}
          onOpenChange={setShowEditInvoice}
          invoiceId={editInvoiceId}
        />
      )}

      {selectedPaymentForEdit && (
        <EditPaymentDialog
          open={showEditPayment}
          onOpenChange={setShowEditPayment}
          payment={selectedPaymentForEdit}
        />
      )}

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={showDeleteInvoiceDialog} onOpenChange={setShowDeleteInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoice_number}</strong>? 
              This action cannot be undone. All payments associated with this invoice will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invoiceToDelete) {
                  deleteInvoice.mutate(invoiceToDelete.id)
                  setInvoiceToDelete(null)
                  setShowDeleteInvoiceDialog(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog open={showDeletePaymentDialog} onOpenChange={setShowDeletePaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment <strong>{paymentToDelete?.payment_number}</strong>? 
              This will affect the invoice balance and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (paymentToDelete) {
                  deletePayment.mutate(paymentToDelete.id)
                  setPaymentToDelete(null)
                  setShowDeletePaymentDialog(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
