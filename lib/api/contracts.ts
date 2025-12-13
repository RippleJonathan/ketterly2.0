import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'

export interface SignedContract {
  id: string
  company_id: string
  lead_id: string
  quote_id: string
  contract_number: string
  contract_date: string
  quote_snapshot: any
  original_subtotal: number
  original_tax: number
  original_discount: number
  original_total: number
  customer_signature_date: string | null
  customer_signature_data: string | null
  customer_signed_by: string | null
  customer_ip_address: string | null
  company_signature_date: string | null
  company_signature_data: string | null
  company_signed_by: string | null
  payment_terms: string | null
  notes: string | null
  status: 'active' | 'voided' | 'superseded'
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ContractLineItem {
  id: string
  contract_id: string
  category: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  cost_per_unit: number | null
  supplier: string | null
  sort_order: number
  created_at: string
}

export interface ContractWithLineItems extends SignedContract {
  line_items: ContractLineItem[]
}

export interface ContractComparison {
  contract: ContractWithLineItems
  current_quote: any
  has_changes: boolean
  total_change: number
  added_items: any[]
  removed_items: ContractLineItem[]
  modified_items: Array<{
    contract_item: ContractLineItem
    quote_item: any
    changes: string[]
  }>
}

/**
 * Get signed contract for a quote
 */
export async function getContractByQuoteId(
  quoteId: string
): Promise<ApiResponse<SignedContract>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('signed_contracts')
      .select('*')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch contract:', error)
    return createErrorResponse(error)
  }
}

/**
 * Get contract with line items
 */
export async function getContractWithLineItems(
  contractId: string
): Promise<ApiResponse<ContractWithLineItems>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('signed_contracts')
      .select(`
        *,
        line_items:contract_line_items(*)
      `)
      .eq('id', contractId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to fetch contract with line items:', error)
    return createErrorResponse(error)
  }
}

/**
 * Create contract snapshot from quote
 */
export async function createContractFromQuote(
  quoteId: string,
  signatureData?: {
    customer_signature_date?: string
    customer_signature_data?: string
    customer_signed_by?: string
    customer_ip_address?: string
    company_signature_date?: string
    company_signature_data?: string
    company_signed_by?: string
  }
): Promise<ApiResponse<string>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('create_contract_from_quote', {
      p_quote_id: quoteId,
      p_customer_signature_date: signatureData?.customer_signature_date || null,
      p_customer_signature_data: signatureData?.customer_signature_data || null,
      p_customer_signed_by: signatureData?.customer_signed_by || null,
      p_customer_ip_address: signatureData?.customer_ip_address || null,
      p_company_signature_date: signatureData?.company_signature_date || null,
      p_company_signature_data: signatureData?.company_signature_data || null,
      p_company_signed_by: signatureData?.company_signed_by || null,
    })

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to create contract:', error)
    return createErrorResponse(error)
  }
}

/**
 * Compare current quote to signed contract
 */
export async function compareQuoteToContract(
  quoteId: string
): Promise<ApiResponse<ContractComparison>> {
  try {
    const supabase = createClient()
    
    // Get contract - use maybeSingle() instead of single() to handle no results
    const { data: contracts, error: contractError } = await supabase
      .from('signed_contracts')
      .select(`
        *,
        line_items:contract_line_items(*)
      `)
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (contractError) throw contractError
    
    // If no contract exists, return null (no comparison needed)
    if (!contracts || contracts.length === 0) {
      return { data: null, error: null }
    }
    
    const contract = contracts[0]

    // Get current quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        line_items:quote_line_items(*)
      `)
      .eq('id', quoteId)
      .is('deleted_at', null)
      .single()

    if (quoteError) throw quoteError

    // Compare totals
    const has_changes = quote.total_amount !== contract.original_total
    const total_change = quote.total_amount - contract.original_total

    // Find added items (in quote but not in contract)
    const added_items = quote.line_items.filter((quoteItem: any) => {
      return !contract.line_items.some((contractItem: any) => 
        contractItem.description === quoteItem.description &&
        contractItem.quantity === quoteItem.quantity &&
        contractItem.unit_price === quoteItem.unit_price
      )
    })

    // Find removed items (in contract but not in quote)
    const removed_items = contract.line_items.filter((contractItem: any) => {
      return !quote.line_items.some((quoteItem: any) => 
        quoteItem.description === contractItem.description &&
        quoteItem.quantity === contractItem.quantity &&
        quoteItem.unit_price === contractItem.unit_price
      )
    })

    // Find modified items
    const modified_items: any[] = []
    contract.line_items.forEach((contractItem: any) => {
      const matchingQuoteItem = quote.line_items.find((quoteItem: any) =>
        quoteItem.description === contractItem.description
      )
      
      if (matchingQuoteItem) {
        const changes: string[] = []
        if (matchingQuoteItem.quantity !== contractItem.quantity) {
          changes.push(`Quantity: ${contractItem.quantity} → ${matchingQuoteItem.quantity}`)
        }
        if (matchingQuoteItem.unit_price !== contractItem.unit_price) {
          changes.push(`Price: $${contractItem.unit_price} → $${matchingQuoteItem.unit_price}`)
        }
        
        if (changes.length > 0) {
          modified_items.push({
            contract_item: contractItem,
            quote_item: matchingQuoteItem,
            changes
          })
        }
      }
    })

    const comparison: ContractComparison = {
      contract,
      current_quote: quote,
      has_changes,
      total_change,
      added_items,
      removed_items,
      modified_items
    }

    return { data: comparison, error: null }
  } catch (error: any) {
    console.error('Failed to compare quote to contract:', error)
    return createErrorResponse(error)
  }
}

/**
 * Void a contract
 */
export async function voidContract(
  contractId: string,
  voidedBy: string,
  reason: string
): Promise<ApiResponse<SignedContract>> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('signed_contracts')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        void_reason: reason
      })
      .eq('id', contractId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Failed to void contract:', error)
    return createErrorResponse(error)
  }
}
