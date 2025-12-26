/**
 * Static Slide Renderer
 * Displays static content slides with title, content, and optional media
 */

'use client'

import { cn } from '@/lib/utils'
import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface StaticSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

export function StaticSlide({ slide }: StaticSlideProps) {
  const content = slide.content as {
    title?: string
    body?: string
    background_image?: string
    text_color?: string
    alignment?: 'left' | 'center' | 'right'
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-12"
      style={{
        backgroundImage: content.background_image
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${content.background_image})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className={cn(
          'max-w-4xl space-y-6',
          content.alignment === 'center' && 'text-center',
          content.alignment === 'right' && 'text-right'
        )}
      >
        {content.title && (
          <h1
            className="text-5xl font-bold leading-tight"
            style={{ color: content.text_color || '#ffffff' }}
          >
            {content.title}
          </h1>
        )}
        {content.body && (
          <div
            className="text-xl leading-relaxed whitespace-pre-wrap"
            style={{ color: content.text_color || '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        )}
      </div>
    </div>
  )
}
