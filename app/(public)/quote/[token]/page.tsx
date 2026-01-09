'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, X, RotateCcw } from 'lucide-react'
import { SignaturePad } from '@/components/ui/signature-pad'

interface LineItem {
  id: string
  description: string
  category: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  notes?: string
}

interface Lead {
  full_name: string
  email: string
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface Company {
  id: string
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
  replacement_warranty_years?: number
  repair_warranty_years?: number
  license_number?: string | null
  financing_option_1_name?: string
  financing_option_1_months?: number
  financing_option_1_apr?: number
  financing_option_1_enabled?: boolean
  financing_option_2_name?: string
  financing_option_2_months?: number
  financing_option_2_apr?: number
  financing_option_2_enabled?: boolean
  financing_option_3_name?: string
  financing_option_3_months?: number
  financing_option_3_apr?: number
  financing_option_3_enabled?: boolean
}

interface Signature {
  signer_type: 'customer' | 'company_rep'
  signer_name: string
  signer_title: string | null
  signature_data: string
  signed_at: string
}

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
  valid_until: string | null
  // API returns these property names
  line_items?: LineItem[]
  lead?: Lead
  company?: Company
  signature?: Signature[]
  creator?: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
  // Legacy property names (for backwards compatibility)
  quote_line_items?: LineItem[]
  leads?: Lead
  companies?: Company
  quote_signatures?: Signature[]
}

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // E-sign modal state
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  // Company signature modal state
  const [showCompanySignModal, setShowCompanySignModal] = useState(false)
  const [companySignerName, setCompanySignerName] = useState('')
  const [companySignerEmail, setCompanySignerEmail] = useState('')
  const [companyAcceptedTerms, setCompanyAcceptedTerms] = useState(false)
  const [companySignatureDataUrl, setCompanySignatureDataUrl] = useState<string | null>(null)
  const [companySignError, setCompanySignError] = useState<string | null>(null)
  const [companySigning, setCompanySigning] = useState(false)

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

        // Fetch logo if available (API returns 'company' not 'companies')
        const companyData = data.company || data.companies
        if (companyData?.logo_url) {
          try {
            // If logo_url is a Supabase storage URL, fetch it directly
            if (companyData.logo_url.startsWith('http')) {
              const logoResponse = await fetch(companyData.logo_url)
              if (logoResponse.ok) {
                const blob = await logoResponse.blob()
                const reader = new FileReader()
                reader.onload = () => {
                  setLogoBase64(reader.result as string)
                }
                reader.readAsDataURL(blob)
              }
            } else {
              // If it's already base64, use it directly
              setLogoBase64(companyData.logo_url)
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

  // Normalize data - API returns 'line_items', 'lead', 'company', 'signature'
  // but we also support legacy names for backwards compatibility
  const company = quote.company || quote.companies
  const lead = quote.lead || quote.leads
  const location = (lead as any)?.location || null // Location relation if available
  const lineItems = quote.line_items || quote.quote_line_items || []
  const signatures = quote.signature || quote.quote_signatures || []
  const customerSignature = signatures.find(s => s.signer_type === 'customer')
  const companySignature = signatures.find(s => s.signer_type === 'company_rep')
  const creator = quote.creator // Creator information from the API

  // Use location data if available, otherwise fallback to company data
  const displayName = location?.name || company?.name || 'Company Name'
  const displayAddress = location?.address || company?.address
  const displayCity = location?.city || company?.city
  const displayState = location?.state || company?.state
  const displayZip = location?.zip || company?.zip
  const displayPhone = location?.phone || company?.contact_phone
  const displayEmail = location?.email || company?.contact_email

  // Replace placeholders in contract terms
  let contractTerms = company?.contract_terms || ''
  if (contractTerms && company) {
    contractTerms = contractTerms
      .replace(/\[Company Name\]/g, company.name || '[Company Name]')
      .replace(/\[Company Address\]/g, company.address || '[Company Address]')
      .replace(/\[Company Email\]/g, company.contact_email || '[Company Email]')
      .replace(/\[Replacement Warranty\]/g, company.replacement_warranty_years?.toString() || '10')
      .replace(/\[Repair Warranty\]/g, company.repair_warranty_years?.toString() || '1')
  }

  // Default color if company data not available
  const primaryColor = company?.primary_color || '#2563eb'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Floating Sign Button - Similar to DocuSign */}
        {quote.status !== 'expired' && quote.status !== 'declined' && (!customerSignature || !companySignature) && (
          <div className="fixed top-4 right-4 z-40 print:hidden">
            <button
              onClick={() => {
                const signatureSection = document.getElementById('signature-section')
                if (signatureSection) {
                  signatureSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  })
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Sign Document
            </button>
          </div>
        )}

        {/* Close/Return Button - For PWA/Mobile users */}
        <div className="fixed top-4 left-4 z-40 print:hidden">
          <button
            onClick={() => window.close()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
            title="Close this window and return"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close & Return
          </button>
        </div>

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
              {location && (
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  {location.name}
                </div>
              )}
              <div className="text-sm text-gray-600 space-y-1">
                {displayAddress && <div>{displayAddress}</div>}
                {displayCity && <div>{displayCity}, {displayState} {displayZip}</div>}
                {displayEmail && <div>{displayEmail}</div>}
                {displayPhone && <div>{displayPhone}</div>}
                {company?.license_number && <div className="font-medium">License: {company.license_number}</div>}
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

          {/* Customer and Rep Information */}
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

            <div className="bg-gray-50 p-4 rounded-lg border-l-4" style={{ borderColor: primaryColor }}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Sales Representative
              </h3>
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">{creator?.full_name || 'Sales Rep'}</div>
                {creator?.email && <div className="text-sm text-gray-600">{creator.email}</div>}
                {creator?.phone && <div className="text-sm text-gray-600">{creator.phone}</div>}
                <div className="text-sm text-gray-600">{company?.name || 'Company'}</div>
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
                        {item.notes && (
                          <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{item.notes}</div>
                        )}
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

          {/* Financing Options */}
          {company && (company.financing_option_1_enabled || company.financing_option_2_enabled || company.financing_option_3_enabled) && (
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4 text-center">
                💳 Flexible Financing Available
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {company.financing_option_1_enabled && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                    <div className="text-sm font-medium text-gray-600 mb-2">{company.financing_option_1_name}</div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ${(() => {
                        const apr = company.financing_option_1_apr || 0
                        const months = company.financing_option_1_months || 60
                        const principal = quote.total_amount
                        if (apr === 0) return (principal / months).toFixed(2)
                        const monthlyRate = apr / 100 / 12
                        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
                        return payment.toFixed(2)
                      })()}<span className="text-lg">/mo</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.financing_option_1_months} months @ {company.financing_option_1_apr}% APR
                    </div>
                  </div>
                )}
                {company.financing_option_2_enabled && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                    <div className="text-sm font-medium text-gray-600 mb-2">{company.financing_option_2_name}</div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ${(() => {
                        const apr = company.financing_option_2_apr || 0
                        const months = company.financing_option_2_months || 120
                        const principal = quote.total_amount
                        if (apr === 0) return (principal / months).toFixed(2)
                        const monthlyRate = apr / 100 / 12
                        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
                        return payment.toFixed(2)
                      })()}<span className="text-lg">/mo</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.financing_option_2_months} months @ {company.financing_option_2_apr}% APR
                    </div>
                  </div>
                )}
                {company.financing_option_3_enabled && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                    <div className="text-sm font-medium text-gray-600 mb-2">{company.financing_option_3_name}</div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ${(() => {
                        const apr = company.financing_option_3_apr || 0
                        const months = company.financing_option_3_months || 12
                        const principal = quote.total_amount
                        if (apr === 0) return (principal / months).toFixed(2)
                        const monthlyRate = apr / 100 / 12
                        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
                        return payment.toFixed(2)
                      })()}<span className="text-lg">/mo</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.financing_option_3_months} months @ {company.financing_option_3_apr}% APR
                    </div>
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-gray-500 mt-4 italic">
                *W.A.C. (With Approved Credit) - Financing subject to credit approval. Contact us for details.
              </p>
            </div>
          )}

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

          {/* E-Sign Buttons */}
          {quote.status !== 'expired' && quote.status !== 'declined' && (
            <div id="signature-section" className="mt-8 print:hidden space-y-4">
              {/* Customer Sign Button */}
              {!customerSignature && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    Ready to Accept This Quote?
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Click below to electronically sign and accept this quote
                  </p>
                  <button
                    onClick={() => {
                      // Pre-fill email from lead data if available
                      if (lead?.email && !signerEmail) {
                        setSignerEmail(lead.email)
                      }
                      if (lead?.full_name && !signerName) {
                        setSignerName(lead.full_name)
                      }
                      setShowSignModal(true)
                    }}
                    className="px-8 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Sign & Accept Quote (Customer)
                  </button>
                </div>
              )}

              {/* Company Sign Button */}
              {!companySignature && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    Company Representative Signature
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    Sign as company representative to authorize this quote
                  </p>
                  <button
                    onClick={() => {
                      // Pre-fill name and email from creator if available
                      if (creator?.full_name && !companySignerName) {
                        setCompanySignerName(creator.full_name)
                      }
                      if (creator?.email && !companySignerEmail) {
                        setCompanySignerEmail(creator.email)
                      }
                      setShowCompanySignModal(true)
                    }}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Sign as Company Rep
                  </button>
                </div>
              )}
            </div>
          )}

          {/* E-Sign Modal */}
          {showSignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Sign & Accept Quote</h3>
                  <button
                    onClick={() => {
                      setShowSignModal(false)
                      setSignatureDataUrl(null)
                      setSignError(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Quote Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Quote #{quote.quote_number}</div>
                    <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                      ${quote.total_amount.toFixed(2)}
                    </div>
                    {quote.option_label && (
                      <div className="text-sm text-gray-500 mt-1">{quote.option_label}</div>
                    )}
                  </div>

                  {/* Signer Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={signerEmail}
                          onChange={(e) => setSignerEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signature Pad */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Signature</h4>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                      <SignaturePad
                        width={500}
                        height={150}
                        onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                        onCancel={() => setSignatureDataUrl(null)}
                      />
                    </div>
                    {signatureDataUrl && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Signature captured
                      </div>
                    )}
                  </div>

                  {/* Terms Acceptance */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        I have read and agree to the terms and conditions outlined in this quote. 
                        By signing, I authorize {company?.name || 'the company'} to proceed with the work as described 
                        and agree to the payment terms specified.
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {signError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {signError}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowSignModal(false)
                      setSignatureDataUrl(null)
                      setSignError(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setSignError(null)
                      
                      // Validate inputs
                      if (!signerName.trim()) {
                        setSignError('Please enter your full name')
                        return
                      }
                      if (!signerEmail.trim()) {
                        setSignError('Please enter your email address')
                        return
                      }
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
                        setSignError('Please enter a valid email address')
                        return
                      }
                      if (!signatureDataUrl) {
                        setSignError('Please draw your signature above')
                        return
                      }
                      if (!acceptedTerms) {
                        setSignError('You must accept the terms and conditions to proceed')
                        return
                      }

                      try {
                        setSigning(true)
                        
                        const response = await fetch('/api/quotes/sign-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            quote_id: quote.id,
                            share_token: token,
                            signer_name: signerName.trim(),
                            signer_email: signerEmail.trim(),
                            signature_data: signatureDataUrl,
                            accepted_terms: true,
                            signer_type: 'customer',
                            signer_user_agent: navigator.userAgent,
                          }),
                        })

                        const result = await response.json()
                        
                        if (!response.ok) {
                          setSignError(result.error || 'Failed to submit signature')
                          setSigning(false)
                          return
                        }

                        // Refresh quote data to show signature
                        const refreshResponse = await fetch(`/api/public/quote/${token}`)
                        if (refreshResponse.ok) {
                          const { data } = await refreshResponse.json()
                          if (data) setQuote(data)
                        }

                        setSigning(false)
                        setShowSignModal(false)
                        setSignatureDataUrl(null)
                        setAcceptedTerms(false)
                        
                      } catch (err: any) {
                        console.error('Signature submission error:', err)
                        setSignError(err?.message || 'An error occurred while submitting your signature')
                        setSigning(false)
                      }
                    }}
                    disabled={signing}
                    className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {signing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      'Submit Signature'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Company Signature Modal */}
          {showCompanySignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Company Representative Signature</h3>
                  <button
                    onClick={() => {
                      setShowCompanySignModal(false)
                      setCompanySignatureDataUrl(null)
                      setCompanySignError(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Quote Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Quote #{quote.quote_number}</div>
                    <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                      ${quote.total_amount.toFixed(2)}
                    </div>
                    {quote.option_label && (
                      <div className="text-sm text-gray-500 mt-1">{quote.option_label}</div>
                    )}
                  </div>

                  {/* Signer Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={companySignerName}
                          onChange={(e) => setCompanySignerName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={companySignerEmail}
                          onChange={(e) => setCompanySignerEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signature Pad */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Signature</h4>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                      <SignaturePad
                        width={500}
                        height={150}
                        onSave={(dataUrl) => setCompanySignatureDataUrl(dataUrl)}
                        onCancel={() => setCompanySignatureDataUrl(null)}
                      />
                    </div>
                    {companySignatureDataUrl && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Signature captured
                      </div>
                    )}
                  </div>

                  {/* Terms Acceptance */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={companyAcceptedTerms}
                        onChange={(e) => setCompanyAcceptedTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">
                        I have read and agree to the terms and conditions outlined in this quote. 
                        By signing, I authorize {company?.name || 'the company'} to proceed with the work as described 
                        and confirm that I have the authority to bind the company to this agreement.
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {companySignError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {companySignError}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCompanySignModal(false)
                      setCompanySignatureDataUrl(null)
                      setCompanySignError(null)
                      setCompanyAcceptedTerms(false)
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setCompanySignError(null)
                      
                      // Validate inputs
                      if (!companySignerName.trim()) {
                        setCompanySignError('Please enter your full name')
                        return
                      }
                      if (!companySignerEmail.trim()) {
                        setCompanySignError('Please enter your email address')
                        return
                      }
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companySignerEmail)) {
                        setCompanySignError('Please enter a valid email address')
                        return
                      }
                      if (!companySignatureDataUrl) {
                        setCompanySignError('Please draw your signature above')
                        return
                      }
                      if (!companyAcceptedTerms) {
                        setCompanySignError('You must accept the terms and conditions to proceed')
                        return
                      }

                      try {
                        setCompanySigning(true)
                        
                        const response = await fetch('/api/quotes/sign-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            quote_id: quote.id,
                            share_token: token,
                            signer_name: companySignerName.trim(),
                            signer_email: companySignerEmail.trim(),
                            signature_data: companySignatureDataUrl,
                            accepted_terms: true,
                            signer_type: 'company_rep',
                            signer_user_agent: navigator.userAgent,
                          }),
                        })

                        const result = await response.json()
                        
                        if (!response.ok) {
                          setCompanySignError(result.error || 'Failed to submit signature')
                          setCompanySigning(false)
                          return
                        }

                        // Refresh quote data to show signature
                        const refreshResponse = await fetch(`/api/public/quote/${token}`)
                        if (refreshResponse.ok) {
                          const { data } = await refreshResponse.json()
                          if (data) setQuote(data)
                        }

                        setCompanySigning(false)
                        setShowCompanySignModal(false)
                        setCompanySignatureDataUrl(null)
                        setCompanyAcceptedTerms(false)
                        
                      } catch (err: any) {
                        console.error('Company signature submission error:', err)
                        setCompanySignError(err?.message || 'An error occurred while submitting your signature')
                        setCompanySigning(false)
                      }
                    }}
                    disabled={companySigning}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {companySigning ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      'Submit Signature'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}