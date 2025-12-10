'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateInvoice, useNextInvoiceNumber } from '@/lib/hooks/use-invoices'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatting'
import { CustomerInvoiceInsert, InvoiceLineItemInsert } from '@/lib/types/invoices'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  quoteId?: string
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  leadId,
  quoteId: initialQuoteId,
}: CreateInvoiceDialogProps) {
  const { data: company } = useCurrentCompany()
  const { data: nextInvoiceNumber } = useNextInvoiceNumber()
  const createInvoice = useCreateInvoice()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<any[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(initialQuoteId)
  const [quote, setQuote] = useState<any>(null)
  const [changeOrders, setChangeOrders] = useState<any[]>([])
  const [selectedChangeOrders, setSelectedChangeOrders] = useState<string[]>([])

  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'Due on receipt',
    notes: '',
  })

  // Load quotes for the lead
  useEffect(() => {
    if (!open) return

    const loadQuotes = async () => {
      const { data } = await supabase
        .from('quotes')
        .select('id, quote_number, total_amount, status')
        .eq('lead_id', leadId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })

      setQuotes(data || [])
      
      // If only one quote, auto-select it
      if (data && data.length === 1) {
        setSelectedQuoteId(data[0].id)
      }
    }

    loadQuotes()
  }, [open, leadId, supabase])

  // Load quote and change orders when quote selected
  useEffect(() => {
    if (!open || !selectedQuoteId) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Load quote with line items
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('*, quote_line_items(*)')
          .eq('id', selectedQuoteId)
          .single()

        if (quoteData) {
          setQuote(quoteData)
        }

        // Load approved change orders for this lead
        const { data: coData } = await supabase
          .from('change_orders')
          .select('*')
          .eq('lead_id', leadId)
          .eq('status', 'approved')
          .is('deleted_at', null)

        if (coData) {
          setChangeOrders(coData)
        }
      } catch (error) {
        console.error('Failed to load invoice data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open, selectedQuoteId, leadId, supabase])

  const calculateTotal = () => {
    // Quote total_amount already includes tax, so we don't add tax again
    let total = quote?.total_amount || 0
    
    // Add selected change orders (these also should include tax if applicable)
    selectedChangeOrders.forEach(coId => {
      const co = changeOrders.find(c => c.id === coId)
      if (co) total += co.amount
    })

    return { total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !nextInvoiceNumber?.data) return

    const { total } = calculateTotal()

    // Build line items from quote
    const lineItems: InvoiceLineItemInsert[] = []
    
    if (quote?.quote_line_items) {
      quote.quote_line_items.forEach((item: any, index: number) => {
        lineItems.push({
          company_id: company.id,
          invoice_id: '', // Will be set by API
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          quote_line_item_id: item.id,
          sort_order: index,
        })
      })
    }

    // Add change orders as line items
    selectedChangeOrders.forEach((coId, index) => {
      const co = changeOrders.find(c => c.id === coId)
      if (co) {
        lineItems.push({
          company_id: company.id,
          invoice_id: '',
          description: `Change Order: ${co.title}`,
          quantity: 1,
          unit_price: co.amount,
          change_order_id: co.id,
          sort_order: (quote?.quote_line_items?.length || 0) + index,
        })
      }
    })

    const invoice: CustomerInvoiceInsert = {
      company_id: company.id,
      lead_id: leadId,
      quote_id: selectedQuoteId || null,
      invoice_number: nextInvoiceNumber.data,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      subtotal: total, // Use total as subtotal since quote already has tax included
      tax_rate: 0,
      tax_amount: 0,
      total,
      payment_terms: formData.payment_terms || null,
      notes: formData.notes || null,
    }

    await createInvoice.mutateAsync({ invoice, lineItems })
    
    // Update lead status to "invoiced"
    const supabase = createClient()
    const { error: leadError } = await supabase
      .from('leads')
      .update({ status: 'invoiced' })
      .eq('id', leadId)
    
    if (leadError) {
      console.error('Failed to update lead status:', leadError)
      toast.error('Invoice created but failed to update lead status')
    } else {
      toast.success('Invoice created and lead status updated')
    }
    
    onOpenChange(false)
    
    // Reset form
    setFormData({
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_terms: 'Due on receipt',
      notes: '',
    })
    setSelectedChangeOrders([])
  }

  const { total } = calculateTotal()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No accepted quotes found for this lead.
            </p>
            <p className="text-sm text-gray-400">
              You need an accepted quote before creating an invoice.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quote Selection */}
            {quotes.length > 1 && (
              <div>
                <Label>Select Quote *</Label>
                <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a quote" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quote_number} - {formatCurrency(q.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!selectedQuoteId && quotes.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                Please select a quote to create an invoice
              </div>
            )}

            {selectedQuoteId && quote && (
              <>
                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice Number</Label>
                    <Input
                      value={nextInvoiceNumber?.data || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label>Invoice Date</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Input
                      value={formData.payment_terms}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_terms: e.target.value })
                      }
                      placeholder="e.g., Net 30, Due on receipt"
                    />
                  </div>
                </div>

            {/* Quote Summary */}
            {quote && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2">
                  Original Quote: {quote.quote_number}
                </h3>
                <p className="text-sm text-gray-600">{quote.title}</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(quote.total_amount)}
                </p>
              </div>
            )}

            {/* Change Orders */}
            {changeOrders.length > 0 && (
              <div>
                <Label className="mb-2 block">Include Change Orders</Label>
                <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                  {changeOrders.map((co) => (
                    <label
                      key={co.id}
                      className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedChangeOrders.includes(co.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChangeOrders([...selectedChangeOrders, co.id])
                            } else {
                              setSelectedChangeOrders(
                                selectedChangeOrders.filter((id) => id !== co.id)
                              )
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <div>
                          <p className="font-medium text-sm">{co.change_order_number}</p>
                          <p className="text-sm text-gray-600">{co.title}</p>
                        </div>
                      </div>
                      <p className="font-medium">{formatCurrency(co.amount)}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Total Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Tax is already included in the quote amount
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any notes for this invoice..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoice.isPending || !selectedQuoteId}
              >
                {createInvoice.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </div>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
