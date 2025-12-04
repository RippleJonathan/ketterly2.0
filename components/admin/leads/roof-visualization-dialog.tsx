'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Info, Save } from 'lucide-react'
import { useState } from 'react'

interface RoofVisualizationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roofData: {
    latitude: number
    longitude: number
    boundingBox?: {
      sw: { latitude: number; longitude: number }
      ne: { latitude: number; longitude: number }
    }
    segments: Array<{
      area: number
      pitch: number
      azimuth: number
      direction: string
      center?: { latitude?: number; longitude?: number }
      boundingBox?: {
        sw?: { latitude?: number; longitude?: number }
        ne?: { latitude?: number; longitude?: number }
      }
    }>
    wholeRoofArea?: number
    buildingArea?: number
    actualSquares: number
    usedBuildingStats: boolean
  }
  onManualOverride?: (adjustedSquares: number) => void
}

export function RoofVisualizationDialog({ open, onOpenChange, roofData, onManualOverride }: RoofVisualizationProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [manualSquares, setManualSquares] = useState<string>(roofData.actualSquares.toString())
  const [showOverride, setShowOverride] = useState(false)

  // Helper to convert m² to sq ft
  const m2ToSqFt = (m2: number) => (m2 * 10.764).toFixed(2)

  const handleSaveOverride = () => {
    const adjusted = parseFloat(manualSquares)
    if (!isNaN(adjusted) && adjusted > 0 && onManualOverride) {
      onManualOverride(adjusted)
      onOpenChange(false)
    }
  }

  // Generate Google Maps Static API URL with bounding box overlay
  const generateMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null

    const { latitude, longitude, boundingBox } = roofData
    const zoom = 20 // High zoom for roof detail
    const size = '800x600'
    const maptype = 'satellite'

    // Show simple building outline (bounding box)
    // Note: Google Solar API doesn't provide actual roof polygon shapes
    let path = ''
    if (boundingBox) {
      const { sw, ne } = boundingBox
      // Draw building outline in red
      path = `&path=color:0xff0000ff|weight:3|${sw.latitude},${sw.longitude}|${sw.latitude},${ne.longitude}|${ne.latitude},${ne.longitude}|${ne.latitude},${sw.longitude}|${sw.latitude},${sw.longitude}`
    }

    // Center marker
    const marker = `&markers=color:red|${latitude},${longitude}`

    return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&maptype=${maptype}${path}${marker}&key=${apiKey}`
  }

  const mapUrl = generateMapUrl()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Roof Detection Visualization</DialogTitle>
          <DialogDescription>
            Satellite view showing the detected roof area and segments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Satellite Image */}
          {mapUrl ? (
            <div className="relative">
              <img
                src={mapUrl}
                alt="Roof satellite view"
                className="w-full rounded-lg border"
                onLoad={() => setMapLoaded(true)}
              />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-sm text-muted-foreground">Loading satellite view...</p>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-background/90 p-2 rounded-md text-xs">
                <p className="font-medium text-amber-600">⚠️ Approximate Boundary</p>
                <p className="text-muted-foreground">Red outline = Building area</p>
                <p className="text-muted-foreground">Red marker = Center point</p>
                <p className="text-xs text-amber-600 mt-1">
                  Google API doesn't provide exact roof shapes
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-muted p-8 rounded-lg text-center">
              <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Map visualization requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </p>
            </div>
          )}

          {/* Detection Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Detection Method</h4>
              <Badge variant={roofData.usedBuildingStats ? 'default' : 'secondary'}>
                {roofData.usedBuildingStats ? 'Full Building Coverage' : 'Segment-Based'}
              </Badge>
              {roofData.usedBuildingStats && (
                <p className="text-xs text-muted-foreground">
                  Using buildingStats - includes areas not assigned to specific segments
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Calculated Area</h4>
              <p className="text-2xl font-bold">{roofData.actualSquares} squares</p>
              <p className="text-xs text-muted-foreground">
                {roofData.segments.length} roof segments detected
              </p>
            </div>
          </div>

          {/* Area Comparison */}
          {roofData.wholeRoofArea && roofData.buildingArea && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Area Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segment Coverage:</span>
                  <span className="font-mono">{m2ToSqFt(roofData.wholeRoofArea)} sq ft ({roofData.wholeRoofArea.toFixed(2)} m²)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Building:</span>
                  <span className="font-mono">{m2ToSqFt(roofData.buildingArea)} sq ft ({roofData.buildingArea.toFixed(2)} m²)</span>
                </div>
                {roofData.buildingArea > roofData.wholeRoofArea && (
                  <div className="flex justify-between text-amber-600">
                    <span>Missing from segments:</span>
                    <span className="font-mono">
                      {m2ToSqFt(roofData.buildingArea - roofData.wholeRoofArea)} sq ft
                      ({(((roofData.buildingArea - roofData.wholeRoofArea) / roofData.buildingArea) * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segment Details */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">Detected Roof Segments</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {roofData.segments.map((segment, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      #{i + 1}
                    </Badge>
                    <span className="text-muted-foreground">
                      {segment.direction} ({segment.azimuth.toFixed(0)}°)
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{m2ToSqFt(segment.area)} sq ft</p>
                    <p className="text-xs text-muted-foreground">{segment.pitch.toFixed(1)}° pitch</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-900">Satellite Measurement Limitations</p>
                <p className="text-amber-700">
                  The satellite view shows the approximate building boundary. Google Solar API provides measurements but not exact roof outlines.
                </p>
                <ul className="list-disc list-inside text-xs text-amber-600 space-y-0.5 ml-2">
                  <li>Red box = Overall building area detected</li>
                  <li>Actual roof may extend beyond or fall short of this boundary</li>
                  <li>Detached structures (garages, sheds) may be included in the box</li>
                  <li>Complex roof shapes are simplified by the API</li>
                </ul>
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  ⚠️ If the boundary looks incorrect (includes garage, etc.), use manual override below
                </p>
              </div>
            </div>
          </div>

          {/* Manual Override Section */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-sm text-blue-900">Manual Override</h4>
                <p className="text-xs text-blue-700">Adjust if satellite measurement looks incorrect</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverride(!showOverride)}
              >
                {showOverride ? 'Cancel' : 'Adjust Measurement'}
              </Button>
            </div>

            {showOverride && (
              <div className="space-y-3 pt-3 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Satellite Measurement</Label>
                    <p className="text-lg font-semibold">{roofData.actualSquares} squares</p>
                  </div>
                  <div>
                    <Label htmlFor="manual-squares" className="text-xs">
                      Your Adjusted Measurement
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="manual-squares"
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualSquares}
                        onChange={(e) => setManualSquares(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground self-center">squares</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  💡 Tip: If the red box includes a garage or other structure, reduce the measurement accordingly.
                </p>
                <Button
                  onClick={handleSaveOverride}
                  size="sm"
                  className="w-full"
                  disabled={manualSquares === roofData.actualSquares.toString()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Adjusted Measurement ({manualSquares} squares)
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
