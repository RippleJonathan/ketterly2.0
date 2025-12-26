/**
 * Photo Gallery Slide Renderer
 * Displays before/after photos and project gallery (Phase 5)
 */

'use client'

import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface PhotoGallerySlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

export function PhotoGallerySlide({ slide, deck }: PhotoGallerySlideProps) {
  const content = slide.content as {
    title?: string
    media_ids?: string[]
  }

  // TODO: Phase 5 - Implement photo gallery with swipeable images
  return (
    <div className="w-full h-full flex items-center justify-center p-12 bg-black">
      <div className="max-w-4xl text-center space-y-6">
        <h1 className="text-5xl font-bold text-white">
          {content.title || 'Our Work'}
        </h1>
        <p className="text-xl text-white/70">
          Photo gallery coming in Phase 5
        </p>
        <div className="bg-white/10 rounded-xl p-8 text-white/60">
          <p>Will display:</p>
          <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
            <li>• Before/after photo comparisons</li>
            <li>• Project portfolio gallery</li>
            <li>• Swipeable image carousel</li>
            <li>• Fullscreen image viewer</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
