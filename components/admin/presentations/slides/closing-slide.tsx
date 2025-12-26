/**
 * Closing Slide Renderer
 * Final slide with call-to-action and transition to signing
 */

'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle, FileSignature } from 'lucide-react'
import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface ClosingSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
  onComplete?: () => void
}

export function ClosingSlide({ slide, deck, onComplete }: ClosingSlideProps) {
  const content = slide.content as {
    title?: string
    message?: string
    cta_text?: string
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center p-12"
      style={{
        background: `linear-gradient(135deg, ${deck.company_primary_color || '#1e40af'} 0%, ${deck.company_primary_color ? `${deck.company_primary_color}dd` : '#1e3a8a'} 100%)`,
      }}
    >
      <div className="max-w-3xl text-center space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-6xl font-bold text-white">
          {content.title || "Let's Get Started!"}
        </h1>

        {/* Message */}
        {content.message && (
          <p className="text-2xl text-white/90 leading-relaxed">
            {content.message}
          </p>
        )}

        {/* Default Message */}
        {!content.message && (
          <p className="text-2xl text-white/90 leading-relaxed">
            Thank you for choosing {deck.company_name}. We're ready to begin your project.
          </p>
        )}

        {/* CTA Button */}
        <div className="pt-8">
          <Button
            size="lg"
            className="bg-white text-gray-900 hover:bg-white/90 text-xl px-12 py-6 h-auto"
            onClick={onComplete}
          >
            <FileSignature className="h-6 w-6 mr-3" />
            {content.cta_text || 'Proceed to Contract Signing'}
          </Button>
        </div>

        {/* Company Branding */}
        <div className="pt-12 border-t border-white/20">
          {deck.company_logo_url && (
            <img
              src={deck.company_logo_url}
              alt={deck.company_name}
              className="h-12 object-contain mx-auto mb-4"
            />
          )}
          {deck.company_phone && (
            <p className="text-white/70">
              Questions? Call us at {deck.company_phone}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
