// Estimates Tab - Shows all quotes for a lead
'use client'

import { useState, useEffect } from 'react'
import { useQuotes, useQuote } from '@/lib/hooks/use-quotes'
import { useGenerateQuotePDF } from '@/lib/hooks/use-generate-quote-pdf'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, FileText, Mail, Download, Check, X, Copy, Trash2, Link as LinkIcon, ExternalLink, PenTool, Lock, Unlock, FileDown, AlertCircle, TrendingUp, TrendingDown, Edit3, Loader2, CheckCircle, Presentation } from 'lucide-react'
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
import { CreateEstimateDialog } from './create-estimate-dialog'
import { CompanySignatureDialog } from '@/components/admin/quotes/company-signature-dialog'
import { ChangeOrderSignatureDialog } from '@/components/admin/change-orders/change-order-signature-dialog'
import { ChangeOrderBuilder } from '@/components/admin/change-orders/change-order-builder'
import { GenerateChangeOrderDialog } from './generate-change-order-dialog'
import { useLeadMeasurements } from '@/lib/hooks/use-measurements'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { compareQuoteToContract } from '@/lib/api/contracts'
import { PresentModal } from '@/components/admin/presentations/present-modal'
import { PresentationOverlay } from '@/components/admin/presentations/presentation-overlay'
import { useStartPresentation, useActivePresentationTemplates, useCompletePresentationSession } from '@/lib/hooks/use-presentations'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import type { PresentationDeck, PricingOption } from '@/lib/types/presentations'

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
  
  // Debug measurements
  console.log('Estimates Tab - Measurements:', {
    measurementsResponse,
    measurements,
    hasMeasurements: !!measurements,
    total_squares: measurements?.total_squares,
    actual_squares: measurements?.actual_squares,
  })
  
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [changeOrderDialogOpen, setChangeOrderDialogOpen] = useState(false)
  const [changeOrderData, setChangeOrderData] = useState<{
    quoteId: string
    totalChange: number
    changeDescription: string
  } | null>(null)
  const queryClient = useQueryClient()

  // Presentation state
  const [isPresentModalOpen, setIsPresentModalOpen] = useState(false)
  const [activePresentationDeck, setActivePresentationDeck] = useState<PresentationDeck | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const { data: company } = useCurrentCompany()
  const { user } = useAuth()
  const startPresentation = useStartPresentation()
  const completeSession = useCompletePresentationSession()

  // Get current user's profile data (full_name, etc.)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Real-time subscription for quote and change order updates
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to quote changes for this lead
    const quotesChannel = supabase
      .channel(`quotes-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          // Invalidate quotes query when any quote changes
          queryClient.invalidateQueries({ queryKey: ['quotes', leadId] })
        }
      )
      .subscribe()

    // Subscribe to change order updates for this lead
    const changeOrdersChannel = supabase
      .channel(`change-orders-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'change_orders',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: ['quote-change-orders'] })
          queryClient.invalidateQueries({ queryKey: ['approved-change-orders'] })
          queryClient.invalidateQueries({ queryKey: ['contract'] })
          queryClient.invalidateQueries({ queryKey: ['contract-comparison'] })
        }
      )
      .subscribe()

    // Subscribe to invoice creation to auto-create commissions
    const invoicesChannel = supabase
      .channel(`invoices-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_invoices',
          filter: `lead_id=eq.${leadId}`,
        },
        async (payload) => {
          console.log('🔔 New invoice created, auto-creating commissions:', payload.new)
          
          try {
            // Get lead data to get all assignment IDs
            const { data: leadData } = await supabase
              .from('leads')
              .select('sales_rep_id, marketing_rep_id, sales_manager_id, production_manager_id, company_id')
              .eq('id', leadId)
              .single()
            
            if (!leadData) {
              throw new Error('Lead not found')
            }
            
            // Get current user ID
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            
            // Import functions
            const { autoCreateCommission, createOfficeAndTeamCommissions } = await import('@/lib/utils/auto-commission')
            const { recalculateLeadCommissions } = await import('@/lib/utils/recalculate-commissions')
            
            // Build user-field mapping just like refresh button
            const userFieldMap: Array<{ userId: string, field: 'sales_rep_id' | 'marketing_rep_id' | 'sales_manager_id' | 'production_manager_id' }> = []
            
            if (leadData.sales_rep_id) userFieldMap.push({ userId: leadData.sales_rep_id, field: 'sales_rep_id' })
            if (leadData.marketing_rep_id) userFieldMap.push({ userId: leadData.marketing_rep_id, field: 'marketing_rep_id' })
            if (leadData.sales_manager_id) userFieldMap.push({ userId: leadData.sales_manager_id, field: 'sales_manager_id' })
            if (leadData.production_manager_id) userFieldMap.push({ userId: leadData.production_manager_id, field: 'production_manager_id' })
            
            // Create commissions for all assigned users (with skipCancelOthers=true)
            if (userFieldMap.length > 0) {
              const promises = userFieldMap.map(({ userId, field }) => 
                autoCreateCommission(leadId, userId, leadData.company_id, currentUser?.id || null, field, true)
                  .catch(err => {
                    console.error(`Failed to auto-create commission for ${field}:`, err)
                    return { success: false }
                  })
              )
              await Promise.all(promises)
            }
            
            // Create office/team lead commissions
            if (leadData.sales_rep_id) {
              await createOfficeAndTeamCommissions(leadId, leadData.sales_rep_id, leadData.company_id)
            }
            
            // Recalculate all commission amounts
            await recalculateLeadCommissions(leadId, leadData.company_id)
            
            console.log('✅ All commissions auto-created successfully')
            toast.success('Commissions created automatically')
            
            // Invalidate commission queries
            queryClient.invalidateQueries({ queryKey: ['lead-commissions', leadId] })
            queryClient.invalidateQueries({ queryKey: ['commission-summary', leadId] })
          } catch (error: any) {
            console.error('❌ Failed to auto-create commissions:', error)
            toast.error(`Failed to create commissions: ${error.message}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(quotesChannel)
      supabase.removeChannel(changeOrdersChannel)
      supabase.removeChannel(invoicesChannel)
    }
  }, [leadId, queryClient])
  
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
          lead:leads(
            id, 
            full_name, 
            email, 
            phone, 
            address, 
            city, 
            state, 
            zip,
            assigned_user:users!leads_assigned_to_fkey(
              id,
              full_name,
              email,
              phone
            ),
            location:locations(
              id,
              name,
              address,
              city,
              state,
              zip,
              phone,
              email,
              logo_url,
              primary_color,
              contract_terms,
              license_number
            )
          ),
          company:companies(*),
          creator:users!quotes_created_by_fkey(
            id,
            full_name,
            email,
            phone
          )
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

  // Handle starting a presentation
  const handleStartPresentation = async (selection: {
    templateId: string
    flowType: 'retail' | 'insurance'
    estimateIds: string[]
  }) => {
    if (!company || !user) {
      toast.error('Authentication required')
      return
    }

    try {
      console.log('Starting presentation with:', selection)
      const result = await startPresentation.mutateAsync({
        companyId: company.id,
        templateId: selection.templateId,
        leadId,
        flowType: selection.flowType,
        estimateIds: selection.estimateIds,
        presentedBy: user.id,
      })

      console.log('Presentation result:', result)

      if (result.data) {
        console.log('Setting deck and session:', {
          deck: result.data.deck,
          sessionId: result.data.session_id || result.data.session?.id
        })
        setActivePresentationDeck(result.data.deck)
        setActiveSessionId(result.data.session_id || result.data.session?.id)
        setIsPresentModalOpen(false)
      } else {
        console.error('No data in result:', result)
      }
    } catch (error) {
      console.error('Failed to start presentation:', error)
      toast.error('Failed to start presentation')
    }
  }

  // Handle closing presentation
  const handleClosePresentation = () => {
    setActivePresentationDeck(null)
    setActiveSessionId(null)
  }

  // Handle presentation completion (proceed to signing)
  const handleCompletePresentation = async (selectedEstimateId?: string, selectedOption?: PricingOption) => {
    if (activeSessionId) {
      await completeSession.mutateAsync({
        sessionId: activeSessionId,
        contractSigned: false,
      })
    }

    // Close overlay
    handleClosePresentation()

    // Show success message
    if (selectedEstimateId && selectedOption) {
      toast.success(`Customer selected ${selectedOption.toUpperCase()} option. Proceeding to contract signing...`)
      // TODO: Phase 3 - Navigate to contract signing with selected estimate and option
    } else {
      toast.info('Presentation completed')
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

          <Button onClick={() => {
            console.log('Create Estimate clicked, opening dialog')
            setIsCreateDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </div>

        <CreateEstimateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => {
            console.log('Dialog closing')
            setIsCreateDialogOpen(false)
          }}
          onSelectTemplate={(templateId) => {
            console.log('Template selected:', templateId)
            setSelectedTemplateId(templateId)
            setIsFormOpen(true)
            setIsCreateDialogOpen(false)
          }}
          onSelectBlank={() => {
            console.log('Blank selected')
            setSelectedTemplateId(undefined)
            setIsFormOpen(true)
            setIsCreateDialogOpen(false)
          }}
        />

        <QuoteForm
          leadId={leadId}
          leadName={leadName}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setSelectedTemplateId(undefined)
          }}
          initialTemplateId={selectedTemplateId}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline"
            onClick={() => setIsPresentModalOpen(true)}
            disabled={!quotes || quotes.length === 0}
            className="w-full sm:w-auto"
          >
            <Presentation className="h-4 w-4 mr-2" />
            Present
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {quotes?.map((quote: any) => (
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
              onGenerateChangeOrder={(quoteId, totalChange, description) => {
                setChangeOrderData({ quoteId, totalChange, changeDescription: description })
                setChangeOrderDialogOpen(true)
              }}
              userProfile={userProfile}
            />
          ))}
        </div>
      </div>

      {/* Change Order Dialog */}
      {changeOrderData && (
        <GenerateChangeOrderDialog
          open={changeOrderDialogOpen}
          onOpenChange={setChangeOrderDialogOpen}
          leadId={leadId}
          quoteId={changeOrderData.quoteId}
          totalChange={changeOrderData.totalChange}
          changeDescription={changeOrderData.changeDescription}
        />
      )}

      <CreateEstimateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSelectTemplate={(templateId) => {
          setSelectedTemplateId(templateId)
          setIsFormOpen(true)
        }}
        onSelectBlank={() => {
          setSelectedTemplateId(undefined)
          setIsFormOpen(true)
        }}
      />

      <QuoteForm
        leadId={leadId}
        leadName={leadName}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingQuoteId(null)
          setSelectedTemplateId(undefined)
        }}
        existingQuote={editingQuoteData}
        initialTemplateId={selectedTemplateId}
      />

      {/* Presentation Modal */}
      {company && (
        <PresentModal
          companyId={company.id}
          leadId={leadId}
          availableEstimates={quotes || []}
          isOpen={isPresentModalOpen}
          onClose={() => setIsPresentModalOpen(false)}
          onStartPresentation={handleStartPresentation}
        />
      )}

      {/* Presentation Overlay */}
      {activePresentationDeck && activeSessionId && (
        <PresentationOverlay
          sessionId={activeSessionId}
          deck={activePresentationDeck}
          onClose={handleClosePresentation}
          onComplete={handleCompletePresentation}
        />
      )}
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
  onGenerateChangeOrder: (quoteId: string, totalChange: number, description: string) => void
  userProfile: any
}

function QuoteCard({ quote, isExpanded, onToggle, onEdit, isGenerating, onDownloadPDF, onGenerateChangeOrder, userProfile }: QuoteCardProps) {
  const { user } = useAuth()
  const sendQuoteEmail = useSendQuoteEmail()
  const duplicateQuote = useDuplicateQuote()
  const deleteQuote = useDeleteQuote()
  const queryClient = useQueryClient()
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [changeOrderSignatureOpen, setChangeOrderSignatureOpen] = useState(false)
  const [changeOrderBuilderOpen, setChangeOrderBuilderOpen] = useState(false)
  const [editingChangeOrderId, setEditingChangeOrderId] = useState<string | null>(null)
  const [isGeneratingContract, setIsGeneratingContract] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Get signatures for this quote to check if both parties have signed
  const { data: signatures } = useQuery({
    queryKey: ['quote-signatures', quote.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quote_signatures')
        .select('*')
        .eq('quote_id', quote.id)
        .is('deleted_at', null)
      
      if (error) throw error
      return data || []
    },
  })

  // Get contract for this quote if it's accepted (for contract value comparison)
  const { data: contract } = useQuery({
    queryKey: ['contract', quote.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('signed_contracts')
        .select('*')
        .eq('quote_id', quote.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      return data
    },
    enabled: quote.status === 'accepted',
  })

  // Get contract comparison if quote is accepted
  const { data: comparisonData } = useQuery({
    queryKey: ['contract-comparison', quote.id],
    queryFn: () => compareQuoteToContract(quote.id),
    enabled: quote.status === 'accepted',
  })

  // Get pending change orders for this quote
  const { data: changeOrderData } = useQuery({
    queryKey: ['quote-change-orders', quote.id],
    queryFn: async () => {
      console.log('Fetching pending change orders for quote:', quote.id)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          line_items:change_order_line_items(*)
        `)
        .eq('quote_id', quote.id)
        .in('status', ['draft', 'pending', 'sent', 'pending_customer_signature', 'pending_company_signature'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      console.log('Pending change order result:', data)
      return data
    },
    enabled: quote.status === 'accepted',
  })

  // Get approved change orders for this quote (to display line items)
  const { data: approvedChangeOrders } = useQuery({
    queryKey: ['approved-change-orders', quote.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('change_orders')
        .select(`
          *,
          line_items:change_order_line_items(*)
        `)
        .eq('quote_id', quote.id)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: quote.status === 'accepted',
  })

  const pendingChangeOrder = changeOrderData

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
    if (isSendingEmail) return // Prevent multiple clicks
    
    try {
      setIsSendingEmail(true)
      
      // If quote is already accepted (customer signed), send executed contract email
      if (quote.status === 'accepted') {
        console.log('Quote is accepted - sending executed contract email')
        const response = await fetch(`/api/quotes/${quote.id}/send-executed-contract`, {
          method: 'POST',
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to send executed contract: ${response.status} ${errorText}`)
        }
        
        toast.success('Executed contract sent successfully!')
        return
      }

      // Generate share token first if it doesn't exist
      if (!quote.share_token) {
        console.log('Generating share token before sending email')
        const response = await fetch(`/api/quotes/${quote.id}/generate-share-link`, {
          method: 'POST',
        })
        
        if (!response.ok) {
          throw new Error('Failed to generate share link')
        }
        
        // Refresh quote data to get the new share_token
        await queryClient.invalidateQueries({ queryKey: ['quotes'] })
        await queryClient.invalidateQueries({ queryKey: ['quote', quote.id] })
      }
      
      // Send the regular quote email
      await sendQuoteEmail.mutateAsync({ quoteId: quote.id, includePdf: true })
      toast.success('Quote sent successfully!')
    } catch (error: any) {
      console.error('Failed to send quote:', error)
      toast.error(error.message || 'Failed to send quote')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleGenerateShareToken = async () => {
    try {
      console.log('Generating share token for quote:', quote.id)
      // Generate share token by calling the send-email API without actually sending
      // This is needed for iPad signing in draft mode
      const response = await fetch(`/api/quotes/${quote.id}/generate-share-link`, {
        method: 'POST',
      })
      
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to generate share link: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('API response data:', data)
      
      // Refresh the quote data
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] })
      
      // Open the signing page
      if (data.shareToken) {
        console.log('Opening signing page with token:', data.shareToken)
        window.open(`${window.location.origin}/quote/${data.shareToken}`, '_blank')
      } else {
        console.error('No shareToken in response:', data)
        toast.error('Failed to generate share link - no token received')
      }
    } catch (error: any) {
      console.error('handleGenerateShareToken error:', error)
      toast.error(error.message || 'Failed to generate share link')
    }
  }

  const handleGenerateContract = async () => {
    setIsGeneratingContract(true)
    try {
      if (!quote.share_token) {
        console.log('Generating share token for contract')
        const response = await fetch(`/api/quotes/${quote.id}/generate-share-link`, {
          method: 'POST',
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to generate share link: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        
        // Refresh the quote data
        await queryClient.invalidateQueries({ queryKey: ['quotes'] })
        await queryClient.invalidateQueries({ queryKey: ['quote', quote.id] })
        
        // Open the signing page with the new token
        if (data.shareToken) {
          window.open(`${window.location.origin}/quote/${data.shareToken}`, '_blank')
          toast.success('Contract ready for signing')
        } else {
          throw new Error('No share token received')
        }
      } else {
        // Token already exists, just open the signing page
        window.open(`${window.location.origin}/quote/${quote.share_token}`, '_blank')
      }
    } catch (error: any) {
      console.error('handleGenerateContract error:', error)
      toast.error(error.message || 'Failed to generate contract')
    } finally {
      setIsGeneratingContract(false)
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

  // Track signature status from quote_signatures table
  const hasCustomerSignature = signatures?.some(sig => sig.signer_type === 'customer') || false
  const hasCompanySignature = signatures?.some(sig => sig.signer_type === 'company_rep') || false
  const bothSigned = hasCustomerSignature && hasCompanySignature

  // Determine if quote has been sent (not just draft)
  const hasBeenSent = quote.status !== 'draft'

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
              {/* Contract Change Indicators - Only show for non-accepted quotes */}
              {hasContractChanges && quote.status !== 'accepted' && (
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
              {/* Show quoted amount before acceptance, then source of truth after */}
              {quote.status === 'accepted' && contract?.current_total_with_change_orders
                ? formatCurrency(contract.current_total_with_change_orders)  // Source of truth with change orders
                : formatCurrency(quote.total_amount)}  {/* Original quote amount */}
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
          {/* Pending Change Order Section */}
          {pendingChangeOrder && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-medium text-gray-900">
                      Change Order {pendingChangeOrder.change_order_number}
                    </p>
                  </div>
                  {/* Signature Status */}
                  <div className="flex items-center gap-3 mt-2 ml-6 text-xs">
                    <div className={`flex items-center gap-1 ${pendingChangeOrder.customer_signature_data ? 'text-green-600' : 'text-gray-400'}`}>
                      {pendingChangeOrder.customer_signature_data ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Customer Signed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>Customer Signature Pending</span>
                        </>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 ${pendingChangeOrder.company_signature_data ? 'text-green-600' : 'text-gray-400'}`}>
                      {pendingChangeOrder.company_signature_data ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Company Signed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>Company Signature Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingChangeOrder.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingChangeOrderId(pendingChangeOrder.id)
                          setChangeOrderBuilderOpen(true)
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm('Delete this change order? This action cannot be undone.')) return
                          
                          try {
                            const response = await fetch(`/api/change-orders/${pendingChangeOrder.id}`, {
                              method: 'DELETE',
                            })
                            if (!response.ok) throw new Error('Failed to delete')
                            toast.success('Change order deleted')
                            queryClient.invalidateQueries({ queryKey: ['quote-change-orders', quote.id] })
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to delete')
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/change-orders/${pendingChangeOrder.id}/send-email`, {
                              method: 'POST',
                            })
                            if (!response.ok) throw new Error('Failed to send')
                            toast.success('Change order sent to customer')
                            queryClient.invalidateQueries({ queryKey: ['quote-change-orders', quote.id] })
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to send')
                          }
                        }}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Send to Customer
                      </Button>
                    </>
                  )}
                  
                  {(pendingChangeOrder.status === 'sent' || pendingChangeOrder.status === 'pending_company_signature') && !pendingChangeOrder.company_signature_data && (
                    <Button
                      size="sm"
                      onClick={() => setChangeOrderSignatureOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <PenTool className="h-4 w-4 mr-1" />
                      Sign as Company Rep
                    </Button>
                  )}
                  
                  {pendingChangeOrder.share_token && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`${window.location.origin}/sign/change-order/${pendingChangeOrder.share_token}`, '_blank')
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View E-Sign
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Change Order Amount */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Change Order Amount:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(pendingChangeOrder.total || 0)}
                  </span>
                </div>
                {contract && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-600">New Contract Total:</span>
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(
                        (contract.current_total_with_change_orders || contract.current_contract_price || contract.original_contract_price || contract.original_total) + 
                        (pendingChangeOrder.total || 0)
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OLD COMPARISON UI - HIDDEN FOR NOW */}
          {false && comparison && (
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
                {!pendingChangeOrder && hasContractChanges && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const changeDesc = [
                        comparison.added_items.length > 0 && `Added ${comparison.added_items.length} item(s)`,
                        comparison.removed_items.length > 0 && `Removed ${comparison.removed_items.length} item(s)`,
                        comparison.modified_items.length > 0 && `Modified ${comparison.modified_items.length} item(s)`,
                      ].filter(Boolean).join(', ')
                      onGenerateChangeOrder(quote.id, totalChange, changeDesc)
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Generate Change Order
                  </Button>
                )}
              </div>
              
              <div className={`grid ${pendingChangeOrder?.status === 'approved' ? 'grid-cols-4' : 'grid-cols-3'} gap-3 mt-4`}>
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
                
                <div className={`rounded-lg p-3 ${totalChange > 0 ? 'bg-amber-100' : totalChange < 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <p className="text-xs text-gray-700 mb-1">Change</p>
                  <p className={`text-lg font-bold ${totalChange > 0 ? 'text-amber-700' : totalChange < 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                    {totalChange > 0 ? '+' : ''}{formatCurrency(totalChange)}
                  </p>
                </div>

                {pendingChangeOrder?.status === 'approved' && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 mb-1">New Contract Price</p>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(quote.total_amount)}
                    </p>
                  </div>
                )}
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
                        {formatCurrency(contract?.original_contract_price || quote.subtotal)}
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
                        Original Contract Total
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                        {formatCurrency(contract?.original_contract_price || quote.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Approved Change Orders */}
          {approvedChangeOrders && approvedChangeOrders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Approved Change Orders
              </h4>
              <div className="space-y-4">
                {approvedChangeOrders.map((co: any) => (
                  <div key={co.id} className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                    <div className="bg-green-100 px-4 py-2 border-b border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600">
                            {co.change_order_number}
                          </Badge>
                          <span className="text-sm font-medium text-green-900">
                            {co.title || 'Change Order'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-900">
                          +{formatCurrency(co.total || 0)}
                        </span>
                      </div>
                      {co.description && (
                        <p className="text-xs text-green-700 mt-1">{co.description}</p>
                      )}
                    </div>
                    {co.line_items && co.line_items.length > 0 && (
                      <div className="bg-white">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Qty
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Unit Price
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {co.line_items.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2">
                                  <div className="text-sm text-gray-900">{item.description}</div>
                                  {item.notes && (
                                    <div className="text-xs text-gray-500 mt-0.5">{item.notes}</div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-900">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-900">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-700">
                                Subtotal
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(co.amount || 0)}
                              </td>
                            </tr>
                            {co.tax_amount > 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-700">
                                  Tax
                                </td>
                                <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(co.tax_amount)}
                                </td>
                              </tr>
                            )}
                            <tr className="font-semibold">
                              <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-900">
                                Change Order Total
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-bold text-green-700">
                                +{formatCurrency(co.total || 0)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Updated Contract Total - Grand Total */}
              {contract && (
                <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Original Contract:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(contract.original_contract_price || contract.original_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Approved Change Orders:</span>
                      <span className="font-medium text-green-700">
                        +{formatCurrency(approvedChangeOrders.reduce((sum: number, co: any) => sum + (co.total || 0), 0))}
                      </span>
                    </div>
                    <div className="pt-3 border-t-2 border-green-300 flex items-center justify-between">
                      <span className="text-lg font-bold text-green-900">Updated Contract Total</span>
                      <span className="text-3xl font-bold text-green-900">
                        {formatCurrency(
                          (contract.original_contract_price || contract.original_total) + 
                          approvedChangeOrders.reduce((sum: number, co: any) => sum + (co.total || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
            {/* Email to Customer - Always visible, sends appropriate version based on status */}
            <Button
              size="sm"
              onClick={handleSendToCustomer}
              disabled={sendQuoteEmail.isPending || isSendingEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendQuoteEmail.isPending || isSendingEmail ? 'Sending...' : 'Email to Customer'}
            </Button>

            {/* Generate Contract / Sign Contract - Hidden if both signatures are complete */}
            {!bothSigned && (
              <Button
                size="sm"
                onClick={handleGenerateContract}
                disabled={isGeneratingContract}
                className="bg-green-600 hover:bg-green-700"
              >
                <PenTool className="h-4 w-4 mr-2" />
                {isGeneratingContract
                  ? 'Generating...'
                  : quote.share_token
                  ? 'Sign Contract'
                  : 'Generate Contract'}
              </Button>
            )}

            {/* Edit - Hidden if customer has signed */}
            {!hasCustomerSignature && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onEdit}
              >
                <FileText className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}

            {/* Download PDF - Always visible */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownloadPDF()}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download'}
            </Button>

            {/* Duplicate - Always visible */}
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

            {/* Delete - Always visible */}
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
        defaultSignerName={userProfile?.full_name}
        onSuccess={() => window.location.reload()}
      />

      {/* Change Order Signature Dialog */}
      {pendingChangeOrder && (
        <ChangeOrderSignatureDialog
          open={changeOrderSignatureOpen}
          onOpenChange={setChangeOrderSignatureOpen}
          changeOrderId={pendingChangeOrder.id}
          changeOrderNumber={pendingChangeOrder.change_order_number}
          onSuccess={() => {
            console.log('Change order signature success - invalidating queries for quote:', quote.id)
            queryClient.invalidateQueries({ queryKey: ['quote-change-orders', quote.id] })
            queryClient.invalidateQueries({ queryKey: ['contract-comparison', quote.id] })
            queryClient.invalidateQueries({ queryKey: ['contract'] })  // Invalidate ALL contracts to refresh source of truth
            queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
            console.log('Queries invalidated')
          }}
        />
      )}

      {/* Change Order Builder Dialog */}
      {contract && (
        <ChangeOrderBuilder
          open={changeOrderBuilderOpen}
          onOpenChange={(open) => {
            setChangeOrderBuilderOpen(open)
            if (!open) setEditingChangeOrderId(null) // Reset editing state when closing
          }}
          leadId={quote.lead_id}
          quoteId={quote.id}
          contractId={contract.id}
          changeOrderId={editingChangeOrderId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['quote-change-orders', quote.id] })
            queryClient.invalidateQueries({ queryKey: ['lead-financials'] })
            setEditingChangeOrderId(null) // Reset editing state after success
          }}
        />
      )}
    </div>
  )
}
