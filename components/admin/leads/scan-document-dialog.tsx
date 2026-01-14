'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [step, setStep] = useState<ScanStep>('camera')
  const [pages, setPages] = useState<ScanPage[]>([])
  const [currentCorners, setCurrentCorners] = useState<DetectedCorners | null>(null)
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
      setStep('preview')
      toast.success('Page captured! Review or add more pages.')
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
      // Compress images before sending
      const compressedPages = await Promise.all(
        pages.map(async (page) => ({
          ...page,
          imageData: await compressImage(page.imageData, 1200, 1800, 0.8),
        }))
      )

      // Send to API to generate PDF
      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          title: documentTitle,
          pages: compressedPages,
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
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggedCorner || !currentCorners || !canvasRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      setCurrentCorners({
        ...currentCorners,
        [draggedCorner]: { x, y },
      })
    },
    [draggedCorner, currentCorners]
  )

  const handleMouseUp = useCallback(() => {
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

  // Draw edge overlay on canvas
  const drawEdgeOverlay = useCallback(() => {
    if (!currentCorners || !canvasRef.current || step !== 'camera') return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const videoElement = webcamRef.current?.video
    if (!videoElement) return

    // Clear and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    // Draw detected corners
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 3
    ctx.fillStyle = '#22c55e'

    ctx.beginPath()
    ctx.moveTo(currentCorners.topLeft.x, currentCorners.topLeft.y)
    ctx.lineTo(currentCorners.topRight.x, currentCorners.topRight.y)
    ctx.lineTo(currentCorners.bottomRight.x, currentCorners.bottomRight.y)
    ctx.lineTo(currentCorners.bottomLeft.x, currentCorners.bottomLeft.y)
    ctx.closePath()
    ctx.stroke()

    // Draw corner handles
    const corners = [
      currentCorners.topLeft,
      currentCorners.topRight,
      currentCorners.bottomRight,
      currentCorners.bottomLeft,
    ]

    corners.forEach((corner) => {
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI)
      ctx.fill()
    })
  }, [currentCorners, step])

  // Update overlay when corners change
  useEffect(() => {
    if (step === 'camera') {
      const interval = setInterval(drawEdgeOverlay, 100)
      return () => clearInterval(interval)
    }
  }, [step, drawEdgeOverlay])

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

        {/* Single Page Preview */}
        {step === 'preview' && pages.length > 0 && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <img
                src={pages[pages.length - 1].imageData}
                alt="Captured page"
                className="w-full h-auto rounded"
              />
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
