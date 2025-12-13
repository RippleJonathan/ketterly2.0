// Estimates Tab - Shows all quotes for a lead
'use client'

import { useState, useEffect } from 'react'
import { useQuotes, useQuote } from '@/lib/hooks/use-quotes'
import { useGenerateQuotePDF } from '@/lib/hooks/use-generate-quote-pdf'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, FileText, Mail, Download, Check, X, Copy, Trash2, Link as LinkIcon, ExternalLink, PenTool, Lock, Unlock, FileDown, AlertCircle, TrendingUp, TrendingDown, Edit3 } from 'lucide-react'
import { QuoteStatus } from '@/lib/types/quotes'
import { formatCurrency } from '@/lib/utils/formatting'
import { format } from 'date-fns'
import {
  useMarkQuoteAsSent,
  useAcceptQuote,
  useDeclineQuote,
  useDuplicateQuote,
  useDeleteQuote,
  useGenerateQuoteShareLink,
  useSendQuoteEmail,
} from '@/lib/hooks/use-quotes'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuoteForm } from './quote-form'
import { CompanySignatureDialog } from '@/components/admin/quotes/company-signature-dialog'
import { useLeadMeasurements } from '@/lib/hooks/use-measurements'
import { useQuery } from '@tanstack/react-query'
import { compareQuoteToContract } from '@/lib/api/contracts'

interface EstimatesTabProps {
  leadId: string
  leadName: string
  leadAddress?: string
  leadCity?: string
  leadState?: string
  leadZip?: string
  latitude?: number | null
  longitude?: number | null
}

export function EstimatesTab({ 
  leadId, 
  leadName, 
  leadAddress,
  leadCity,
  leadState,
  leadZip,
  latitude,
  longitude 
}: EstimatesTabProps) {
  const { data: quotes, isLoading } = useQuotes({ leadId })
  const { data: measurementsResponse } = useLeadMeasurements(leadId)
  const measurements = measurementsResponse?.data
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  
  // Fetch full quote details when editing
  const { data: editingQuoteData } = useQuote(editingQuoteId || undefined)
  
  // PDF generation hook
  const { generateAndDownload, isGenerating } = useGenerateQuotePDF()

  // Handler to fetch full quote and generate PDF
  const handleDownloadPDF = async (quoteId: string) => {
    try {
      // Fetch full quote with all relations
      const supabase = createClient()
      const { data: fullQuote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          line_items:quote_line_items(*),
          lead:leads(id, full_name, email, phone, address, city, state, zip)
        `)
        .eq('id', quoteId)
        .single()

      if (error || !fullQuote) {
        toast.error('Failed to fetch quote details')
        return
      }

      // Generate and download PDF (no storage upload)
      await generateAndDownload(fullQuote)
    } catch (error) {
      console.error('Download PDF error:', error)
      toast.error('Failed to download PDF')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">Loading estimates...</p>
      </div>
    )
  }

  if (!quotes || quotes.length === 0) {
    const fullAddress = [leadAddress, leadCity, leadState, leadZip].filter(Boolean).join(', ')
    
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Estimates Yet</h3>
          <p className="text-gray-500 mb-6">
            Create a quote to send to {leadName}
          </p>

          {/* Measurement info */}
          {measurements && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm space-y-1">
                <p className="text-green-700 font-medium">✓ Roof measurements available</p>
                <p className="text-gray-600">
                  {measurements.actual_squares} squares • {measurements.roof_pitch || 'Unknown pitch'}
                </p>
              </div>
            </div>
          )}
          {!measurements && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                💡 Go to the <strong>Measurements</strong> tab to auto-measure the roof first
              </p>
            </div>
          )}

          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </div>

        <QuoteForm
          leadId={leadId}
          leadName={leadName}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900">Estimates</h2>
            <p className="text-gray-600 mt-1">
              {quotes.length} {quotes.length === 1 ? 'estimate' : 'estimates'} for {leadName}
            </p>
            {measurements && (
              <div className="mt-2 text-sm text-gray-600">
                Roof: {measurements.actual_squares} squares • {measurements.roof_pitch || 'Unknown pitch'} • {measurements.roof_complexity || 'Unknown complexity'}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Estimate
            </Button>
          </div>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isExpanded={selectedQuote === quote.id}
              onToggle={() => setSelectedQuote(selectedQuote === quote.id ? null : quote.id)}
              onEdit={() => {
                setEditingQuoteId(quote.id)
                setIsFormOpen(true)
              }}
              isGenerating={isGenerating}
              onDownloadPDF={() => handleDownloadPDF(quote.id)}
            />
          ))}
        </div>
      </div>

      <QuoteForm
        leadId={leadId}
        leadName={leadName}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingQuoteId(null)
        }}
        existingQuote={editingQuoteData}
      />
    </>
  )
}

interface QuoteCardProps {
  quote: any
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  isGenerating: boolean
  onDownloadPDF: () => void
}

function QuoteCard({ quote, isExpanded, onToggle, onEdit, isGenerating, onDownloadPDF }: QuoteCardProps) {
  const { user } = useAuth()
  const sendQuoteEmail = useSendQuoteEmail()
  const duplicateQuote = useDuplicateQuote()
  const deleteQuote = useDeleteQuote()
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  // Get contract comparison if quote is accepted
  const { data: comparisonData } = useQuery({
    queryKey: ['contract-comparison', quote.id],
    queryFn: () => compareQuoteToContract(quote.id),
    enabled: quote.status === 'accepted',
  })

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800' },
    viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-800' },
    pending_customer_signature: { label: 'Pending Customer Signature', color: 'bg-yellow-100 text-yellow-800' },
    pending_company_signature: { label: 'Waiting for Your Signature', color: 'bg-orange-100 text-orange-800' },
    accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
    declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
    expired: { label: 'Expired', color: 'bg-orange-100 text-orange-800' },
  }

  const handleSendToCustomer = async () => {
    // Send email with PDF attachment and get the share token
    const result = await sendQuoteEmail.mutateAsync({ quoteId: quote.id, includePdf: true })
    if (result?.shareToken) {
      const url = `${window.location.origin}/quote/${result.shareToken}`
      setShareUrl(url)
      setShareDialogOpen(true)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank')
  }

  const status = statusConfig[quote.status as QuoteStatus]

  // Check if quote is expired
  const isExpired =
    new Date(quote.valid_until) < new Date() && quote.status !== 'accepted'

  const comparison = comparisonData?.data
  const hasContractChanges = comparison?.has_changes || false
  const totalChange = comparison?.total_change || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={status.color}>{status.label}</Badge>
              {isExpired && (
                <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
              )}
              {quote.option_label && (
                <Badge variant="outline">{quote.option_label}</Badge>
              )}
              {/* Contract Change Indicators */}
              {hasContractChanges && (
                <Badge className={`flex items-center gap-1 ${totalChange > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {totalChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {totalChange > 0 ? '+' : ''}{formatCurrency(totalChange)} from contract
                </Badge>
              )}
            </div>
            <p className="text-gray-900 font-medium mb-1">{quote.title}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Created {format(new Date(quote.created_at), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}</span>
              {quote.sent_at && (
                <>
                  <span>•</span>
                  <span>Sent {format(new Date(quote.sent_at), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right ml-6">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(quote.total_amount)}
            </p>
            {quote.line_items && (
              <p className="text-sm text-gray-500 mt-1">
                {quote.line_items.length} line{' '}
                {quote.line_items.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {/* Contract Comparison */}
          {comparison && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Signed Contract vs Current Estimate</h4>
                    <p className="text-sm text-blue-700">
                      Contract #{comparison.contract.contract_number} • Signed {format(new Date(comparison.contract.contract_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {hasContractChanges && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      // TODO: Generate change order
                      toast.info('Change order generation coming soon!')
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Generate Change Order
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Original Contract</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(comparison.contract.original_total)}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Current Estimate</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(quote.total_amount)}
                  </p>
                </div>
                
                <div className={`rounded-lg p-3 ${totalChange > 0 ? 'bg-green-100' : totalChange < 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-700 mb-1">Change</p>
                  <p className={`text-lg font-bold ${totalChange > 0 ? 'text-green-700' : totalChange < 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                    {totalChange > 0 ? '+' : ''}{formatCurrency(totalChange)}
                  </p>
                </div>
              </div>

              {hasContractChanges && (
                <div className="mt-4 text-sm space-y-2">
                  {comparison.added_items.length > 0 && (
                    <p className="text-green-700">
                      ✓ <strong>{comparison.added_items.length}</strong> item(s) added
                    </p>
                  )}
                  {comparison.removed_items.length > 0 && (
                    <p className="text-orange-700">
                      - <strong>{comparison.removed_items.length}</strong> item(s) removed
                    </p>
                  )}
                  {comparison.modified_items.length > 0 && (
                    <p className="text-blue-700">
                      ✎ <strong>{comparison.modified_items.length}</strong> item(s) modified
                    </p>
                  )}
                </div>
              )}

              {!hasContractChanges && (
                <p className="text-sm text-green-700 mt-3">
                  ✓ Estimate matches signed contract
                </p>
              )}
            </div>
          )}
          
          {/* Line Items */}
          {quote.line_items && quote.line_items.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.line_items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-500">{item.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        Subtotal
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(quote.subtotal)}
                      </td>
                    </tr>
                    {quote.discount_amount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-gray-900">
                          Discount
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          -{formatCurrency(quote.discount_amount)}
                        </td>
                      </tr>
                    )}
                    {quote.tax_rate > 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-gray-900">
                          Tax ({(quote.tax_rate * 100).toFixed(2)}%)
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(quote.tax_amount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-base font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Payment Terms & Notes */}
          {(quote.payment_terms || quote.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {quote.payment_terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Payment Terms
                  </h4>
                  <p className="text-sm text-gray-600">{quote.payment_terms}</p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {quote.status === 'draft' && (
              <>
                <Button
                  size="sm"
                  onClick={handleSendToCustomer}
                  disabled={sendQuoteEmail.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendQuoteEmail.isPending ? 'Sending...' : 'Send to Customer'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onEdit}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}

            {quote.status === 'sent' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (quote.share_token) {
                      const url = `${window.location.origin}/quote/${quote.share_token}`
                      setShareUrl(url)
                      setShareDialogOpen(true)
                    }
                  }}
                  disabled={!quote.share_token}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  View Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendQuoteEmail.mutate({ quoteId: quote.id, includePdf: true })}
                  disabled={sendQuoteEmail.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendQuoteEmail.isPending ? 'Resending...' : 'Resend Email'}
                </Button>
              </>
            )}

            {(quote.status === 'sent' || quote.status === 'pending_company_signature' || quote.status === 'pending_customer_signature') && (
              <>
                <Button
                  size="sm"
                  onClick={() => setSignatureDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  Sign as Company Rep
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (quote.share_token) {
                      window.open(`${window.location.origin}/quote/${quote.share_token}`, '_blank')
                    }
                  }}
                  disabled={!quote.share_token}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Quote
                </Button>
              </>
            )}

            {quote.status === 'accepted' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Estimate
                </Button>
                {hasContractChanges && (
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      toast.info('Change order generation coming soon!')
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Change Order
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    toast.info('Invoice generation coming soon!')
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownloadPDF()}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                user && duplicateQuote.mutate({ quoteId: quote.id, createdBy: user.id })
              }
              disabled={duplicateQuote.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>

            {quote.status === 'draft' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {quote.quote_number}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteQuote.mutate(quote.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
      
      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quote Sent Successfully!</DialogTitle>
            <DialogDescription>
              The quote has been emailed to your customer. You can also copy the link to share it another way.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenInNewTab}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>✓ Email sent from your address</strong>
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
                <li>Customer will receive the quote in their inbox</li>
                <li>Email appears to come from your business email</li>
                <li>Customer can view and sign the quote digitally</li>
                <li>You'll be notified when the quote is viewed or accepted</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Signature Dialog */}
      <CompanySignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        defaultSignerName={user?.full_name}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
