'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2, FlipHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'

interface CameraCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => Promise<void>
  leadName?: string
}

export function CameraCaptureModal({ open, onOpenChange, onCapture, leadName }: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment') // Back camera by default
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Start camera when modal opens
  useEffect(() => {
    if (open) {
      startCamera()
      checkMultipleCameras()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [open, facingMode])

  const checkMultipleCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
    }
  }

  const startCamera = async () => {
    try {
      // Stop existing stream first
      stopCamera()

      // Request camera access with constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Failed to start camera:', error)
      toast.error('Camera access denied. Please enable camera permissions in your browser settings.')
      onOpenChange(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Failed to get canvas context')
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          },
          'image/jpeg',
          0.9
        )
      })

      // Create file from blob
      const timestamp = new Date().getTime()
      const fileName = `photo_${timestamp}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      // Compress the image
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      }

      const compressedFile = await imageCompression(file, compressionOptions)

      console.log(`📸 Camera capture:`, {
        originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
      })

      // Upload the photo (parent handles the upload)
      await onCapture(compressedFile)

      // Visual feedback
      toast.success('Photo captured! Uploading in background...')

      // Brief flash effect
      if (canvas) {
        canvas.style.opacity = '0.3'
        setTimeout(() => {
          if (canvas) canvas.style.opacity = '1'
        }, 100)
      }
    } catch (error) {
      console.error('Failed to capture photo:', error)
      toast.error('Failed to capture photo')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-black flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center justify-between text-white">
              <DialogTitle className="text-lg font-semibold">
                {leadName ? `Take Photos - ${leadName}` : 'Take Photos'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-white/80 mt-1">
              Photos upload automatically in the background. Keep taking photos!
            </p>
          </div>

          {/* Camera Preview */}
          <div className="flex-1 flex items-center justify-center relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture button overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-center gap-6">
                {/* Flip camera button (if multiple cameras) */}
                {hasMultipleCameras && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={flipCamera}
                    disabled={isCapturing}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur"
                  >
                    <FlipHorizontal className="h-5 w-5" />
                  </Button>
                )}

                {/* Capture button */}
                <Button
                  size="lg"
                  onClick={capturePhoto}
                  disabled={isCapturing || !stream}
                  className="h-20 w-20 rounded-full bg-white hover:bg-white/90 text-black p-0"
                >
                  {isCapturing ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </Button>

                {/* Spacer for symmetry */}
                {hasMultipleCameras && (
                  <div className="w-[72px]" />
                )}
              </div>

              <p className="text-center text-white/70 text-sm mt-4">
                Tap to capture • Photos compress and upload automatically
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
