/**
 * Measurements Tab Component
 * Allows users to enter and manage roof measurements for a lead
 * Includes auto-measure with satellite imagery and drawing tools
 */

'use client'

import { useState, useEffect } from 'react'
import { useLeadMeasurements, useCreateMeasurements, useUpdateMeasurements, useAddMeasurementAccessory, useRemoveMeasurementAccessory, useUpdateMeasurementAccessory, useAutoMeasure } from '@/lib/hooks/use-measurements'
import { useSearchMaterials } from '@/lib/hooks/use-materials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Ruler, Save, Edit, X, Search, Plus, Minus, Satellite, Map } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { RoofMeasurementMap } from './roof-measurement-map'
import type { Material } from '@/lib/types/materials'

/**
 * Calculate actual squares from flat squares and pitch ratio
 * @param flatSquares - Base measurement without pitch multiplier
 * @param pitchRatio - Pitch in format "6/12" or "8/12"
 * @returns Actual squares with pitch multiplier applied, or flat squares if no valid pitch
 */
function calculateActualSquaresFromPitch(flatSquares: number | null, pitchRatio: string | null): number | null {
  if (!flatSquares) return null
  if (!pitchRatio || pitchRatio.trim() === '') return flatSquares
  
  // Parse pitch ratio (e.g., "6/12" -> rise=6, run=12)
  const pitchMatch = pitchRatio.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/)
  if (!pitchMatch) return flatSquares // Invalid format, return flat
  
  const rise = parseFloat(pitchMatch[1])
  const run = parseFloat(pitchMatch[2])
  
  if (run === 0) return flatSquares // Avoid division by zero
  
  // Convert pitch to angle in radians
  const pitchRadians = Math.atan(rise / run)
  
  // Calculate pitch multiplier: 1 / cos(pitch)
  const pitchMultiplier = 1 / Math.cos(pitchRadians)
  
  // Apply multiplier to flat squares
  return flatSquares * pitchMultiplier
}

interface MeasurementsTabProps {
  leadId: string
  address?: string
  latitude?: number | null
  longitude?: number | null
}

export function MeasurementsTab({ leadId, address, latitude: initialLatitude, longitude: initialLongitude }: MeasurementsTabProps) {
  const { data: measurementsResponse, isLoading } = useLeadMeasurements(leadId)
  const createMeasurements = useCreateMeasurements(leadId)
  const updateMeasurements = useUpdateMeasurements(leadId)
  const autoMeasure = useAutoMeasure(leadId)

  const existingMeasurements = measurementsResponse?.data

  const [isEditing, setIsEditing] = useState(!existingMeasurements)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [satelliteData, setSatelliteData] = useState<any>(null)
  const [showMap, setShowMap] = useState(false)
  const [latitude, setLatitude] = useState(initialLatitude)
  const [longitude, setLongitude] = useState(initialLongitude)
  
  const { data: searchResults } = useSearchMaterials(searchQuery, 'accessory')
  const addAccessory = useAddMeasurementAccessory(leadId)
  const removeAccessory = useRemoveMeasurementAccessory(leadId)
  const updateAccessoryQty = useUpdateMeasurementAccessory(leadId)
  
  const [formData, setFormData] = useState({
    flat_squares: existingMeasurements?.flat_squares || null,
    actual_squares: existingMeasurements?.actual_squares || null,
    waste_percentage: existingMeasurements?.waste_percentage || 10,
    two_story_squares: existingMeasurements?.two_story_squares || null,
    low_slope_squares: existingMeasurements?.low_slope_squares || null,
    steep_7_12_squares: existingMeasurements?.steep_7_12_squares || null,
    steep_8_12_squares: existingMeasurements?.steep_8_12_squares || null,
    steep_9_12_squares: existingMeasurements?.steep_9_12_squares || null,
    steep_10_12_squares: existingMeasurements?.steep_10_12_squares || null,
    steep_11_12_squares: existingMeasurements?.steep_11_12_squares || null,
    steep_12_plus_squares: existingMeasurements?.steep_12_plus_squares || null,
    ridge_feet: existingMeasurements?.ridge_feet || null,
    valley_feet: existingMeasurements?.valley_feet || null,
    eave_feet: existingMeasurements?.eave_feet || null,
    rake_feet: existingMeasurements?.rake_feet || null,
    hip_feet: existingMeasurements?.hip_feet || null,
    layers_to_remove: existingMeasurements?.layers_to_remove || 1,
    pitch_ratio: existingMeasurements?.pitch_ratio || '',
    notes: existingMeasurements?.notes || '',
  })

  // Update form and satellite data when measurements load
  useEffect(() => {
    if (existingMeasurements) {
      setFormData({
        flat_squares: existingMeasurements.flat_squares,
        actual_squares: existingMeasurements.actual_squares,
        waste_percentage: existingMeasurements.waste_percentage,
        two_story_squares: existingMeasurements.two_story_squares,
        low_slope_squares: existingMeasurements.low_slope_squares,
        steep_7_12_squares: existingMeasurements.steep_7_12_squares,
        steep_8_12_squares: existingMeasurements.steep_8_12_squares,
        steep_9_12_squares: existingMeasurements.steep_9_12_squares,
        steep_10_12_squares: existingMeasurements.steep_10_12_squares,
        steep_11_12_squares: existingMeasurements.steep_11_12_squares,
        steep_12_plus_squares: existingMeasurements.steep_12_plus_squares,
        ridge_feet: existingMeasurements.ridge_feet,
        valley_feet: existingMeasurements.valley_feet,
        eave_feet: existingMeasurements.eave_feet,
        rake_feet: existingMeasurements.rake_feet,
        hip_feet: existingMeasurements.hip_feet,
        layers_to_remove: existingMeasurements.layers_to_remove,
        pitch_ratio: existingMeasurements.pitch_ratio || '',
        notes: existingMeasurements.notes || '',
      })
      // Load satellite data if it exists
      if (existingMeasurements.roof_data_raw) {
        setSatelliteData(existingMeasurements.roof_data_raw)
      }
      setIsEditing(false)
    }
  }, [existingMeasurements])

  // Dynamically recalculate actual_squares when pitch or flat_squares changes
  // Only do this in edit mode and when we have both values
  useEffect(() => {
    // Skip recalculation if:
    // 1. We're not in editing mode (viewing existing data)
    // 2. We don't have both flat_squares and pitch_ratio
    // 3. Pitch ratio is empty string
    if (!isEditing || formData.flat_squares === null || !formData.pitch_ratio || formData.pitch_ratio.trim() === '') {
      return
    }

    const calculatedActualSquares = calculateActualSquaresFromPitch(
      formData.flat_squares,
      formData.pitch_ratio
    )
    
    // Only update if different to avoid infinite loops
    if (calculatedActualSquares !== null && Math.abs((calculatedActualSquares || 0) - (formData.actual_squares || 0)) > 0.01) {
      setFormData(prev => ({
        ...prev,
        actual_squares: calculatedActualSquares
      }))
    }
  }, [formData.flat_squares, formData.pitch_ratio, isEditing])

  // Calculate total squares
  const totalSquares = formData.actual_squares
    ? (formData.actual_squares * (1 + formData.waste_percentage / 100)).toFixed(2)
    : null

  const handleAutoMeasure = async () => {
    if (!address && (!latitude || !longitude)) {
      toast.error('Address or coordinates required for auto-measure')
      return
    }

    try {
      const result = await autoMeasure.mutateAsync({
        address,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      })

      if (result?.data) {
        setSatelliteData(result.data)
        // Update coordinates if they were geocoded
        if (result.data.latitude && result.data.longitude) {
          setLatitude(result.data.latitude)
          setLongitude(result.data.longitude)
        }
        
        // Convert pitch degrees to pitch ratio format (e.g., "6/12")
        // Standard: 12" run for every X" rise based on angle
        const pitchDegrees = result.data.roof_pitch_degrees || 0
        const pitchRadians = (pitchDegrees * Math.PI) / 180
        const rise = Math.tan(pitchRadians) * 12
        const pitchRatio = `${Math.round(rise)}/12`
        
        // Set the pitch ratio in the form
        setFormData(prev => ({
          ...prev,
          pitch_ratio: pitchRatio,
        }))
        
        setShowMap(true)
        toast.success(`Satellite measurement complete! Detected pitch: ${pitchRatio}`)
      }
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleMapMeasurementUpdate = async (squares: number, customPolygon?: any) => {
    // Save the drawing data for persistence
    const drawingData = customPolygon ? {
      polygons: customPolygon.polygons?.map((p: any) => ({
        path: p.coordinates,
        flatArea: p.flatArea,
        pitch: p.pitch,
        slopedArea: p.slopedArea,
        squares: p.squares,
      })),
      polylines: customPolygon.polylines?.map((p: any) => ({
        path: p.coordinates,
        length: p.length,
        flatLength: p.flatLength,
        pitch: p.pitch,
        type: p.type,
      })),
    } : null
    
    // Extract line lengths from the measurement data if available
    if (customPolygon?.ridge_feet !== undefined) {
      setFormData(prev => ({
        ...prev,
        flat_squares: customPolygon.flat_squares || null,
        actual_squares: customPolygon.actual_squares || squares,
        two_story_squares: customPolygon.two_story_squares || null,
        low_slope_squares: customPolygon.low_slope_squares || null,
        ridge_feet: customPolygon.ridge_feet || null,
        hip_feet: customPolygon.hip_feet || null,
        valley_feet: customPolygon.valley_feet || null,
        eave_feet: customPolygon.eave_feet || null,
        rake_feet: customPolygon.rake_feet || null,
      }))
      
      // Auto-save the measurement with drawing data
      const measurementData = {
        flat_squares: customPolygon.flat_squares || null,
        actual_squares: customPolygon.actual_squares || squares,
        waste_percentage: formData.waste_percentage,
        two_story_squares: customPolygon.two_story_squares || null,
        low_slope_squares: customPolygon.low_slope_squares || null,
        steep_7_12_squares: formData.steep_7_12_squares,
        steep_8_12_squares: formData.steep_8_12_squares,
        steep_9_12_squares: formData.steep_9_12_squares,
        steep_10_12_squares: formData.steep_10_12_squares,
        steep_11_12_squares: formData.steep_11_12_squares,
        steep_12_plus_squares: formData.steep_12_plus_squares,
        ridge_feet: customPolygon.ridge_feet || null,
        valley_feet: customPolygon.valley_feet || null,
        eave_feet: customPolygon.eave_feet || null,
        rake_feet: customPolygon.rake_feet || null,
        hip_feet: customPolygon.hip_feet || null,
        layers_to_remove: formData.layers_to_remove,
        pitch_ratio: formData.pitch_ratio || null,
        notes: formData.notes || null,
        roof_data_raw: satelliteData ? {
          ...satelliteData,
          drawings: drawingData,
        } : { drawings: drawingData },
      }

      if (existingMeasurements) {
        await updateMeasurements.mutateAsync({
          measurementId: existingMeasurements.id,
          data: measurementData,
        })
      } else {
        await createMeasurements.mutateAsync(measurementData)
      }
      
      toast.success('Measurement auto-saved!')
    } else {
      setFormData(prev => ({
        ...prev,
        actual_squares: squares,
      }))
    }
    setShowMap(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const measurementData = {
      ...formData,
      actual_squares: formData.actual_squares ? Number(formData.actual_squares) : null,
      two_story_squares: formData.two_story_squares ? Number(formData.two_story_squares) : null,
      low_slope_squares: formData.low_slope_squares ? Number(formData.low_slope_squares) : null,
      ridge_feet: formData.ridge_feet ? Number(formData.ridge_feet) : null,
      valley_feet: formData.valley_feet ? Number(formData.valley_feet) : null,
      eave_feet: formData.eave_feet ? Number(formData.eave_feet) : null,
      rake_feet: formData.rake_feet ? Number(formData.rake_feet) : null,
      hip_feet: formData.hip_feet ? Number(formData.hip_feet) : null,
      pitch_ratio: formData.pitch_ratio || null,
      notes: formData.notes || null,
      roof_data_raw: satelliteData || null,  // Save satellite visualization data
    }

    if (existingMeasurements) {
      await updateMeasurements.mutateAsync({
        measurementId: existingMeasurements.id,
        data: measurementData,
      })
      setIsEditing(false)
    } else {
      await createMeasurements.mutateAsync(measurementData)
      setIsEditing(false)
    }
  }

  const handleAddAccessory = async (material: Material) => {
    if (!existingMeasurements) {
      toast.error('Please save measurements first before adding accessories')
      return
    }

    await addAccessory.mutateAsync({
      measurementId: existingMeasurements.id,
      materialId: material.id,
      quantity: 1,
    })

    setSearchQuery('')
    setShowSearchResults(false)
  }

  const handleRemoveAccessory = async (accessoryId: string) => {
    await removeAccessory.mutateAsync(accessoryId)
  }

  const handleUpdateQuantity = async (accessoryId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    await updateAccessoryQty.mutateAsync({ accessoryId, quantity: newQuantity })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading measurements...</p>
        </div>
      </div>
    )
  }

  // Display mode - show existing measurements
  if (!isEditing && existingMeasurements) {
    return (
      <div className="space-y-6">
        {/* Auto-Measure Section - Always available */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Re-measure from Satellite
            </CardTitle>
            <CardDescription>
              Update measurements using latest satellite imagery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAutoMeasure}
                disabled={autoMeasure.isPending || (!address && (!latitude || !longitude))}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {autoMeasure.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing Satellite Data...
                  </>
                ) : (
                  <>
                    <Satellite className="h-4 w-4 mr-2" />
                    Auto-Measure from Satellite
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMap(!showMap)}
                disabled={!latitude || !longitude}
                title={(!latitude || !longitude) ? "Add location to lead to enable drawing map" : ""}
                className="w-full sm:w-auto"
              >
                <Map className="h-4 w-4 mr-2" />
                {showMap ? 'Hide Map' : 'Show Drawing Map'}
              </Button>
            </div>

            {(!latitude || !longitude) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-900">Location Required</p>
                <p className="text-amber-700 text-xs mt-1">
                  Please add a location to this lead (address or coordinates) to enable the drawing map and auto-measure features.
                </p>
              </div>
            )}

            {/* Interactive Map */}
            {showMap && latitude && longitude && (
              <div className="border rounded-lg p-4">
                <RoofMeasurementMap
                  latitude={latitude}
                  longitude={longitude}
                  rgbImageUrl={satelliteData?.visualization?.rgbImageUrl}
                  segments={satelliteData?.visualization?.segments || []}
                  savedDrawings={satelliteData?.drawings || existingMeasurements?.roof_data_raw?.drawings}
                  onMeasurementUpdate={handleMapMeasurementUpdate}
                />
              </div>
            )}

            {satelliteData && !showMap && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900">Auto-Measure Complete</p>
                <p className="text-blue-700">
                  {satelliteData.actual_squares} squares detected · {satelliteData.segment_count} roof segments · {satelliteData.roof_pitch} pitch
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Data has been populated in the form below
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Roof Measurements</h2>
            <p className="text-sm text-gray-500 mt-1">
              Measured {formatDistanceToNow(new Date(existingMeasurements.measured_at), { addSuffix: true })}
              {existingMeasurements.measurer && (
                <> by {existingMeasurements.measurer.full_name}</>
              )}
            </p>
          </div>
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Measurements
          </Button>
        </div>

        {/* Measurements Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Roof Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roof Area</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingMeasurements.flat_squares && (
                <div>
                  <p className="text-sm text-gray-500">Flat Squares</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {existingMeasurements.flat_squares}
                  </p>
                  <p className="text-xs text-gray-500">Base measurement (no pitch)</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Actual Squares</p>
                <p className="text-2xl font-bold text-gray-900">
                  {existingMeasurements.actual_squares || '—'}
                </p>
              </div>
              {existingMeasurements.two_story_squares !== null && existingMeasurements.two_story_squares > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Two Story Squares</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {existingMeasurements.two_story_squares}
                  </p>
                </div>
              )}
              {existingMeasurements.low_slope_squares !== null && existingMeasurements.low_slope_squares > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Low Slope Squares</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {existingMeasurements.low_slope_squares}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Waste Percentage</p>
                <p className="text-xl font-semibold text-gray-900">
                  {existingMeasurements.waste_percentage}%
                </p>
              </div>
              {existingMeasurements.pitch_ratio && (
                <div>
                  <p className="text-sm text-gray-500">Roof Pitch</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {existingMeasurements.pitch_ratio}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500">Total Squares (with waste)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {existingMeasurements.total_squares?.toFixed(2) || '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Linear Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linear Measurements</CardTitle>
              <CardDescription>All measurements in feet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ridge:</span>
                <span className="font-semibold">{existingMeasurements.ridge_feet || '—'} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valley:</span>
                <span className="font-semibold">{existingMeasurements.valley_feet || '—'} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Eave:</span>
                <span className="font-semibold">{existingMeasurements.eave_feet || '—'} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rake:</span>
                <span className="font-semibold">{existingMeasurements.rake_feet || '—'} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hip:</span>
                <span className="font-semibold">{existingMeasurements.hip_feet || '—'} ft</span>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Layers to Remove</p>
                <p className="text-xl font-semibold text-gray-900">
                  {existingMeasurements.layers_to_remove}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accessories */}
        {existingMeasurements.accessories && existingMeasurements.accessories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accessories & Penetrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingMeasurements.accessories.map((accessory: any) => (
                  <div key={accessory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{accessory.material.name}</p>
                      <p className="text-sm text-gray-500">
                        {accessory.quantity} {accessory.material.unit}
                        {accessory.quantity !== 1 && accessory.material.unit !== 'each' ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateQuantity(accessory.id, accessory.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{accessory.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateQuantity(accessory.id, accessory.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAccessory(accessory.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Accessory Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Accessories</CardTitle>
            <CardDescription>Search for vents, pipe jacks, and other accessories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search accessories (e.g., turtle vent, pipe jack)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowSearchResults(e.target.value.length >= 2)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults?.data && searchResults.data.length > 0 && (
                <div className="absolute z-10 mt-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.data.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => handleAddAccessory(material)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{material.name}</p>
                      <p className="text-sm text-gray-500">
                        {material.subcategory} • ${material.unit_price || '0.00'} per {material.unit_type}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {showSearchResults && searchQuery.length >= 2 && (!searchResults?.data || searchResults.data.length === 0) && (
                <div className="absolute z-10 mt-2 w-full bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
                  No accessories found. Try a different search term.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {existingMeasurements.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{existingMeasurements.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Edit/Create mode - show form
  return (
    <div className="space-y-6">
      {/* Auto-Measure Section */}
      {!existingMeasurements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Automatic Roof Measurement
            </CardTitle>
            <CardDescription>
              Use satellite imagery to automatically measure the roof and refine with drawing tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleAutoMeasure}
                disabled={autoMeasure.isPending || (!address && (!latitude || !longitude))}
              >
                {autoMeasure.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing Satellite Data...
                  </>
                ) : (
                  <>
                    <Satellite className="h-4 w-4 mr-2" />
                    Auto-Measure from Satellite
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMap(!showMap)}
                disabled={!latitude || !longitude}
                title={(!latitude || !longitude) ? "Add location to lead to enable drawing map" : ""}
              >
                <Map className="h-4 w-4 mr-2" />
                {showMap ? 'Hide Map' : 'Show Drawing Map'}
              </Button>
            </div>

            {(!latitude || !longitude) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-900">Location Required</p>
                <p className="text-amber-700 text-xs mt-1">
                  Please add a location to this lead (address or coordinates) to enable the drawing map and auto-measure features.
                </p>
              </div>
            )}

            {/* Interactive Map */}
            {showMap && latitude && longitude && (
              <div className="border rounded-lg p-4">
                <RoofMeasurementMap
                  latitude={latitude}
                  longitude={longitude}
                  rgbImageUrl={satelliteData?.visualization?.rgbImageUrl}
                  segments={satelliteData?.visualization?.segments || []}
                  savedDrawings={satelliteData?.drawings || existingMeasurements?.roof_data_raw?.drawings}
                  onMeasurementUpdate={handleMapMeasurementUpdate}
                />
              </div>
            )}

            {satelliteData && !showMap && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900">Auto-Measure Complete</p>
                <p className="text-blue-700">
                  {satelliteData.actual_squares} squares detected · {satelliteData.segment_count} roof segments · {satelliteData.roof_pitch} pitch
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Data has been populated in the form below
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {existingMeasurements ? 'Edit' : 'Add'} Roof Measurements
        </h2>
        <p className="text-gray-500 mt-1">
          Enter roof measurements to calculate material quantities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Roof Area Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Roof Area
            </CardTitle>
            <CardDescription>
              1 square = 100 square feet of roof area
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="flat_squares">Flat Squares</Label>
              <Input
                id="flat_squares"
                type="number"
                step="0.01"
                value={formData.flat_squares || ''}
                onChange={(e) => setFormData({ ...formData, flat_squares: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 25.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Base measurement without pitch
              </p>
            </div>
            <div>
              <Label htmlFor="actual_squares">Actual Squares (with pitch)</Label>
              <Input
                id="actual_squares"
                type="number"
                step="0.01"
                value={formData.actual_squares || ''}
                onChange={(e) => setFormData({ ...formData, actual_squares: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 25.5"
                disabled={formData.flat_squares !== null && formData.pitch_ratio !== null && formData.pitch_ratio !== ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.flat_squares !== null && formData.pitch_ratio !== null && formData.pitch_ratio !== '' 
                  ? 'Auto-calculated from flat squares + pitch'
                  : 'Total roof area with pitch applied'
                }
              </p>
            </div>
            <div>
              <Label htmlFor="two_story_squares">Two Story Squares</Label>
              <Input
                id="two_story_squares"
                type="number"
                step="0.01"
                value={formData.two_story_squares || ''}
                onChange={(e) => setFormData({ ...formData, two_story_squares: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 10.0"
              />
            </div>
            <div>
              <Label htmlFor="low_slope_squares">Low Slope Squares</Label>
              <Input
                id="low_slope_squares"
                type="number"
                step="0.01"
                value={formData.low_slope_squares || ''}
                onChange={(e) => setFormData({ ...formData, low_slope_squares: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 5.0"
              />
            </div>
            <div>
              <Label htmlFor="waste_percentage">Waste %</Label>
              <Input
                id="waste_percentage"
                type="number"
                step="0.1"
                value={formData.waste_percentage}
                onChange={(e) => setFormData({ ...formData, waste_percentage: Number(e.target.value) })}
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">Typically 10-15%</p>
            </div>
            <div>
              <Label htmlFor="pitch_ratio">Roof Pitch</Label>
              <Input
                id="pitch_ratio"
                type="text"
                value={formData.pitch_ratio}
                onChange={(e) => setFormData({ ...formData, pitch_ratio: e.target.value })}
                placeholder="e.g., 6/12 or 8/12"
              />
              <p className="text-xs text-gray-500 mt-1">Rise over run (e.g., 6/12)</p>
            </div>
            <div>
              <Label>Total Squares (calculated)</Label>
              <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                <span className="font-semibold text-blue-600">
                  {totalSquares || '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linear Measurements Section */}
        <Card>
          <CardHeader>
            <CardTitle>Linear Measurements</CardTitle>
            <CardDescription>All measurements in feet</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ridge_feet">Ridge (ft)</Label>
              <Input
                id="ridge_feet"
                type="number"
                step="0.1"
                value={formData.ridge_feet || ''}
                onChange={(e) => setFormData({ ...formData, ridge_feet: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 50"
              />
            </div>
            <div>
              <Label htmlFor="valley_feet">Valley (ft)</Label>
              <Input
                id="valley_feet"
                type="number"
                step="0.1"
                value={formData.valley_feet || ''}
                onChange={(e) => setFormData({ ...formData, valley_feet: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 30"
              />
            </div>
            <div>
              <Label htmlFor="eave_feet">Eave (ft)</Label>
              <Input
                id="eave_feet"
                type="number"
                step="0.1"
                value={formData.eave_feet || ''}
                onChange={(e) => setFormData({ ...formData, eave_feet: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 120"
              />
            </div>
            <div>
              <Label htmlFor="rake_feet">Rake (ft)</Label>
              <Input
                id="rake_feet"
                type="number"
                step="0.1"
                value={formData.rake_feet || ''}
                onChange={(e) => setFormData({ ...formData, rake_feet: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 80"
              />
            </div>
            <div>
              <Label htmlFor="hip_feet">Hip (ft)</Label>
              <Input
                id="hip_feet"
                type="number"
                step="0.1"
                value={formData.hip_feet || ''}
                onChange={(e) => setFormData({ ...formData, hip_feet: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g., 40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Steep slopes and special roof configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Steep Slopes */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-3">Steep Slopes (Higher Labor Cost)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="steep_7_12_squares">7/12 Pitch</Label>
                  <Input
                    id="steep_7_12_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_7_12_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_7_12_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="steep_8_12_squares">8/12 Pitch</Label>
                  <Input
                    id="steep_8_12_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_8_12_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_8_12_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="steep_9_12_squares">9/12 Pitch</Label>
                  <Input
                    id="steep_9_12_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_9_12_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_9_12_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="steep_10_12_squares">10/12 Pitch</Label>
                  <Input
                    id="steep_10_12_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_10_12_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_10_12_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="steep_11_12_squares">11/12 Pitch</Label>
                  <Input
                    id="steep_11_12_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_11_12_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_11_12_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="steep_12_plus_squares">12/12+ Pitch</Label>
                  <Input
                    id="steep_12_plus_squares"
                    type="number"
                    step="0.01"
                    value={formData.steep_12_plus_squares || ''}
                    onChange={(e) => setFormData({ ...formData, steep_12_plus_squares: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Layers to Remove */}
            <div>
              <Label htmlFor="layers_to_remove">Layers to Remove</Label>
              <Input
                id="layers_to_remove"
                type="number"
                value={formData.layers_to_remove}
                onChange={(e) => setFormData({ ...formData, layers_to_remove: Number(e.target.value) })}
                min="1"
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional measurement notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={createMeasurements.isPending || updateMeasurements.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {existingMeasurements ? 'Update' : 'Save'} Measurements
          </Button>
          {existingMeasurements && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
