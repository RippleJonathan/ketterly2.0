/**
 * Dynamic Pricing Slide Renderer
 * Shows actual quote line items and totals
 */

'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface DynamicPricingSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category?: string
  notes?: string
  sort_order: number
}

export function DynamicPricingSlide({
  slide,
  deck,
}: DynamicPricingSlideProps) {
  const content = slide.content as {
    title?: string
    subtitle?: string
  }

  if (!deck.estimates || deck.estimates.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 bg-gray-900">
        <p className="text-white text-xl">No pricing information available</p>
      </div>
    )
  }

  // Dynamic title/subtitle based on number of estimates
  const hasMultipleEstimates = deck.estimates.length > 1
  const defaultTitle = hasMultipleEstimates 
    ? 'Choose Your Perfect Solution'
    : 'Investment Breakdown'
  const defaultSubtitle = hasMultipleEstimates
    ? 'Select the option that best fits your needs'
    : 'Detailed breakdown of your project investment'

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Calculate monthly payment for financing
  const calculateMonthlyPayment = (principal: number, annualRate: number, months: number) => {
    if (annualRate === 0) {
      return principal / months
    }
    const monthlyRate = annualRate / 100 / 12
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    return payment
  }

  // Check if any financing options are enabled
  const hasFinancingOptions = deck.company_financing_option_1_enabled || 
                               deck.company_financing_option_2_enabled || 
                               deck.company_financing_option_3_enabled

  // Render financing options for a specific estimate
  const renderFinancingOptions = (estimate: any) => {
    if (!hasFinancingOptions) return null

    return (
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-lg p-6 border-2 border-blue-400/30">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">💳 Flexible Financing Available</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {deck.company_financing_option_1_enabled && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-white/70 text-sm font-medium mb-2">{deck.company_financing_option_1_name}</div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${calculateMonthlyPayment(estimate.total, deck.company_financing_option_1_apr || 0, deck.company_financing_option_1_months || 60).toFixed(2)}<span className="text-lg">/mo</span>
              </div>
              <div className="text-white/60 text-sm">
                {deck.company_financing_option_1_months} months @ {deck.company_financing_option_1_apr}% APR
              </div>
            </div>
          )}
          {deck.company_financing_option_2_enabled && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-white/70 text-sm font-medium mb-2">{deck.company_financing_option_2_name}</div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${calculateMonthlyPayment(estimate.total, deck.company_financing_option_2_apr || 0, deck.company_financing_option_2_months || 120).toFixed(2)}<span className="text-lg">/mo</span>
              </div>
              <div className="text-white/60 text-sm">
                {deck.company_financing_option_2_months} months @ {deck.company_financing_option_2_apr}% APR
              </div>
            </div>
          )}
          {deck.company_financing_option_3_enabled && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="text-white/70 text-sm font-medium mb-2">{deck.company_financing_option_3_name}</div>
              <div className="text-3xl font-bold text-green-400 mb-2">
                ${calculateMonthlyPayment(estimate.total, deck.company_financing_option_3_apr || 0, deck.company_financing_option_3_months || 12).toFixed(2)}<span className="text-lg">/mo</span>
              </div>
              <div className="text-white/60 text-sm">
                {deck.company_financing_option_3_months} months @ {deck.company_financing_option_3_apr}% APR
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-white/50 text-sm mt-4 italic">*W.A.C. (With Approved Credit) - Subject to credit approval</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="min-h-full flex items-center justify-center p-12">
        <div className="max-w-5xl w-full space-y-8 py-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-white">
              {content.title || defaultTitle}
            </h1>
            {(content.subtitle || defaultSubtitle) && (
              <p className="text-xl text-white/70">{content.subtitle || defaultSubtitle}</p>
            )}
          </div>

          {/* Render each estimate with its own line items, totals, and financing */}
          {deck.estimates.map((estimate, index) => {
            const lineItems = (estimate.line_items || []) as LineItem[]
            
            return (
              <div key={estimate.id} className="space-y-6">
                {/* Quote Label (only show if multiple quotes) */}
                {hasMultipleEstimates && (
                  <div className="text-center">
                    <div className="inline-block bg-blue-600/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-blue-400/30">
                      <p className="text-2xl font-bold text-white">Quote #{estimate.quote_number}</p>
                    </div>
                  </div>
                )}

                {/* Single quote number for single estimate */}
                {!hasMultipleEstimates && (
                  <p className="text-lg text-white/60 text-center">Quote #{estimate.quote_number}</p>
                )}

                {/* Line Items Table */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-6 py-4 text-white/70 font-semibold">Description</th>
                        <th className="text-center px-6 py-4 text-white/70 font-semibold">Qty</th>
                        <th className="text-right px-6 py-4 text-white/70 font-semibold">Unit Price</th>
                        <th className="text-right px-6 py-4 text-white/70 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-white">
                            <div className="font-medium">{item.description}</div>
                            {item.category && (
                              <div className="text-sm text-white/60 mt-1">{item.category}</div>
                            )}
                            {item.notes && (
                              <div className="text-sm text-white/50 mt-2 whitespace-pre-line leading-relaxed">
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-white">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-white/90">{formatCurrency(item.unit_price)}</td>
                          <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 space-y-3">
                  <div className="flex justify-between items-center text-white/80">
                    <span className="text-lg">Subtotal</span>
                    <span className="text-xl font-medium">{formatCurrency(estimate.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span className="text-lg">Tax</span>
                    <span className="text-xl font-medium">{formatCurrency(estimate.tax)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-2xl font-bold">Total Investment</span>
                      <span className="text-3xl font-bold">{formatCurrency(estimate.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Financing Options for this estimate */}
                {renderFinancingOptions(estimate)}

                {/* Divider between quotes (only if multiple) */}
                {hasMultipleEstimates && index < deck.estimates.length - 1 && (
                  <div className="border-t-2 border-white/20 my-12"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
