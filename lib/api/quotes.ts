// Quote API functions for Ketterly CRM
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'

const supabase = createClient()
import {
  Quote,
  QuoteInsert,
  QuoteUpdate,
  QuoteLineItem,
  QuoteLineItemInsert,
  QuoteWithRelations,
  QuoteFilters,
  QuoteTotals,
  LineItemFormData,
} from '@/lib/types/quotes'

/**
 * Generate next quote number for a company
 */
export async function generateQuoteNumber(
  companyId: string
): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase.rpc('generate_quote_number', {
      p_company_id: companyId,
    })

    if (error) throw error
    return { data: data as string, error: null }
  } catch (error: any) {
    console.error('Failed to generate quote number:', error)
    const errorMessage = error?.message || 'Failed to generate quote number'
    return { data: null, error: errorMessage }
  }
}

/**
 * Calculate quote totals from line items
 */
export function calculateQuoteTotals(
  lineItems: LineItemFormData[],
  taxRate: number,
  discountAmount: number = 0
): QuoteTotals {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price
  }, 0)

  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const tax = discountedSubtotal * taxRate
  const total = discountedSubtotal + tax

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    discount: Number(discountAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
  }
}

/**
 * Get all quotes for a company with optional filters
 */
export async function getQuotes(
  companyId: string,
  filters?: QuoteFilters
): Promise<ApiResponse<QuoteWithRelations[]>> {
  try {
    let query = supabase
      .from('quotes')
      .select(
        `
        *,
        line_items:quote_line_items(
          *
        ),
        lead:leads!inner(
          id,
          full_name,
          email,
          phone,
          address,
          city,
          state,
          zip
        ),
        created_by_user:users!quotes_created_by_fkey(
          id,
          full_name,
          email
        )
      `
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.leadId) {
      query = query.eq('lead_id', filters.leadId)
    }

    if (filters?.search) {
      query = query.or(
        `option_label.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`
      )
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }

    const { data, error, count } = await query

    if (error) throw error

    // Sort line items by sort_order for each quote
    if (data) {
      data.forEach((quote: any) => {
        if (quote.line_items) {
          quote.line_items.sort((a: QuoteLineItem, b: QuoteLineItem) => a.sort_order - b.sort_order)
        }
      })
    }

    return { data: data as QuoteWithRelations[], error: null, count: count || undefined }
  } catch (error: any) {
    console.error('Failed to fetch quotes:', error)
    return { data: null, error: error.message || 'Failed to fetch quotes' }
  }
}

/**
 * Get a single quote by ID with all relations
 */
export async function getQuote(
  companyId: string,
  quoteId: string
): Promise<ApiResponse<QuoteWithRelations>> {
  try {
    // Fetch quote first without embedded relationships
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single()

    if (quoteError) throw quoteError

    // Fetch related data separately to avoid relationship ambiguity
    const [lineItemsResult, leadResult, signaturesResult, createdByResult] = await Promise.all([
      supabase.from('quote_line_items').select('*').eq('quote_id', quoteId).order('sort_order'),
      supabase.from('leads').select('id, full_name, email, phone, address, city, state, zip, service_type').eq('id', quote.lead_id).single(),
      supabase.from('quote_signatures').select('*').eq('quote_id', quoteId),
      supabase.from('users').select('id, full_name, email').eq('id', quote.created_by).maybeSingle()
    ])

    // Combine results
    const data = {
      ...quote,
      line_items: lineItemsResult.data || [],
      lead: leadResult.data,
      signature: signaturesResult.data || [],
      created_by_user: createdByResult.data
    }

    return { data: data as QuoteWithRelations, error: null }
  } catch (error: any) {
    console.error('Failed to fetch quote:', error)
    return { data: null, error: error.message || 'Failed to fetch quote' }
  }
}

/**
 * Create a new quote with line items
 */
export async function createQuote(
  companyId: string,
  leadId: string,
  quoteData: {
    option_label?: string
    tax_rate: number
    discount_amount: number
    payment_terms: string
    notes?: string
    valid_until: Date
    line_items: LineItemFormData[]
  },
  createdBy: string
): Promise<ApiResponse<QuoteWithRelations>> {
  try {
    // First, fetch the lead to get customer info or customer_id
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .single()

    if (leadError) throw leadError
    if (!lead) throw new Error('Lead not found')

    // Check if lead already has a customer, or create one
    let customerId = null
    
    // Check if there's already a customer created from this lead
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('created_from_lead_id', leadId)
      .eq('company_id', companyId)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create a new customer from lead data
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          company_id: companyId,
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          notes: lead.notes,
          created_from_lead_id: leadId,
        })
        .select('id')
        .single()

      if (customerError) throw customerError
      if (!newCustomer) throw new Error('Failed to create customer')
      
      customerId = newCustomer.id
    }

    // Generate quote number
    const quoteNumberResult = await generateQuoteNumber(companyId)
    if (!quoteNumberResult.data) {
      const errorMessage = typeof quoteNumberResult.error === 'string' 
        ? quoteNumberResult.error 
        : quoteNumberResult.error?.message || 'Failed to generate quote number'
      throw new Error(errorMessage)
    }

    // Calculate totals
    const totals = calculateQuoteTotals(
      quoteData.line_items,
      quoteData.tax_rate,
      quoteData.discount_amount
    )

    // Create quote
    const quoteInsert: QuoteInsert = {
      company_id: companyId,
      customer_id: customerId,
      lead_id: leadId,
      quote_number: quoteNumberResult.data,
      option_label: quoteData.option_label,
      tax_rate: quoteData.tax_rate,
      discount_amount: quoteData.discount_amount,
      payment_terms: quoteData.payment_terms,
      notes: quoteData.notes,
      valid_until: quoteData.valid_until.toISOString().split('T')[0],
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      total_amount: totals.total,
      created_by: createdBy,
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert(quoteInsert)
      .select()
      .single()

    if (quoteError) throw quoteError

    // Create line items
    const lineItemsInsert: QuoteLineItemInsert[] = quoteData.line_items.map(
      (item, index) => ({
        quote_id: quote.id,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier,
        notes: item.notes,
        sort_order: index,
      })
    )

    const { error: lineItemsError } = await supabase
      .from('quote_line_items')
      .insert(lineItemsInsert)

    if (lineItemsError) throw lineItemsError

    // Fetch the complete quote with relations
    const completeQuote = await getQuote(companyId, quote.id)
    return completeQuote
  } catch (error: any) {
    console.error('Failed to create quote:', error)
    return { data: null, error: error.message || 'Failed to create quote' }
  }
}

/**
 * Update an existing quote
 */
export async function updateQuote(
  companyId: string,
  quoteId: string,
  updates: QuoteUpdate
): Promise<ApiResponse<Quote>> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update quote:', error)
    return { data: null, error: error.message || 'Failed to update quote' }
  }
}

/**
 * Update quote line items (replaces all existing items)
 */
export async function updateQuoteLineItems(
  quoteId: string,
  lineItems: LineItemFormData[]
): Promise<ApiResponse<QuoteLineItem[]>> {
  try {
    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('quote_id', quoteId)

    if (deleteError) throw deleteError

    // Insert new line items
    const lineItemsInsert: QuoteLineItemInsert[] = lineItems.map((item, index) => ({
      quote_id: quoteId,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier,
      notes: item.notes,
      sort_order: index,
    }))

    const { data, error } = await supabase
      .from('quote_line_items')
      .insert(lineItemsInsert)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to update line items:', error)
    return { data: null, error: error.message || 'Failed to update line items' }
  }
}

/**
 * Duplicate a quote (creates a new version)
 */
export async function duplicateQuote(
  companyId: string,
  quoteId: string,
  createdBy: string
): Promise<ApiResponse<QuoteWithRelations>> {
  try {
    // Fetch original quote with line items
    const originalQuote = await getQuote(companyId, quoteId)
    if (!originalQuote.data) {
      const errorMessage = typeof originalQuote.error === 'string'
        ? originalQuote.error
        : originalQuote.error?.message || 'Quote not found'
      throw new Error(errorMessage)
    }

    const quote = originalQuote.data

    // Create new quote
    const quoteData = {
      option_label: quote.option_label ? quote.option_label + ' (Copy)' : '(Copy)',
      tax_rate: quote.tax_rate,
      discount_amount: quote.discount_amount,
      payment_terms: quote.payment_terms || '',
      notes: quote.notes || undefined,
      valid_until: new Date(quote.valid_until),
      line_items:
        quote.line_items?.map((item) => ({
          category: item.category as any,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_per_unit: item.cost_per_unit || undefined,
          supplier: item.supplier || undefined,
          notes: item.notes || undefined,
        })) || [],
    }

    return await createQuote(companyId, quote.lead_id!, quoteData, createdBy)
  } catch (error: any) {
    console.error('Failed to duplicate quote:', error)
    return { data: null, error: error.message || 'Failed to duplicate quote' }
  }
}

/**
 * Mark quote as sent
 */
export async function markQuoteAsSent(
  companyId: string,
  quoteId: string
): Promise<ApiResponse<Quote>> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to mark quote as sent:', error)
    return { data: null, error: error.message || 'Failed to update quote status' }
  }
}

/**
 * Accept a quote (changes status and triggers project creation)
 */
export async function acceptQuote(
  companyId: string,
  quoteId: string
): Promise<ApiResponse<Quote>> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error

    // The database trigger will automatically:
    // 1. Update lead status to 'won'
    // 2. Generate project_number on lead
    // 3. Create activity log entry

    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to accept quote:', error)
    return { data: null, error: error.message || 'Failed to accept quote' }
  }
}

/**
 * Decline a quote
 */
export async function declineQuote(
  companyId: string,
  quoteId: string
): Promise<ApiResponse<Quote>> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to decline quote:', error)
    return { data: null, error: error.message || 'Failed to decline quote' }
  }
}

/**
 * Soft delete a quote
 */
export async function deleteQuote(
  companyId: string,
  quoteId: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', quoteId)
      .eq('company_id', companyId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Failed to delete quote:', error)
    return { data: null, error: error.message || 'Failed to delete quote' }
  }
}

// =============================================
// QUOTE SHARING & SIGNATURES
// =============================================

/**
 * Generate a share token for a quote
 */
export async function generateQuoteShareToken(
  companyId: string,
  quoteId: string,
  expiresInDays: number = 30
): Promise<ApiResponse<{ token: string; expiresAt: string }>> {
  try {
    // Generate token using database function
    const { data: token, error: tokenError } = await supabase.rpc(
      'generate_quote_share_token'
    )

    if (tokenError) throw tokenError

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Update quote with share token
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        share_token: token,
        share_token_created_at: new Date().toISOString(),
        share_link_expires_at: expiresAt.toISOString(),
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('company_id', companyId)

    if (updateError) throw updateError

    return {
      data: {
        token: token as string,
        expiresAt: expiresAt.toISOString(),
      },
      error: null,
    }
  } catch (error: any) {
    console.error('Failed to generate share token:', error)
    return {
      data: null,
      error: error.message || 'Failed to generate share token',
    }
  }
}

/**
 * Get quote by share token (public access)
 */
export async function getQuoteByShareToken(
  token: string
): Promise<ApiResponse<QuoteWithRelations>> {
  try {
    const response = await fetch(`/api/public/quote/${token}`)
    const result = await response.json()

    if (!response.ok) {
      return {
        data: null,
        error: result.error || 'Failed to load quote',
      }
    }

    return { data: result.quote, error: null }
  } catch (error: any) {
    console.error('Failed to get quote by token:', error)
    return {
      data: null,
      error: error.message || 'Failed to load quote',
    }
  }
}

/**
 * Track customer view details (IP, user agent)
 */
export async function trackQuoteView(
  quoteId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        customer_ip_address: ipAddress || null,
        customer_user_agent: userAgent || null,
      })
      .eq('id', quoteId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    console.error('Failed to track quote view:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Create a quote signature (customer acceptance)
 */
export async function createQuoteSignature(
  quoteId: string,
  companyId: string,
  signatureData: {
    signer_name: string
    signer_email: string
    signature_data: string // base64 image
    accepted_terms: boolean
    terms_version?: string
    signer_ip_address?: string
    signer_user_agent?: string
    share_token?: string // Share token for server-side validation
  }
): Promise<ApiResponse<{ signature_id: string }>> {
  try {
    // Use Next.js API route (server-side validation of share token & company)
    const response = await fetch('/api/quotes/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Explicitly omit credentials so browser cookies don't force authenticated context
      credentials: 'omit',
      body: JSON.stringify({
        quote_id: quoteId,
        company_id: companyId,
        // Include nothing else trust-sensitive; server will re-derive company_id
        ...signatureData,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { data: { signature_id: data.signature_id }, error: null }
  } catch (error: any) {
    console.error('Failed to create quote signature:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return {
      data: null,
      error: error.message || 'Failed to create signature',
    }
  }
}

/**
 * Get signature for a quote
 */
export async function getQuoteSignature(
  quoteId: string
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('quote_signatures')
      .select('*')
      .eq('quote_id', quoteId)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to get quote signature:', error)
    return { data: null, error: error.message }
  }
}

