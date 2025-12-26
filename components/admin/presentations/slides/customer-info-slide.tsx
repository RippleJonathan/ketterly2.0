/**
 * Customer Info Slide Renderer
 * Displays customer information with dynamic data injection
 */

'use client'

import { MapPin, Mail, Phone, Home } from 'lucide-react'
import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface CustomerInfoSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

export function CustomerInfoSlide({ slide, deck }: CustomerInfoSlideProps) {
  const content = slide.content as {
    title?: string
    show_name?: boolean
    show_address?: boolean
    show_contact?: boolean
    show_property_details?: boolean
  }

  const customer = deck.customer_data

  return (
    <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-blue-900 to-blue-700">
      <div className="max-w-3xl w-full space-y-8">
        <h1 className="text-5xl font-bold text-white text-center mb-12">
          {content.title || 'Your Project Details'}
        </h1>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 space-y-6">
          {/* Customer Name */}
          {content.show_name && customer?.full_name && (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-white/60 uppercase tracking-wide">Homeowner</div>
                <div className="text-2xl font-semibold text-white">{customer.full_name}</div>
              </div>
            </div>
          )}

          {/* Address */}
          {content.show_address && customer?.service_address && (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-white/60 uppercase tracking-wide">Service Address</div>
                <div className="text-xl text-white">{customer.service_address}</div>
                {customer.service_city && customer.service_state && customer.service_zip && (
                  <div className="text-lg text-white/80">
                    {customer.service_city}, {customer.service_state} {customer.service_zip}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {content.show_contact && (
            <div className="grid grid-cols-2 gap-4">
              {customer?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-white/60" />
                  <div className="text-white">{customer.email}</div>
                </div>
              )}
              {customer?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-white/60" />
                  <div className="text-white">{customer.phone}</div>
                </div>
              )}
            </div>
          )}

          {/* Property Details */}
          {content.show_property_details && customer?.property_type && (
            <div className="border-t border-white/20 pt-6 mt-6">
              <div className="text-sm text-white/60 uppercase tracking-wide mb-3">Property Details</div>
              <div className="grid grid-cols-2 gap-4 text-white">
                {customer.property_type && (
                  <div>
                    <span className="text-white/60">Type:</span> {customer.property_type}
                  </div>
                )}
                {customer.square_footage && (
                  <div>
                    <span className="text-white/60">Square Footage:</span> {customer.square_footage.toLocaleString()} sq ft
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
