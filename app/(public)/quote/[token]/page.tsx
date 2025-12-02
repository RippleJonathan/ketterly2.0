'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface QuoteData {
  id: string
  quote_number: string
  title: string
  description: string | null
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_terms: string | null
  option_label: string | null
  quote_line_items: Array<{
    id: string
    description: string
    category: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
  }>
  leads: {
    full_name: string
    email: string
    phone: string
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  companies: {
    name: string
    logo_url: string | null
    primary_color: string
    contact_email: string | null
    contact_phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    contract_terms: string | null
  }
  quote_signatures: Array<{
    signer_type: 'customer' | 'company_rep'
    signer_name: string
    signer_title: string | null
    signature_data: string
    signed_at: string
  }>
}

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/public/quote/${token}`)
        
        if (!response.ok) {
          setError('Quote not found or link has expired')
          setLoading(false)
          return
        }
        
        const { data } = await response.json()
        
        if (!data) {
          setError('Invalid quote data')
          setLoading(false)
          return
        }

        setQuote(data)

        // Fetch logo if available
        if (data.companies?.logo_url) {
          try {
            const logoResponse = await fetch(`/api/quotes/${data.id}/logo?token=${token}`)
            if (logoResponse.ok) {
              const { logo } = await logoResponse.json()
              if (logo) setLogoBase64(logo)
            }
          } catch (err) {
            console.warn('Failed to fetch logo:', err)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch quote:', err)
        setError('Failed to load quote')
        setLoading(false)
      }
    }
    
    fetchQuote()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Not Available</h2>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const company = quote.companies
  const lead = quote.leads
  const lineItems = quote.quote_line_items || []
  const customerSignature = quote.quote_signatures?.find(s => s.signer_type === 'customer')
  const companySignature = quote.quote_signatures?.find(s => s.signer_type === 'company_rep')

  // Replace placeholders in contract terms
  let contractTerms = company?.contract_terms || ''
  if (contractTerms && company) {
    contractTerms = contractTerms
      .replace(/\[Company Name\]/g, company.name || '[Company Name]')
      .replace(/\[Company Address\]/g, company.address || '[Company Address]')
      .replace(/\[Company Email\]/g, company.contact_email || '[Company Email]')
  }

  // Default color if company data not available
  const primaryColor = company?.primary_color || '#2563eb'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Quote Document */}
        <div className="bg-white shadow-lg rounded-lg p-8 md:p-12 print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-4" style={{ borderColor: primaryColor }}>
            <div>
              {logoBase64 && (
                <img src={logoBase64} alt={company?.name || 'Company'} className="h-16 mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }}>
                {company?.name || 'Company Name'}
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                {company?.address && <div>{company.address}</div>}
                {company?.city && <div>{company.city}, {company.state} {company.zip}</div>}
                {company?.contact_email && <div>{company.contact_email}</div>}
                {company?.contact_phone && <div>{company.contact_phone}</div>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">QUOTE</h2>
              <div className="text-lg text-gray-600 mb-2">#{quote.quote_number}</div>
              {quote.option_label && (
                <div className="text-sm text-gray-500">{quote.option_label}</div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border-l-4" style={{ borderColor: primaryColor }}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Customer Information
              </h3>
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">{lead?.full_name || 'Customer'}</div>
                {lead?.email && <div className="text-sm text-gray-600">{lead.email}</div>}
                {lead?.phone && <div className="text-sm text-gray-600">{lead.phone}</div>}
                {lead?.address && <div className="text-sm text-gray-600">{lead.address}</div>}
                {lead?.city && <div className="text-sm text-gray-600">{lead.city}, {lead.state} {lead.zip}</div>}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Quote Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{item.description}</div>
                        <div className="text-xs text-gray-500">{item.category}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">
                        ${item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-80 bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({(quote.tax_rate * 100).toFixed(2)}%)</span>
                    <span className="font-medium">${quote.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {quote.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-green-600">-${quote.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-3 border-t-2" style={{ borderColor: primaryColor }}>
                  <span>Total</span>
                  <span>${quote.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          {(quote.payment_terms || contractTerms) && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Terms & Conditions
              </h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-sm text-yellow-900 whitespace-pre-wrap">
                {quote.payment_terms && (
                  <div className="mb-4">
                    <strong className="block mb-2">Payment Terms:</strong>
                    {quote.payment_terms}
                  </div>
                )}
                {contractTerms && (
                  <div>
                    <strong className="block mb-2">Contract Terms:</strong>
                    {contractTerms}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          {(customerSignature || companySignature) && (
            <div className="mb-8 bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-800 text-center mb-6">
                {customerSignature && companySignature ? ' Fully Executed' : ' Partially Signed'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Customer Signature</h4>
                  {customerSignature ? (
                    <>
                      <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-2">
                        <img 
                          src={customerSignature.signature_data} 
                          alt="Customer Signature" 
                          className="max-w-xs mx-auto h-20"
                        />
                      </div>
                      <div className="text-sm font-medium text-gray-900">{customerSignature.signer_name}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(customerSignature.signed_at).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Pending</div>
                  )}
                </div>

                <div className="text-center">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Company Representative</h4>
                  {companySignature ? (
                    <>
                      <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-2">
                        <img 
                          src={companySignature.signature_data} 
                          alt="Company Signature" 
                          className="max-w-xs mx-auto h-20"
                        />
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {companySignature.signer_name}
                        {companySignature.signer_title && ` (${companySignature.signer_title})`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(companySignature.signed_at).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Pending</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* E-Sign Button */}
          {!customerSignature && quote.status !== 'expired' && quote.status !== 'declined' && (
            <div className="mt-8 print:hidden">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold text-blue-900 mb-2">
                  Ready to Accept This Quote?
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Click below to electronically sign and accept this quote
                </p>
                <button
                  onClick={() => {
                    alert('E-sign functionality coming soon!')
                  }}
                  className="px-8 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  Sign & Accept Quote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}