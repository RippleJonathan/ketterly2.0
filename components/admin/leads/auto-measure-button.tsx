/**
 * AutoMeasureButton Component
 * 
 * Triggers Google Solar API to automatically measure roof from satellite imagery
 * Displays loading state and success metrics
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Satellite, Loader2 } from 'lucide-react'
import { useAutoMeasure } from '@/lib/hooks/use-measurements'
import { Badge } from '@/components/ui/badge'

interface AutoMeasureButtonProps {
  leadId: string
  latitude?: number | null
  longitude?: number | null
  address?: string
  onSuccess?: () => void
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  className?: string
}

export function AutoMeasureButton({
  leadId,
  latitude,
  longitude,
  address,
  onSuccess,
  size = 'default',
  variant = 'outline',
  className,
}: AutoMeasureButtonProps) {
  const autoMeasure = useAutoMeasure(leadId)
  const [lastResult, setLastResult] = useState<any>(null)

  const handleAutoMeasure = async () => {
    if (!latitude || !longitude) {
      return
    }

    try {
      const result = await autoMeasure.mutateAsync({ latitude, longitude })
      setLastResult(result.data)
      onSuccess?.()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isDisabled = !latitude || !longitude || autoMeasure.isPending

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAutoMeasure}
        disabled={isDisabled}
        size={size}
        variant={variant}
        className={className}
      >
        {autoMeasure.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing Satellite Data...
          </>
        ) : (
          <>
            <Satellite className="h-4 w-4 mr-2" />
            Auto-Measure Roof
          </>
        )}
      </Button>

      {!latitude || !longitude ? (
        <p className="text-xs text-muted-foreground">
          {address ? 
            'Geocode the address first to enable auto-measure' : 
            'Add an address to enable auto-measure'
          }
        </p>
      ) : null}

      {lastResult && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Satellite Analysis</span>
            <Badge variant="secondary" className="text-xs">
              {lastResult.roof_complexity}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Squares:</span>
              <p className="font-semibold">{lastResult.actual_squares}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pitch:</span>
              <p className="font-semibold">{lastResult.roof_pitch}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total w/ Waste:</span>
              <p className="font-semibold">{lastResult.total_squares}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Segments:</span>
              <p className="font-semibold">{lastResult.segment_count}</p>
            </div>
          </div>

          {lastResult.satellite_date && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Imagery from: {new Date(lastResult.satellite_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
