/**
 * Dynamic Pricing Slide Renderer
 * Interactive Good/Better/Best pricing grid
 */

'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CompiledSlide, PresentationDeck, PricingOption } from '@/lib/types/presentations'

interface DynamicPricingSlideProps {
  slide: CompiledSlide
  deck: PresentationDeck
  onPricingSelect?: (estimateId: string, option: PricingOption) => void
  selectedEstimateId?: string
  selectedOption?: PricingOption
}

export function DynamicPricingSlide({
  slide,
  deck,
  onPricingSelect,
  selectedEstimateId,
  selectedOption,
}: DynamicPricingSlideProps) {
  const content = slide.content as {
    title?: string
    subtitle?: string
  }

  // For now, use first estimate (Phase 2 will handle multiple estimates)
  const estimate = deck.estimates[0]

  if (!estimate) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 bg-gray-900">
        <p className="text-white text-xl">No pricing information available</p>
      </div>
    )
  }

  const handleSelectOption = (option: PricingOption) => {
    if (onPricingSelect) {
      onPricingSelect(estimate.id, option)
    }
  }

  const isSelected = (option: PricingOption) => {
    return selectedEstimateId === estimate.id && selectedOption === option
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-6xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white">
            {content.title || 'Choose Your Investment Level'}
          </h1>
          {content.subtitle && (
            <p className="text-xl text-white/70">{content.subtitle}</p>
          )}
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-3 gap-6 mt-12">
          {/* Good Option */}
          <PricingCard
            title="Good"
            price={estimate.price_good}
            description="Quality protection for your home"
            features={[
              'Standard materials',
              'Professional installation',
              'Warranty included',
              'Quality guaranteed',
            ]}
            isSelected={isSelected('good')}
            onSelect={() => handleSelectOption('good')}
            variant="good"
          />

          {/* Better Option */}
          <PricingCard
            title="Better"
            price={estimate.price_better}
            description="Enhanced materials and service"
            features={[
              'Premium materials',
              'Extended warranty',
              'Priority scheduling',
              'Enhanced protection',
              'Upgraded components',
            ]}
            isSelected={isSelected('better')}
            onSelect={() => handleSelectOption('better')}
            variant="better"
            recommended
          />

          {/* Best Option */}
          <PricingCard
            title="Best"
            price={estimate.price_best}
            description="Top-tier materials and service"
            features={[
              'Premium+ materials',
              'Lifetime warranty',
              'VIP service',
              'Maximum protection',
              'All upgrades included',
              'Concierge support',
            ]}
            isSelected={isSelected('best')}
            onSelect={() => handleSelectOption('best')}
            variant="best"
          />
        </div>
      </div>
    </div>
  )
}

interface PricingCardProps {
  title: string
  price: number
  description: string
  features: string[]
  isSelected: boolean
  onSelect: () => void
  variant: 'good' | 'better' | 'best'
  recommended?: boolean
}

function PricingCard({
  title,
  price,
  description,
  features,
  isSelected,
  onSelect,
  variant,
  recommended,
}: PricingCardProps) {
  const variantColors = {
    good: 'from-blue-600 to-blue-700',
    better: 'from-green-600 to-green-700',
    best: 'from-purple-600 to-purple-700',
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl p-6 transition-all duration-300 cursor-pointer',
        'border-4',
        isSelected
          ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50 scale-105'
          : 'border-transparent hover:border-white/20 hover:scale-102',
        'bg-gradient-to-br',
        variantColors[variant]
      )}
      onClick={onSelect}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
          RECOMMENDED
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -top-3 -right-3 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
          <Check className="h-6 w-6 text-gray-900" />
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/70 text-sm">{description}</p>
        </div>

        {/* Price */}
        <div className="text-center py-4 border-y border-white/20">
          <div className="text-5xl font-bold text-white">
            ${price.toLocaleString()}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-white">
              <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Select Button */}
        <Button
          className={cn(
            'w-full mt-4',
            isSelected
              ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-500'
              : 'bg-white text-gray-900 hover:bg-white/90'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          {isSelected ? 'Selected' : 'Select This Option'}
        </Button>
      </div>
    </div>
  )
}
