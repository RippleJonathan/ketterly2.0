/**
 * Company Info Slide Renderer
 * Displays company branding and information
 */

'use client'

import { Mail, Phone, MapPin, Globe } from 'lucide-react'
import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface CompanyInfoSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

export function CompanyInfoSlide({ slide, deck }: CompanyInfoSlideProps) {
  const content = slide.content as {
    title?: string
    show_logo?: boolean
    show_tagline?: boolean
    show_contact?: boolean
    tagline?: string
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center p-12"
      style={{ backgroundColor: deck.company_primary_color || '#1e40af' }}
    >
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Company Logo */}
        {content.show_logo && deck.company_logo_url && (
          <div className="flex justify-center mb-8">
            <img
              src={deck.company_logo_url}
              alt={deck.company_name}
              className="h-32 object-contain"
            />
          </div>
        )}

        {/* Company Name */}
        <h1 className="text-6xl font-bold text-white">
          {deck.company_name}
        </h1>

        {/* Tagline */}
        {content.show_tagline && content.tagline && (
          <p className="text-2xl text-white/90 italic">
            "{content.tagline}"
          </p>
        )}

        {/* Title */}
        {content.title && (
          <h2 className="text-3xl font-semibold text-white mt-12">
            {content.title}
          </h2>
        )}

        {/* Contact Information - Always show if any info exists */}
        {(content.show_contact || deck.company_phone || deck.company_email || deck.company_address || deck.company_license_number) && (
          <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
              {deck.company_phone && (
                <div className="flex items-center justify-center gap-3">
                  <Phone className="h-5 w-5" />
                  <span className="text-lg">{deck.company_phone}</span>
                </div>
              )}
              {deck.company_email && (
                <div className="flex items-center justify-center gap-3">
                  <Mail className="h-5 w-5" />
                  <span className="text-lg">{deck.company_email}</span>
                </div>
              )}
              {deck.company_address && (
                <div className="flex items-center justify-center gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{deck.company_address}</span>
                </div>
              )}
              {deck.company_license_number && (
                <div className="flex items-center justify-center gap-3 md:col-span-2">
                  <Globe className="h-5 w-5" />
                  <span className="text-lg">License: {deck.company_license_number}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
