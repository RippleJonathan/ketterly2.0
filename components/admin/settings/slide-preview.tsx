/**
 * Live Slide Preview Component
 * Shows a miniature preview of how the slide will look in presentation mode
 */

'use client'

import type { PresentationSlide } from '@/lib/types/presentations'

interface SlidePreviewProps {
  slide: PresentationSlide
  className?: string
}

export function SlidePreview({ slide, className }: SlidePreviewProps) {
  const content = slide.content as any

  // Render different preview based on slide type
  const renderPreview = () => {
    switch (slide.slide_type) {
      case 'static':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-6"
            style={{
              backgroundColor: content.background_color || '#1f2937',
              backgroundImage: content.background_image
                ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${content.background_image})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className={`text-center ${
                content.alignment === 'left' ? 'text-left' : 
                content.alignment === 'right' ? 'text-right' : 
                'text-center'
              }`}
            >
              {content.title && (
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: content.text_color || '#ffffff' }}
                >
                  {content.title}
                </h1>
              )}
              {content.body && (
                <div
                  className="text-sm prose prose-sm prose-invert max-w-none"
                  style={{ color: content.text_color || '#ffffff' }}
                  dangerouslySetInnerHTML={{ __html: content.body }}
                />
              )}
            </div>
          </div>
        )

      case 'company_info':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary to-primary/80">
            <div className="text-center text-white">
              <div className="text-3xl font-bold mb-2">Company Name</div>
              {content.tagline && (
                <p className="text-lg opacity-90">{content.tagline}</p>
              )}
              {content.show_contact && (
                <div className="mt-4 text-sm opacity-75">
                  <p>contact@company.com</p>
                  <p>(555) 123-4567</p>
                </div>
              )}
            </div>
          </div>
        )

      case 'customer_info':
        return (
          <div className="w-full h-full flex items-center justify-center p-6 bg-gray-900">
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Project Details</h2>
              <div className="space-y-2 text-sm">
                <p>Customer Name</p>
                <p>123 Main Street</p>
                <p>City, State ZIP</p>
              </div>
            </div>
          </div>
        )

      case 'dynamic_pricing':
        return (
          <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-2">
                {content.title || 'Investment Breakdown'}
              </h2>
              <p className="text-sm opacity-75">Line items will appear here</p>
            </div>
          </div>
        )

      case 'closing':
        return (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6"
            style={{ backgroundColor: content.background_color || '#1e40af' }}
          >
            <div className="text-center text-white">
              <h1 className="text-3xl font-bold mb-2">
                {content.title || "Let's Get Started"}
              </h1>
              <p className="text-lg mb-4 opacity-90">
                {content.subtitle || 'Ready to move forward?'}
              </p>
              <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold">
                {content.cta_text || 'Get Started'}
              </button>
            </div>
          </div>
        )

      default:
        return (
          <div className="w-full h-full flex items-center justify-center p-6 bg-gray-900">
            <div className="text-white text-center">
              <p className="text-sm opacity-75">{slide.slide_type} slide</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={className}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700">
        {renderPreview()}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Live Preview
      </p>
    </div>
  )
}
