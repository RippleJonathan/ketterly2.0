'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, PenTool, Square, Trash2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface RoofMeasurementMapProps {
  latitude: number
  longitude: number
  rgbImageUrl?: string | null
  segments?: Array<{
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
  savedDrawings?: {
    polygons?: Array<{
      path: Array<{ lat: number; lng: number }>
      flatArea: number
      pitch: number
      slopedArea: number
      squares: number
      roofType?: 'standard' | 'two-story' | 'low-slope'  // Optional for backward compatibility
    }>
    polylines?: Array<{
      path: Array<{ lat: number; lng: number }>
      length: number
      flatLength: number
      pitch: number
      type: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake'
    }>
  }
  onMeasurementUpdate?: (squares: number, customPolygon?: any) => void
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function RoofMeasurementMap({
  latitude,
  longitude,
  rgbImageUrl,
  segments = [],
  savedDrawings,
  onMeasurementUpdate,
}: RoofMeasurementMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [drawingManager, setDrawingManager] = useState<any>(null)
  const [polygons, setPolygons] = useState<any[]>([])
  const [polylines, setPolylines] = useState<any[]>([])
  const [polygonData, setPolygonData] = useState<Array<{
    polygon: any
    flatArea: number
    pitch: number
    slopedArea: number
    squares: number
    roofType: 'standard' | 'two-story' | 'low-slope'  // Track polygon type
  }>>([])
  const [polylineData, setPolylineData] = useState<Array<{
    polyline: any
    length: number
    flatLength: number
    pitch: number
    type: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake'
  }>>([])
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingType, setDrawingType] = useState<'polygon' | 'polyline'>('polygon')
  const [roofType, setRoofType] = useState<'standard' | 'two-story' | 'low-slope'>('standard')  // Add roof type selector
  const [polylineType, setPolylineType] = useState<'ridge' | 'hip' | 'valley' | 'eave' | 'rake'>('ridge')
  const [customSquares, setCustomSquares] = useState<string>('')
  const [apiLoaded, setApiLoaded] = useState(false)
  const [snapMarker, setSnapMarker] = useState<any>(null)
  
  // Use ref to track polyline type for event handlers (state might not update in time)
  const polylineTypeRef = useRef<'ridge' | 'hip' | 'valley' | 'eave' | 'rake'>('ridge')
  const roofTypeRef = useRef<'standard' | 'two-story' | 'low-slope'>('standard')
  
  // Use refs to track shapes for snap-to functionality
  const polygonsRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])

  // Color map for different line types
  const lineColors = {
    ridge: '#ef4444',    // Red
    hip: '#3b82f6',      // Blue  
    valley: '#a855f7',   // Purple
    eave: '#22c55e',     // Green
    rake: '#f97316',     // Orange
  }

  // Color map for polygon types
  const polygonColors = {
    standard: { fill: '#3B82F6', stroke: '#1E40AF' },      // Blue
    'two-story': { fill: '#F97316', stroke: '#C2410C' },   // Orange
    'low-slope': { fill: '#22C55E', stroke: '#15803D' },   // Green
  }

  // Snapping configuration
  const SNAP_DISTANCE = 15 // pixels
  const SNAP_DISTANCE_METERS = 0.5 // meters - for lat/lng snapping
  
  // Keep refs in sync with state
  useEffect(() => {
    polylineTypeRef.current = polylineType
  }, [polylineType])

  useEffect(() => {
    roofTypeRef.current = roofType
  }, [roofType])

  useEffect(() => {
    polygonsRef.current = polygons
  }, [polygons])

  useEffect(() => {
    polylinesRef.current = polylines
  }, [polylines])

  // Update polygon drawing colors when roof type changes
  useEffect(() => {
    if (drawingManager && map) {
      const colors = polygonColors[roofType]
      drawingManager.setOptions({
        polygonOptions: {
          fillColor: colors.fill,
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: colors.stroke,
          editable: true,
          draggable: false,
        },
      })
    }
  }, [roofType, drawingManager, map])

  // Helper function to find which segment a point is in
  const findSegmentForPoint = (lat: number, lng: number) => {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (!seg.boundingBox?.sw || !seg.boundingBox?.ne) continue
      
      const { sw, ne } = seg.boundingBox
      if (
        sw.latitude !== undefined &&
        ne.latitude !== undefined &&
        sw.longitude !== undefined &&
        ne.longitude !== undefined &&
        lat >= sw.latitude &&
        lat <= ne.latitude &&
        lng >= sw.longitude &&
        lng <= ne.longitude
      ) {
        return i
      }
    }
    return null
  }

  // Helper function to get average pitch for a polygon
  const getPitchForPolygon = (polygon: any) => {
    // If no segments available (manual mode), return 0 (flat)
    if (!segments || segments.length === 0) return 0
    
    const path = polygon.getPath()
    const pitches: number[] = []
    
    // Sample vertices of the polygon
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i)
      const segmentIndex = findSegmentForPoint(point.lat(), point.lng())
      if (segmentIndex !== null) {
        pitches.push(segments[segmentIndex].pitch)
      }
    }
    
    // Also sample points along the edges for better coverage
    for (let i = 0; i < path.getLength(); i++) {
      const p1 = path.getAt(i)
      const p2 = path.getAt((i + 1) % path.getLength())
      
      // Sample 3 points between each vertex pair
      for (let j = 1; j <= 3; j++) {
        const ratio = j / 4
        const lat = p1.lat() + (p2.lat() - p1.lat()) * ratio
        const lng = p1.lng() + (p2.lng() - p1.lng()) * ratio
        const segmentIndex = findSegmentForPoint(lat, lng)
        if (segmentIndex !== null) {
          pitches.push(segments[segmentIndex].pitch)
        }
      }
    }
    
    // Return average pitch, or 0 if none found
    if (pitches.length === 0) return 0
    return pitches.reduce((sum, p) => sum + p, 0) / pitches.length
  }

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded with required libraries
      if (window.google?.maps?.drawing && window.google?.maps?.geometry) {
        setApiLoaded(true)
        return
      }

      // Check if script already exists (might be loading)
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        // Script exists, wait for it to load with required libraries
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.drawing && window.google?.maps?.geometry) {
            clearInterval(checkInterval)
            setApiLoaded(true)
          }
        }, 100)
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          if (!window.google?.maps?.drawing || !window.google?.maps?.geometry) {
            console.error('Google Maps drawing/geometry libraries failed to load')
          }
        }, 10000)
        return
      }

      // No script exists yet - create one
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error('Google Maps API key not found')
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        // Wait for libraries to be ready
        const checkLibraries = setInterval(() => {
          if (window.google?.maps?.drawing && window.google?.maps?.geometry) {
            clearInterval(checkLibraries)
            setApiLoaded(true)
          }
        }, 50)
        
        setTimeout(() => {
          clearInterval(checkLibraries)
          if (window.google?.maps?.drawing && window.google?.maps?.geometry) {
            setApiLoaded(true)
          } else {
            console.error('Drawing/geometry libraries not available after load')
          }
        }, 5000)
      }
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!apiLoaded || !mapRef.current || map) return

    console.log('Initializing map at coordinates:', { latitude, longitude })
    const google = window.google

    // Create map
    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 20,
      mapTypeId: 'satellite',
      tilt: 0,
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['satellite', 'hybrid'],
      },
      streetViewControl: false,
    })

    setMap(newMap)

    // Add center marker
    new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: newMap,
      title: 'Property Center',
    })

    // Initialize Drawing Manager
    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false, // We'll use custom buttons
      polygonOptions: {
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#1d4ed8',
        editable: true,
        draggable: false,
      },
      polylineOptions: {
        strokeColor: '#ef4444',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        editable: true,
        draggable: false,
      },
    })

    manager.setMap(newMap)
    setDrawingManager(manager)

    // Update polyline color dynamically based on type
    const updatePolylineColor = () => {
      if (manager) {
        manager.setOptions({
          polylineOptions: {
            strokeColor: lineColors[polylineType],
            strokeOpacity: 0.8,
            strokeWeight: 3,
            editable: true,
            draggable: false,
          },
        })
      }
    }

    // Handle polygon complete
    google.maps.event.addListener(manager, 'polygoncomplete', (polygon: any) => {
      // Use Google's accurate spherical area calculation (like Ripple Roofs)
      const flatAreaM2 = google.maps.geometry.spherical.computeArea(polygon.getPath())
      const flatAreaSqFt = Math.round(flatAreaM2 * 10.764)
      
      // Get pitch for this polygon
      const pitch = getPitchForPolygon(polygon)
      
      // Calculate sloped area: sloped = flat / cos(pitch)
      const pitchRadians = (pitch * Math.PI) / 180
      const pitchMultiplier = pitch > 0 ? 1 / Math.cos(pitchRadians) : 1
      const slopedAreaSqFt = Math.round(flatAreaSqFt * pitchMultiplier)
      const squares = slopedAreaSqFt / 100
      
      // Get current roof type from ref (state might not be current in event handler)
      const currentRoofType = roofTypeRef.current
      
      const polygonInfo = {
        polygon,
        flatArea: flatAreaSqFt,
        pitch,
        slopedArea: slopedAreaSqFt,
        squares,
        roofType: currentRoofType,
      }
      
      setPolygons((prev) => [...prev, polygon])
      setPolygonData((prev) => [...prev, polygonInfo])
      manager.setDrawingMode(null)
      setIsDrawingMode(false)

      const roofTypeLabel = currentRoofType === 'two-story' ? 'Two-Story' : currentRoofType === 'low-slope' ? 'Low-Slope' : 'Standard'
      const roofTypeEmoji = currentRoofType === 'two-story' ? '🟧' : currentRoofType === 'low-slope' ? '🟩' : '🟦'
      toast.success(
        pitch > 0
          ? `${roofTypeEmoji} ${roofTypeLabel}: ${squares.toFixed(2)} sq (${pitch.toFixed(1)}° pitch)`
          : `${roofTypeEmoji} ${roofTypeLabel}: ${squares.toFixed(2)} sq (flat)`
      )
    })

    // Handle polyline complete - continuous drawing mode
    google.maps.event.addListener(manager, 'polylinecomplete', (polyline: any) => {
      // Get the current type from ref (more reliable than state in event handlers)
      const currentType = polylineTypeRef.current
      
      // Calculate flat/horizontal length using spherical geometry
      const lengthMeters = google.maps.geometry.spherical.computeLength(polyline.getPath())
      const flatLengthFeet = lengthMeters * 3.28084
      
      // Get average pitch for this line by sampling points along it
      const path = polyline.getPath()
      const pitches: number[] = []
      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i)
        const segmentIndex = findSegmentForPoint(point.lat(), point.lng())
        if (segmentIndex !== null) {
          pitches.push(segments[segmentIndex].pitch)
        }
      }
      const avgPitch = pitches.length > 0 ? pitches.reduce((sum, p) => sum + p, 0) / pitches.length : 0
      
      // Apply pitch multiplier based on line type
      // Ridge and Eave are horizontal (no multiplier)
      // Hip, Valley, and Rake run up/down the slope (need multiplier)
      let actualLength = flatLengthFeet
      let pitchMultiplier = 1
      
      if (currentType === 'hip' || currentType === 'valley' || currentType === 'rake') {
        // For sloped lines, use the same pitch multiplier as polygons
        const pitchRadians = (avgPitch * Math.PI) / 180
        pitchMultiplier = avgPitch > 0 ? 1 / Math.cos(pitchRadians) : 1
        actualLength = flatLengthFeet * pitchMultiplier
      }
      
      const displayLength = Math.round(actualLength)
      
      // Set color based on type
      polyline.setOptions({
        strokeColor: lineColors[currentType],
        strokeOpacity: 0.8,
        strokeWeight: 3,
      })
      
      const polylineInfo = {
        polyline,
        length: displayLength,
        flatLength: Math.round(flatLengthFeet),
        pitch: avgPitch,
        type: currentType,
      }
      
      setPolylines((prev) => [...prev, polyline])
      setPolylineData((prev) => [...prev, polylineInfo])
      
      // Keep drawing mode active for continuous drawing
      const pitchInfo = (currentType === 'hip' || currentType === 'valley' || currentType === 'rake') && avgPitch > 0
        ? ` (${avgPitch.toFixed(1)}° pitch applied)`
        : ''
      
      toast.success(`${currentType.charAt(0).toUpperCase() + currentType.slice(1)} drawn: ${displayLength} ft${pitchInfo} - Click to draw another`)
      
      // Immediately restart drawing same type
      setTimeout(() => {
        if (manager) {
          manager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYLINE)
        }
      }, 100)
    })

    // Add snap-to functionality for drawing
    const snapMarkerInstance = new google.maps.Marker({
      map: newMap,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#22C55E',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
      visible: false,
      zIndex: 1000,
    })
    setSnapMarker(snapMarkerInstance)

    // Mouse move listener for snapping
    google.maps.event.addListener(newMap, 'mousemove', (e: any) => {
      if (!manager.getDrawingMode()) {
        snapMarkerInstance.setVisible(false)
        return
      }

      // Collect all existing vertices from refs
      const allVertices: google.maps.LatLng[] = []
      
      // Get vertices from polygons
      polygonsRef.current.forEach(polygon => {
        const path = polygon.getPath()
        for (let i = 0; i < path.getLength(); i++) {
          allVertices.push(path.getAt(i))
        }
      })
      
      // Get vertices from polylines
      polylinesRef.current.forEach(polyline => {
        const path = polyline.getPath()
        for (let i = 0; i < path.getLength(); i++) {
          allVertices.push(path.getAt(i))
        }
      })

      // Find nearest vertex
      let nearestVertex: google.maps.LatLng | null = null
      let minDistance = SNAP_DISTANCE_METERS
      
      allVertices.forEach(vertex => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(e.latLng, vertex)
        if (distance < minDistance) {
          minDistance = distance
          nearestVertex = vertex
        }
      })

      // Show snap marker if near a vertex
      if (nearestVertex) {
        snapMarkerInstance.setPosition(nearestVertex)
        snapMarkerInstance.setVisible(true)
      } else {
        snapMarkerInstance.setVisible(false)
      }
    })

  }, [apiLoaded, latitude, longitude, map, polylineType, getPitchForPolygon])

  // Restore saved drawings when map is ready
  useEffect(() => {
    if (!map || !apiLoaded || !savedDrawings) return
    
    const google = window.google
    console.log('Restoring saved drawings:', savedDrawings)
    
    // Restore polygons
    if (savedDrawings.polygons && savedDrawings.polygons.length > 0) {
      savedDrawings.polygons.forEach((savedPoly) => {
        const polygon = new google.maps.Polygon({
          paths: savedPoly.path,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          editable: true,
          draggable: false,
          map,
        })
        
        setPolygons(prev => [...prev, polygon])
        setPolygonData(prev => [...prev, {
          polygon,
          flatArea: savedPoly.flatArea,
          pitch: savedPoly.pitch,
          slopedArea: savedPoly.slopedArea,
          squares: savedPoly.squares,
          roofType: savedPoly.roofType || 'standard',  // Default to standard if not specified
        }])
      })
    }
    
    // Restore polylines
    if (savedDrawings.polylines && savedDrawings.polylines.length > 0) {
      savedDrawings.polylines.forEach((savedLine) => {
        const polyline = new google.maps.Polyline({
          path: savedLine.path,
          strokeColor: lineColors[savedLine.type],
          strokeOpacity: 0.8,
          strokeWeight: 3,
          editable: true,
          draggable: false,
          map,
        })
        
        setPolylines(prev => [...prev, polyline])
        setPolylineData(prev => [...prev, {
          polyline,
          length: savedLine.length,
          flatLength: savedLine.flatLength,
          pitch: savedLine.pitch,
          type: savedLine.type,
        }])
      })
    }
  }, [map, apiLoaded, savedDrawings])

  // Overlay RGB image if available
  useEffect(() => {
    if (!map || !rgbImageUrl) return

    // Note: RGB images from dataLayers are GeoTIFF files, not simple images
    // For now, we'll rely on satellite view
    // TODO: Implement GeoTIFF overlay if needed
    console.log('RGB Image URL available:', rgbImageUrl)
  }, [map, rgbImageUrl])

  const startDrawing = (type: 'polygon' | 'polyline') => {
    if (!drawingManager) return
    setDrawingType(type)
    setIsDrawingMode(true)
    drawingManager.setDrawingMode(
      type === 'polygon'
        ? window.google.maps.drawing.OverlayType.POLYGON
        : window.google.maps.drawing.OverlayType.POLYLINE
    )
  }

  const startDrawingPolyline = (type: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake') => {
    setPolylineType(type)
    polylineTypeRef.current = type  // Update ref immediately
    if (drawingManager) {
      // Update color for new type
      drawingManager.setOptions({
        polylineOptions: {
          strokeColor: lineColors[type],
          strokeOpacity: 0.8,
          strokeWeight: 3,
          editable: true,
          draggable: false,
        },
      })
    }
    startDrawing('polyline')
  }

  const cancelDrawing = () => {
    if (!drawingManager) return
    drawingManager.setDrawingMode(null)
    setIsDrawingMode(false)
  }

  const clearAll = () => {
    polygons.forEach((p) => p.setMap(null))
    polylines.forEach((p) => p.setMap(null))
    setPolygons([])
    setPolylines([])
    setPolygonData([])
    setPolylineData([])
    setCustomSquares('')
    toast.success('All drawings cleared')
  }

  const calculateTotalArea = () => {
    if (polygonData.length === 0) return 0
    return polygonData.reduce((sum, data) => sum + data.squares, 0)
  }

  const calculateAreaByType = (type: 'standard' | 'two-story' | 'low-slope') => {
    return polygonData
      .filter(data => data.roofType === type)
      .reduce((sum, data) => sum + data.squares, 0)
  }

  const getTotalLineLength = (type?: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake') => {
    if (polylineData.length === 0) return 0
    const filtered = type
      ? polylineData.filter((data) => data.type === type)
      : polylineData
    return filtered.reduce((sum, data) => sum + data.length, 0)
  }

  const getLineLengthsByType = () => {
    return {
      ridge: getTotalLineLength('ridge'),
      hip: getTotalLineLength('hip'),
      valley: getTotalLineLength('valley'),
      eave: getTotalLineLength('eave'),
      rake: getTotalLineLength('rake'),
    }
  }

  const saveMeasurement = () => {
    const squares = customSquares ? parseFloat(customSquares) : calculateTotalArea()

    if (squares === 0) {
      toast.error('Please draw at least one polygon or enter a manual override')
      return
    }

    // Get polygon coordinates with pitch data
    const polygonCoords = polygonData.map((data) => {
      const path = data.polygon.getPath()
      const coords: any[] = []
      for (let j = 0; j < path.getLength(); j++) {
        const point = path.getAt(j)
        coords.push({ lat: point.lat(), lng: point.lng() })
      }
      return {
        coordinates: coords,
        pitch: data.pitch,
        flatArea: data.flatArea,
        slopedArea: data.slopedArea,
        squares: data.squares,
      }
    })

    // Get polyline coordinates with type data
    const polylineCoords = polylineData.map((data) => {
      const path = data.polyline.getPath()
      const coords: any[] = []
      for (let j = 0; j < path.getLength(); j++) {
        const point = path.getAt(j)
        coords.push({ lat: point.lat(), lng: point.lng() })
      }
      return {
        coordinates: coords,
        length: data.length,
        flatLength: data.flatLength,
        pitch: data.pitch,
        type: data.type,
      }
    })

    const lineLengths = getLineLengthsByType()

    // Calculate total flat squares (sum of all polygon flat areas)
    const flatSquares = polygonData.reduce((sum, data) => sum + (data.flatArea / 100), 0)
    
    // Calculate area by roof type
    const twoStorySquares = calculateAreaByType('two-story')
    const lowSlopeSquares = calculateAreaByType('low-slope')

    const measurementData = {
      squares,
      flatSquares, // Total flat area without pitch multiplier
      twoStorySquares,
      lowSlopeSquares,
      polygons: polygonCoords,
      polylines: polylineCoords,
      lineLengths,
      totalLineLength: getTotalLineLength(),
      // Database-ready fields
      flat_squares: flatSquares,
      actual_squares: squares,
      two_story_squares: twoStorySquares > 0 ? twoStorySquares : null,
      low_slope_squares: lowSlopeSquares > 0 ? lowSlopeSquares : null,
      ridge_feet: lineLengths.ridge,
      hip_feet: lineLengths.hip,
      valley_feet: lineLengths.valley,
      eave_feet: lineLengths.eave,
      rake_feet: lineLengths.rake,
    }

    onMeasurementUpdate?.(squares, measurementData)
    
    const lineSummary = Object.entries(getLineLengthsByType())
      .filter(([_, length]) => length > 0)
      .map(([type, length]) => `${length.toFixed(0)}ft ${type}`)
      .join(', ')
    
    toast.success(
      `Measurement saved: ${squares.toFixed(2)} squares` +
      (lineSummary ? ` + ${lineSummary}` : '')
    )
  }

  // Validate coordinates
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800 font-medium">Invalid coordinates</p>
        <p className="text-xs text-yellow-600 mt-1">Latitude: {latitude}, Longitude: {longitude}</p>
        <p className="text-xs text-yellow-600 mt-2">Please ensure the lead has valid location data</p>
      </div>
    )
  }

  if (!apiLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Container - Made larger */}
      <div className="relative h-[650px] w-full rounded-lg overflow-hidden border bg-gray-100">
        <div ref={mapRef} className="h-full w-full" />

        {/* Drawing Tools Overlay */}
        <Card className="absolute top-4 left-4 p-2 space-y-2 w-40">
          <h4 className="font-semibold text-sm">Drawing Tools</h4>
          
          {!isDrawingMode ? (
            <div className="space-y-2">
              {/* Roof Type Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded p-1">
                <p className="text-xs font-medium text-blue-900 mb-1">Type:</p>
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="sm"
                    variant={roofType === 'standard' ? 'default' : 'outline'}
                    className="w-full text-xs h-6 px-1.5"
                    onClick={() => setRoofType('standard')}
                  >
                    🟦 Std
                  </Button>
                  <Button
                    size="sm"
                    variant={roofType === 'two-story' ? 'default' : 'outline'}
                    className="w-full text-xs h-6 px-1.5"
                    onClick={() => setRoofType('two-story')}
                  >
                    🟧 2-Story
                  </Button>
                  <Button
                    size="sm"
                    variant={roofType === 'low-slope' ? 'default' : 'outline'}
                    className="w-full text-xs h-6 px-1.5"
                    onClick={() => setRoofType('low-slope')}
                  >
                    🟩 Low
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-8 text-xs"
                onClick={() => startDrawing('polygon')}
              >
                <Square className="h-3 w-3 mr-1.5" />
                Draw Polygon
              </Button>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Draw Lines (Click to switch):</p>
                <div className="space-y-1">
                  <Button
                    size="sm"
                    variant={polylineType === 'ridge' && isDrawingMode && drawingType === 'polyline' ? 'default' : 'outline'}
                    className="w-full justify-start text-xs"
                    onClick={() => startDrawingPolyline('ridge')}
                    style={{ borderLeftColor: lineColors.ridge, borderLeftWidth: '3px' }}
                  >
                    <PenTool className="h-3 w-3 mr-2" style={{ color: lineColors.ridge }} />
                    Ridge
                  </Button>
                  <Button
                    size="sm"
                    variant={polylineType === 'hip' && isDrawingMode && drawingType === 'polyline' ? 'default' : 'outline'}
                    className="w-full justify-start text-xs"
                    onClick={() => startDrawingPolyline('hip')}
                    style={{ borderLeftColor: lineColors.hip, borderLeftWidth: '3px' }}
                  >
                    <PenTool className="h-3 w-3 mr-2" style={{ color: lineColors.hip }} />
                    Hip
                  </Button>
                  <Button
                    size="sm"
                    variant={polylineType === 'valley' && isDrawingMode && drawingType === 'polyline' ? 'default' : 'outline'}
                    className="w-full justify-start text-xs"
                    onClick={() => startDrawingPolyline('valley')}
                    style={{ borderLeftColor: lineColors.valley, borderLeftWidth: '3px' }}
                  >
                    <PenTool className="h-3 w-3 mr-2" style={{ color: lineColors.valley }} />
                    Valley
                  </Button>
                  <Button
                    size="sm"
                    variant={polylineType === 'eave' && isDrawingMode && drawingType === 'polyline' ? 'default' : 'outline'}
                    className="w-full justify-start text-xs"
                    onClick={() => startDrawingPolyline('eave')}
                    style={{ borderLeftColor: lineColors.eave, borderLeftWidth: '3px' }}
                  >
                    <PenTool className="h-3 w-3 mr-2" style={{ color: lineColors.eave }} />
                    Eave
                  </Button>
                  <Button
                    size="sm"
                    variant={polylineType === 'rake' && isDrawingMode && drawingType === 'polyline' ? 'default' : 'outline'}
                    className="w-full justify-start text-xs"
                    onClick={() => startDrawingPolyline('rake')}
                    style={{ borderLeftColor: lineColors.rake, borderLeftWidth: '3px' }}
                  >
                    <PenTool className="h-3 w-3 mr-2" style={{ color: lineColors.rake }} />
                    Rake
                  </Button>
                </div>
              </div>
              
              {(polygons.length > 0 || polylines.length > 0) && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full justify-start mt-2"
                  onClick={clearAll}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="default" className="w-full justify-center">
                Drawing {drawingType === 'polyline' ? polylineType : 'polygon'}...
              </Badge>
              <p className="text-xs text-muted-foreground">
                Click points to draw. Double-click to finish.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={cancelDrawing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Measurement Summary */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3">Measurement Summary</h4>
        
        {/* Polygons */}
        {polygonData.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-muted-foreground">Roof Outlines:</p>
            {polygonData.map((data, i) => (
              <div key={i} className="text-xs bg-muted/50 p-2 rounded">
                <div className="flex justify-between">
                  <span>Polygon #{i + 1}</span>
                  <span className="font-mono font-semibold">{data.squares.toFixed(2)} sq</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Pitch: {data.pitch.toFixed(1)}°</span>
                  <span>Flat: {(data.flatArea / 100).toFixed(2)} sq</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total Area:</span>
                <span className="text-lg">{calculateTotalArea().toFixed(2)} squares</span>
              </div>
            </div>
          </div>
        )}

        {/* Polylines */}
        {polylineData.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-muted-foreground">Ridge/Hip/Valley/Eave/Rake Lines:</p>
            
            {/* Group by type */}
            {(['ridge', 'hip', 'valley', 'eave', 'rake'] as const).map((type) => {
              const linesOfType = polylineData.filter((data) => data.type === type)
              if (linesOfType.length === 0) return null
              
              return (
                <div key={type} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground capitalize">{type}:</p>
                  {linesOfType.map((data, i) => {
                    const isSloped = type === 'hip' || type === 'valley' || type === 'rake'
                    return (
                      <div key={`${type}-${i}`} className="text-xs bg-muted/50 p-2 rounded ml-2">
                        <div className="flex justify-between">
                          <span>{type.charAt(0).toUpperCase() + type.slice(1)} #{i + 1}</span>
                          <span className="font-mono">{data.length} ft</span>
                        </div>
                        {isSloped && data.pitch > 0 && (
                          <div className="flex justify-between text-muted-foreground mt-1 text-[10px]">
                            <span>Pitch: {data.pitch.toFixed(1)}°</span>
                            <span>Flat: {data.flatLength} ft</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="ml-2 flex justify-between text-xs font-medium">
                    <span>Subtotal:</span>
                    <span>{getTotalLineLength(type).toFixed(2)} ft</span>
                  </div>
                </div>
              )
            })}
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total Length:</span>
                <span className="font-semibold">{getTotalLineLength().toFixed(2)} ft</span>
              </div>
            </div>
          </div>
        )}

        {polygonData.length === 0 && polylineData.length === 0 && (
          <p className="text-sm text-muted-foreground">No drawings yet</p>
        )}

        {/* Manual Override */}
        <div className="pt-4 border-t">
          <Label htmlFor="custom-squares" className="text-xs">
            Manual Override (Optional)
          </Label>
          <Input
            id="custom-squares"
            type="number"
            step="0.01"
            placeholder="Override calculated squares"
            value={customSquares}
            onChange={(e) => setCustomSquares(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={saveMeasurement} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Measurement
          </Button>
        </div>

        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {segments && segments.length > 0 ? (
            <>
              <p>💡 <strong>Pitch is auto-detected</strong> from satellite segments</p>
              <p>📐 Sloped area = Flat area ÷ cos(pitch)</p>
            </>
          ) : (
            <>
              <p>💡 <strong>Manual mode:</strong> Pitch defaults to 0° (flat roof)</p>
              <p>📐 Enter pitch manually in the form below or run Auto-Measure</p>
            </>
          )}
          <p>📏 <strong>Hip/Valley/Rake lines apply pitch</strong> - Ridge/Eave don't (horizontal)</p>
          <p>🎨 Lines are <strong>color-coded</strong> by type for easy identification</p>
        </div>
      </Card>
    </div>
  )
}
