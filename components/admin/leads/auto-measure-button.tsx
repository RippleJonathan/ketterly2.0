/**
 * AutoMeasureButton Component
 * 
 * Triggers Google Solar API to automatically measure roof from satellite imagery
 * Automatically geocodes address if coordinates not available
 * Displays loading state and success metrics
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Satellite, Loader2, Eye, Edit } from 'lucide-react'
import { useAutoMeasure, useUpdateMeasurements } from '@/lib/hooks/use-measurements'
import { Badge } from '@/components/ui/badge'
import { RoofVisualizationDialog } from './roof-visualization-dialog'
import { toast } from 'sonner'

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
  const updateMeasurement = useUpdateMeasurements(leadId)
  const [lastResult, setLastResult] = useState<any>(null)
  const [showVisualization, setShowVisualization] = useState(false)

  const handleAutoMeasure = async () => {
    if (!address && (!latitude || !longitude)) {
      return
    }

    try {
      const result = await autoMeasure.mutateAsync({ 
        address,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      })
      setLastResult(result.data)
      onSuccess?.()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleManualOverride = async (adjustedSquares: number) => {
    if (!lastResult?.id) return

    try {
      await updateMeasurement.mutateAsync({
        measurementId: lastResult.id,
        data: {
          actual_squares: adjustedSquares,
          total_squares: adjustedSquares * 1.10, // Recalculate with 10% waste
        }
      })
      
      // Update local state
      setLastResult({
        ...lastResult,
        actual_squares: adjustedSquares,
        total_squares: adjustedSquares * 1.10,
      })
      
      toast.success('Measurement updated', {
        description: `Adjusted to ${adjustedSquares} squares (manual override)`,
      })
      
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to update measurement')
    }
  }

  const isDisabled = (!address && (!latitude || !longitude)) || autoMeasure.isPending

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
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
              {latitude && longitude ? 'Analyzing Satellite Data...' : 'Geocoding Address...'}
            </>
          ) : (
            <>
              <Satellite className="h-4 w-4 mr-2" />
              Auto-Measure Roof
            </>
          )}
        </Button>

        {lastResult?.visualization && (
          <Button
            onClick={() => setShowVisualization(true)}
            size={size}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Detection
          </Button>
        )}
      </div>

      {!address && (!latitude || !longitude) ? (
        <p className="text-xs text-muted-foreground">
          Add an address to enable auto-measure
        </p>
      ) : null}

      {lastResult && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Satellite Analysis</span>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {lastResult.roof_complexity}
              </Badge>
              {lastResult.used_building_stats && (
                <Badge variant="default" className="text-xs">
                  Full Coverage
                </Badge>
              )}
            </div>
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

      {/* Visualization Dialog */}
      {lastResult?.visualization && (
        <RoofVisualizationDialog
          open={showVisualization}
          onOpenChange={setShowVisualization}
          roofData={lastResult.visualization}
          onManualOverride={handleManualOverride}
        />
      )}
    </div>
  )
}
