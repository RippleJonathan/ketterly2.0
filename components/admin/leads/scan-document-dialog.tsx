'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Webcam from 'react-webcam'
import jsPDF from 'jspdf'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Check, X, Plus, Trash2, RotateCcw, Save, Loader2, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import {
  ScanPage,
  DetectedCorners,
  autoDetectDocument,
  applyPerspectiveTransform,
  enhanceDocument,
  canvasToBase64,
  compressImage,
  generatePageId,
} from '@/lib/utils/document-scanner'

interface ScanDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  onSuccess: () => void
}

type ScanStep = 'camera' | 'preview' | 'all-pages'

export function ScanDocumentDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  onSuccess,
}: ScanDocumentDialogProps) {
  const queryClient = useQueryClient()
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [step, setStep] = useState<ScanStep>('camera')
  const [pages, setPages] = useState<ScanPage[]>([])
  const [currentCorners, setCurrentCorners] = useState<DetectedCorners | null>(null)
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [draggedCorner, setDraggedCorner] = useState<keyof DetectedCorners | null>(null)

  // No auto-detection - user captures then adjusts corners manually

  // Handle camera errors
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Camera error:', error)
    if (typeof error === 'string') {
      setCameraError(error)
    } else if (error.name === 'NotAllowedError') {
      setCameraError('Camera access denied. Please enable camera permissions.')
    } else if (error.name === 'NotFoundError') {
      setCameraError('No camera found on this device.')
    } else {
      setCameraError('Failed to access camera.')
    }
  }, [])

  // Capture current frame - snap photo and set default corners for user to adjust
  const handleCapture = useCallback(() => {
    const videoElement = webcamRef.current?.video
    const canvas = canvasRef.current

    if (!videoElement || !canvas) {
      toast.error('Camera not ready')
      return
    }

    setIsProcessing(true)

    try {
      // Set canvas to video dimensions
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(videoElement, 0, 0)

      // DON'T transform yet - just capture the raw image
      // User will see full image in preview and can adjust corners if needed
      const imageData = canvas.toDataURL('image/jpeg', 0.92)

      // Set default corners (full frame) - user can adjust in preview
      const defaultCorners: DetectedCorners = {
        topLeft: { x: canvas.width * 0.05, y: canvas.height * 0.05 },
        topRight: { x: canvas.width * 0.95, y: canvas.height * 0.05 },
        bottomRight: { x: canvas.width * 0.95, y: canvas.height * 0.95 },
        bottomLeft: { x: canvas.width * 0.05, y: canvas.height * 0.95 },
      }

      // Create page object with RAW image
      const newPage: ScanPage = {
        id: generatePageId(),
        imageData,
        corners: defaultCorners,
        timestamp: Date.now(),
      }

      setPages((prev) => [...prev, newPage])
      setCurrentCorners(defaultCorners)
      setEditingPageIndex(pages.length) // Index of the new page
      setStep('preview')
      toast.success('Page captured! Adjust corners to crop, then add more pages or finish.')
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('Failed to capture page')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Retake current page
  const handleRetake = useCallback(() => {
    setPages((prev) => prev.slice(0, -1))
    setStep('camera')
    setCurrentCorners(null)
  }, [])

  // Add another page
  const handleAddPage = useCallback(() => {
    setStep('camera')
    setCurrentCorners(null)
    setEditingPageIndex(null)
  }, [])

  // Preview all pages before saving
  const handlePreviewAll = useCallback(() => {
    if (pages.length === 0) {
      toast.error('No pages to preview')
      return
    }
    setStep('all-pages')
  }, [pages])

  // Delete a page
  const handleDeletePage = useCallback((pageId: string) => {
    setPages((prev) => prev.filter((p) => p.id !== pageId))
    toast.success('Page deleted')
  }, [])

  // Generate PDF and save
  const handleSave = useCallback(async () => {
    if (pages.length === 0) {
      toast.error('No pages to save')
      return
    }

    if (!documentTitle.trim()) {
      toast.error('Please enter a document title')
      return
    }

    setIsSaving(true)

    try {
      // Apply perspective transform and compress images before sending
      const processedPages = await Promise.all(
        pages.map(async (page) => {
          // Apply perspective transform using corners
          const transformedImage = await applyPerspectiveTransform(page.imageData, page.corners)
          
          // Enhance the document (increase contrast, sharpen)
          const enhancedImage = await enhanceDocument(transformedImage)
          
          // Compress for upload with high quality settings
          const compressedImage = await compressImage(enhancedImage, 2400, 3200, 0.92)
          
          return {
            ...page,
            imageData: compressedImage,
          }
        })
      )

      // Send to API to generate PDF
      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          title: documentTitle,
          pages: processedPages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to save document'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        console.error('Document save failed:', { status: response.status, error: errorMessage })
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Invalidate documents cache to show new document immediately
      queryClient.invalidateQueries({ queryKey: ['documents', leadId] })
      
      toast.success(`Document "${documentTitle}" saved successfully!`)
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save document')
    } finally {
      setIsSaving(false)
    }
  }, [pages, documentTitle, leadId, onSuccess])

  // Handle corner dragging for manual adjustment
  const handleCornerMouseDown = useCallback((corner: keyof DetectedCorners) => {
    setDraggedCorner(corner)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!draggedCorner || !currentCorners || !canvasRef.current || editingPageIndex === null) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      let clientX: number
      let clientY: number

      if ('touches' in e) {
        // Touch event
        if (e.touches.length === 0) return
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        // Mouse event
        clientX = e.clientX
        clientY = e.clientY
      }

      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY

      const newCorners = {
        ...currentCorners,
        [draggedCorner]: { x, y },
      }

      setCurrentCorners(newCorners)

      // Update the page's corners
      setPages((prev) =>
        prev.map((page, index) =>
          index === editingPageIndex ? { ...page, corners: newCorners } : page
        )
      )
    },
    [draggedCorner, currentCorners, editingPageIndex]
  )

  const handleMouseUp = useCallback(() => {
    setDraggedCorner(null)
  }, [])

  const handleTouchStart = useCallback((corner: keyof DetectedCorners) => {
    setDraggedCorner(corner)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!draggedCorner || !currentCorners || !canvasRef.current || editingPageIndex === null) return

      e.preventDefault() // Prevent scrolling while dragging

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if (e.touches.length === 0) return
      const touch = e.touches[0]

      const x = (touch.clientX - rect.left) * scaleX
      const y = (touch.clientY - rect.top) * scaleY

      const newCorners = {
        ...currentCorners,
        [draggedCorner]: { x, y },
      }

      setCurrentCorners(newCorners)

      // Update the page's corners
      setPages((prev) =>
        prev.map((page, index) =>
          index === editingPageIndex ? { ...page, corners: newCorners } : page
        )
      )
    },
    [draggedCorner, currentCorners, editingPageIndex]
  )

  const handleTouchEnd = useCallback(() => {
    setDraggedCorner(null)
  }, [])

  // Reset and close
  const handleClose = useCallback(() => {
    setPages([])
    setStep('camera')
    setCurrentCorners(null)
    setDocumentTitle('')
    setCameraError(null)
    setDraggedCorner(null)
    onOpenChange(false)
  }, [onOpenChange])

  // Draw edge overlay on canvas (for camera and preview)
  const drawEdgeOverlay = useCallback(() => {
    if (!currentCorners || !canvasRef.current) return

    const canvas = canvasRef.current
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.error('canvasRef.current is not a canvas element')
      return
    }
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (step === 'camera') {
      // Camera view: draw video + corners
      const videoElement = webcamRef.current?.video
      if (!videoElement) return
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      
      // Draw corners overlay
      drawCornersOverlay(ctx, currentCorners)
    } else if (step === 'preview' && editingPageIndex !== null) {
      // Preview: draw captured image + corners
      const page = pages[editingPageIndex]
      if (!page) return

      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Clear and draw image
        const freshCtx = canvas.getContext('2d')
        if (!freshCtx) return
        
        freshCtx.clearRect(0, 0, canvas.width, canvas.height)
        freshCtx.drawImage(img, 0, 0)

        // Draw corners overlay
        drawCornersOverlay(freshCtx, currentCorners)
      }
      img.onerror = (err) => {
        console.error('Failed to load preview image:', err)
      }
      img.src = page.imageData
      return // Don't draw corners yet, wait for image to load
    }
  }, [currentCorners, step, editingPageIndex, pages])

  // Helper to draw corners
  const drawCornersOverlay = useCallback((ctx: CanvasRenderingContext2D, corners: DetectedCorners) => {
    // Draw detected corners
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 3
    ctx.fillStyle = '#22c55e'

    ctx.beginPath()
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y)
    ctx.lineTo(corners.topRight.x, corners.topRight.y)
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y)
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y)
    ctx.closePath()
    ctx.stroke()

    // Draw corner handles (larger for mobile)
    const cornerHandles = [
      { corner: corners.topLeft, label: 'TL' },
      { corner: corners.topRight, label: 'TR' },
      { corner: corners.bottomRight, label: 'BR' },
      { corner: corners.bottomLeft, label: 'BL' },
    ]

    cornerHandles.forEach(({ corner, label }) => {
      // Outer circle (larger for touch)
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, 20, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
      ctx.fill()

      // Inner circle
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI)
      ctx.fillStyle = '#22c55e'
      ctx.fill()

      // Label
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, corner.x, corner.y)
    })
  }, [])

  // Update overlay when corners change
  useEffect(() => {
    if (step === 'camera') {
      const interval = setInterval(drawEdgeOverlay, 100)
      return () => clearInterval(interval)
    } else if (step === 'preview' && currentCorners) {
      // Draw preview with corners once when entering preview
      drawEdgeOverlay()
    }
  }, [step, drawEdgeOverlay, currentCorners])

  // Redraw when corners change in preview mode
  useEffect(() => {
    if (step === 'preview' && currentCorners) {
      drawEdgeOverlay()
    }
  }, [currentCorners, step, drawEdgeOverlay])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Document
          </DialogTitle>
          <DialogDescription>
            {step === 'camera' && 'Snap a photo of your document, then review and adjust as needed.'}
            {step === 'preview' && 'Review the captured page or add more pages.'}
            {step === 'all-pages' && 'Review all pages and save as PDF.'}
          </DialogDescription>
        </DialogHeader>

        {/* Camera View */}
        {step === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <Card className="p-8 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-red-600 font-medium mb-2">Camera Error</p>
                <p className="text-sm text-gray-600">{cameraError}</p>
                <Button onClick={() => setCameraError(null)} className="mt-4">
                  Try Again
                </Button>
              </Card>
            ) : (
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                {/* Webcam for video stream */}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: 'environment', // Use back camera on mobile
                    aspectRatio: 4/3, // Better for documents
                  }}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />

                {/* Overlay canvas for edge detection */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair pointer-events-none"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ zIndex: 10, pointerEvents: draggedCorner ? 'auto' : 'none' }}
                />

                {/* Page count badge */}
                {pages.length > 0 && (
                  <Badge className="absolute top-4 right-4 bg-green-600">
                    {pages.length} page{pages.length > 1 ? 's' : ''} captured
                  </Badge>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCapture}
                disabled={isProcessing || cameraError !== null}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Snap Photo
                  </>
                )}
              </Button>

              {pages.length > 0 && (
                <Button onClick={handlePreviewAll} variant="outline">
                  Done ({pages.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Single Page Preview with Adjustable Corners */}
        {step === 'preview' && pages.length > 0 && editingPageIndex !== null && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-2 relative">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded touch-none"
                style={{ maxHeight: '60vh', objectFit: 'contain' }}
                onMouseDown={(e) => {
                  if (!currentCorners) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width
                  const y = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height

                  // Find closest corner
                  const corners = Object.entries(currentCorners) as [keyof DetectedCorners, { x: number; y: number }][]
                  const closest = corners.reduce((prev, [key, corner]) => {
                    const dist = Math.sqrt((corner.x - x) ** 2 + (corner.y - y) ** 2)
                    return dist < prev.dist ? { key, dist } : prev
                  }, { key: 'topLeft' as keyof DetectedCorners, dist: Infinity })

                  if (closest.dist < 50) {
                    handleCornerMouseDown(closest.key)
                  }
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={(e) => {
                  if (!currentCorners || e.touches.length === 0) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const touch = e.touches[0]
                  const x = ((touch.clientX - rect.left) / rect.width) * e.currentTarget.width
                  const y = ((touch.clientY - rect.top) / rect.height) * e.currentTarget.height

                  // Find closest corner
                  const corners = Object.entries(currentCorners) as [keyof DetectedCorners, { x: number; y: number }][]
                  const closest = corners.reduce((prev, [key, corner]) => {
                    const dist = Math.sqrt((corner.x - x) ** 2 + (corner.y - y) ** 2)
                    return dist < prev.dist ? { key, dist } : prev
                  }, { key: 'topLeft' as keyof DetectedCorners, dist: Infinity })

                  if (closest.dist < 50) {
                    handleTouchStart(closest.key)
                  }
                }}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
              <p className="text-center text-sm text-white mt-2">
                Drag the green corners to crop the document
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRetake} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button onClick={handleAddPage} variant="outline" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
              <Button onClick={handlePreviewAll} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}

        {/* All Pages Preview */}
        {step === 'all-pages' && (
          <div className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pages.map((page, index) => (
                <div key={page.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    <Badge variant="outline">Page {index + 1}</Badge>
                  </div>
                  <img
                    src={page.imageData}
                    alt={`Page ${index + 1}`}
                    className="w-24 h-auto rounded border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      Captured {new Date(page.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePage(page.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentTitle">Document Title</Label>
              <Input
                id="documentTitle"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={`Scanned Document - ${leadName}`}
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddPage} variant="outline" disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !documentTitle.trim()} className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing || isSaving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
