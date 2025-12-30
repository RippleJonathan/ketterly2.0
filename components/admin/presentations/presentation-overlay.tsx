/**
 * Ketterly CRM - Presentation Overlay Component
 * Full-screen presentation viewer with Swiper.js navigation
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Keyboard, Zoom, EffectFade } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useUpdatePresentationSession,
  useCompletePresentationSession,
  useAbandonPresentationSession,
} from '@/lib/hooks/use-presentations'
import type { PresentationDeck, CompiledSlide, PricingOption } from '@/lib/types/presentations'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import 'swiper/css/effect-fade'

// Import slide renderers (to be created)
import { StaticSlide } from './slides/static-slide'
import { CustomerInfoSlide } from './slides/customer-info-slide'
import { CompanyInfoSlide } from './slides/company-info-slide'
import { DynamicPricingSlide } from './slides/dynamic-pricing-slide'
import { MeasurementDataSlide } from './slides/measurement-data-slide'
import { PhotoGallerySlide } from './slides/photo-gallery-slide'
import { VideoSlide } from './slides/video-slide'
import { ClosingSlide } from './slides/closing-slide'

interface PresentationOverlayProps {
  sessionId: string
  deck: PresentationDeck
  onClose: () => void
  onComplete: (selectedEstimateId?: string, selectedOption?: PricingOption) => void
}

export function PresentationOverlay({
  sessionId,
  deck,
  onClose,
  onComplete,
}: PresentationOverlayProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | undefined>()
  const [selectedOption, setSelectedOption] = useState<PricingOption | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const updateSession = useUpdatePresentationSession()
  const completeSession = useCompletePresentationSession()
  const abandonSession = useAbandonPresentationSession()

  const startTimeRef = useRef<Date>(new Date())

  // Update session when user makes pricing selection
  const handlePricingSelection = async (estimateId: string, option: PricingOption) => {
    setSelectedEstimateId(estimateId)
    setSelectedOption(option)

    await updateSession.mutateAsync({
      sessionId,
      updates: {
        selected_estimate_id: estimateId,
        selected_option: option,
      },
    })
  }

  // Handle closing presentation
  const handleClose = async () => {
    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)

    // Mark as abandoned if no selection made
    if (!selectedEstimateId || !selectedOption) {
      await abandonSession.mutateAsync(sessionId)
    } else {
      // Update with final state
      await updateSession.mutateAsync({
        sessionId,
        updates: {
          ended_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
        },
      })
    }

    onClose()
  }

  // Handle presentation completion (after signature or explicit complete)
  const handleComplete = async () => {
    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)

    await completeSession.mutateAsync({
      sessionId,
      contractSigned: false, // Will be updated when signature is completed
    })

    onComplete(selectedEstimateId, selectedOption)
  }

  // Set loading to false after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Render appropriate slide component based on slide type
  const renderSlide = (slide: CompiledSlide) => {
    const baseProps = {
      slide,
      deck,
    }

    switch (slide.slide_type) {
      case 'static':
        return <StaticSlide {...baseProps} />
      case 'customer_info':
        return <CustomerInfoSlide {...baseProps} />
      case 'company_info':
        return <CompanyInfoSlide {...baseProps} />
      case 'dynamic_pricing':
        return <DynamicPricingSlide {...baseProps} />
      case 'measurement_data':
        return <MeasurementDataSlide {...baseProps} />
      case 'photo_gallery':
        return <PhotoGallerySlide {...baseProps} />
      case 'video':
        return <VideoSlide {...baseProps} />
      case 'closing':
        return <ClosingSlide {...baseProps} onComplete={handleComplete} />
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-white text-lg">Unknown slide type: {slide.slide_type}</p>
          </div>
        )
    }
  }

  const totalSlides = deck.slides.length
  const progressPercent = totalSlides > 0 ? ((currentSlideIndex + 1) / totalSlides) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 text-white animate-spin mx-auto" />
            <p className="text-white text-xl font-medium">Loading presentation...</p>
          </div>
        </div>
      )}

      {/* Header with close button and progress */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-2 md:p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 text-xs md:text-sm touch-manipulation"
          >
            <X className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
            <span className="hidden md:inline">Exit Presentation</span>
          </Button>
          <div className="text-white/80 text-xs md:text-sm">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Company logo */}
        {deck.company_logo_url && (
          <img
            src={deck.company_logo_url}
            alt="Company Logo"
            className="h-6 md:h-8 object-contain"
          />
        )}
      </div>

      {/* Swiper Container */}
      <div className="pt-20 h-full">
        <Swiper
          modules={[Navigation, Pagination, Keyboard, Zoom, EffectFade]}
          navigation={{
            prevEl: '.swiper-button-prev-custom',
            nextEl: '.swiper-button-next-custom',
          }}
          pagination={{
            clickable: true,
            el: '.swiper-pagination-custom',
          }}
          keyboard={{
            enabled: true,
          }}
          zoom={{
            maxRatio: 3,
            minRatio: 1,
          }}
          effect="fade"
          fadeEffect={{
            crossFade: true,
          }}
          speed={600}
          touchRatio={1}
          threshold={10}
          simulateTouch={true}
          slidesPerView={1}
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => setCurrentSlideIndex(swiper.activeIndex)}
          className="h-full w-full"
        >
          {deck.slides.map((slide, index) => (
            <SwiperSlide key={slide.id} className="flex items-center justify-center">
              <div className="w-full h-full overflow-y-auto">
                {renderSlide(slide)}
              </div>
          </SwiperSlide>
        ))}
      </Swiper>
      </div>

      {/* Custom Navigation Buttons - Mobile Optimized */}
      <button
        className={cn(
          'swiper-button-prev-custom',
          'absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50',
          'w-14 h-14 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20',
          'flex items-center justify-center transition-all hover:scale-110',
          'backdrop-blur-sm active:scale-95 touch-manipulation',
          currentSlideIndex === 0 && 'opacity-50 cursor-not-allowed'
        )}
        disabled={currentSlideIndex === 0}
      >
        <ChevronLeft className="h-7 w-7 md:h-6 md:w-6 text-white" />
      </button>

      <button
        className={cn(
          'swiper-button-next-custom',
          'absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50',
          'w-14 h-14 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20',
          'flex items-center justify-center transition-all hover:scale-110',
          'backdrop-blur-sm active:scale-95 touch-manipulation',
          currentSlideIndex === totalSlides - 1 && 'opacity-50 cursor-not-allowed'
        )}
        disabled={currentSlideIndex === totalSlides - 1}
      >
        <ChevronRight className="h-7 w-7 md:h-6 md:w-6 text-white" />
      </button>

      {/* Custom Pagination */}
      <div className="swiper-pagination-custom absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2" />
    </div>
  )
}
