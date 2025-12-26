/**
 * Video Slide Renderer
 * Displays embedded videos (Phase 5)
 */

'use client'

import type { CompiledSlide, PresentationDeck } from '@/lib/types/presentations'

interface VideoSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
}

export function VideoSlide({ slide, deck }: VideoSlideProps) {
  const content = slide.content as {
    title?: string
    video_url?: string
  }

  // TODO: Phase 5 - Implement video player
  return (
    <div className="w-full h-full flex items-center justify-center p-12 bg-black">
      <div className="max-w-4xl text-center space-y-6">
        <h1 className="text-5xl font-bold text-white">
          {content.title || 'Watch Our Process'}
        </h1>
        <p className="text-xl text-white/70">
          Video player coming in Phase 5
        </p>
        <div className="bg-white/10 rounded-xl p-8 text-white/60">
          <p>Will support:</p>
          <ul className="mt-4 space-y-2 text-left max-w-md mx-auto">
            <li>• YouTube embeds</li>
            <li>• Vimeo embeds</li>
            <li>• Self-hosted videos</li>
            <li>• Auto-play controls</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
