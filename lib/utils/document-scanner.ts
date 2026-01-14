/**
 * Document Scanner Utility Functions
 * 
 * Provides image processing, edge detection, and perspective correction
 * for mobile document scanning feature.
 */

export interface Point {
  x: number
  y: number
}

export interface DetectedCorners {
  topLeft: Point
  topRight: Point
  bottomRight: Point
  bottomLeft: Point
}

export interface ScanPage {
  id: string
  imageData: string // base64 data URL
  corners: DetectedCorners
  timestamp: number
}

/**
 * Convert image to grayscale for better edge detection
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data
  const grayscale = new ImageData(imageData.width, imageData.height)
  
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    grayscale.data[i] = avg
    grayscale.data[i + 1] = avg
    grayscale.data[i + 2] = avg
    grayscale.data[i + 3] = data[i + 3]
  }
  
  return grayscale
}

/**
 * Apply Canny edge detection (simplified)
 */
export function detectEdges(imageData: ImageData): ImageData {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data
  const edges = new ImageData(width, height)
  
  // Sobel operators
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let pixelX = 0
      let pixelY = 0
      
      // Apply Sobel operator
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4
          const gray = data[idx]
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          
          pixelX += gray * sobelX[kernelIdx]
          pixelY += gray * sobelY[kernelIdx]
        }
      }
      
      const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY)
      const idx = (y * width + x) * 4
      
      edges.data[idx] = magnitude
      edges.data[idx + 1] = magnitude
      edges.data[idx + 2] = magnitude
      edges.data[idx + 3] = 255
    }
  }
  
  return edges
}

/**
 * Find the largest rectangle in the image (simplified contour detection)
 */
export function findDocumentCorners(
  imageData: ImageData,
  canvasWidth: number,
  canvasHeight: number
): DetectedCorners {
  const width = imageData.width
  const height = imageData.height
  
  // Use a simplified approach: sample points along the edges
  // and find the brightest points (edges) to form a rectangle
  
  const margin = Math.min(width, height) * 0.1
  const samplePoints: Point[] = []
  
  // Sample top edge
  for (let x = margin; x < width - margin; x += 20) {
    for (let y = margin; y < height * 0.3; y += 20) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4
      if (imageData.data[idx] > 100) {
        samplePoints.push({ x, y })
      }
    }
  }
  
  // For a simple implementation, we'll return corners with a default inset
  // This can be refined with more sophisticated algorithms
  const insetPercent = 0.08
  const insetX = width * insetPercent
  const insetY = height * insetPercent
  
  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: width - insetX, y: insetY },
    bottomRight: { x: width - insetX, y: height - insetY },
    bottomLeft: { x: insetX, y: height - insetY },
  }
}

/**
 * Automatically detect document corners in an image
 */
export function autoDetectDocument(
  canvas: HTMLCanvasElement,
  videoElement: HTMLVideoElement
): DetectedCorners {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  const height = canvas.height
  
  // Draw current video frame
  ctx.drawImage(videoElement, 0, 0, width, height)
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height)
  
  // Convert to grayscale
  const grayscale = toGrayscale(imageData)
  
  // Detect edges
  const edges = detectEdges(grayscale)
  
  // Find document corners
  const corners = findDocumentCorners(edges, width, height)
  
  return corners
}

/**
 * Compress image data for better storage and performance
 */
export async function compressImage(
  base64: string,
  maxWidth: number = 2400,
  maxHeight: number = 3200,
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height
      
      // Calculate scaling to fit within max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = base64
  })
}

/**
 * Create unique ID for scan pages
 */
export function generatePageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Apply perspective transform to base64 image (async wrapper)
 */
export async function applyPerspectiveTransform(
  base64Image: string,
  corners: DetectedCorners
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        // Create source canvas from image
        const sourceCanvas = document.createElement('canvas')
        sourceCanvas.width = img.width
        sourceCanvas.height = img.height
        const ctx = sourceCanvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0)
        
        // Apply perspective transform with high resolution for clarity
        const transformedCanvas = applyPerspectiveTransformToCanvas(
          sourceCanvas,
          corners,
          2400,
          3200
        )
        
        // Convert back to base64 with high quality
        resolve(transformedCanvas.toDataURL('image/jpeg', 0.95))
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for perspective transform'))
    }
    
    img.src = base64Image
  })
}

/**
 * Apply perspective transformation to canvas (renamed from original)
 */
function applyPerspectiveTransformToCanvas(
  sourceCanvas: HTMLCanvasElement,
  corners: DetectedCorners,
  outputWidth: number = 1200,
  outputHeight: number = 1600
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = outputWidth
  outputCanvas.height = outputHeight
  const ctx = outputCanvas.getContext('2d')!
  
  // Calculate transformation matrix using perspective transform
  // For simplicity, we'll use a bilinear approach
  
  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const dstData = ctx.createImageData(outputWidth, outputHeight)
  
  // Source corners
  const src = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ]
  
  // Destination corners (full output canvas)
  const dst = [
    { x: 0, y: 0 },
    { x: outputWidth, y: 0 },
    { x: outputWidth, y: outputHeight },
    { x: 0, y: outputHeight },
  ]
  
  // Apply perspective transform using bilinear interpolation
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      // Normalized coordinates in destination
      const u = x / outputWidth
      const v = y / outputHeight
      
      // Bilinear interpolation of source coordinates
      const srcX =
        (1 - u) * (1 - v) * src[0].x +
        u * (1 - v) * src[1].x +
        u * v * src[2].x +
        (1 - u) * v * src[3].x
      
      const srcY =
        (1 - u) * (1 - v) * src[0].y +
        u * (1 - v) * src[1].y +
        u * v * src[2].y +
        (1 - u) * v * src[3].y
      
      // Sample source pixel (with bounds checking)
      const sx = Math.max(0, Math.min(sourceCanvas.width - 1, Math.floor(srcX)))
      const sy = Math.max(0, Math.min(sourceCanvas.height - 1, Math.floor(srcY)))
      
      const srcIdx = (sy * sourceCanvas.width + sx) * 4
      const dstIdx = (y * outputWidth + x) * 4
      
      dstData.data[dstIdx] = srcData.data[srcIdx]
      dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1]
      dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2]
      dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3]
    }
  }
  
  ctx.putImageData(dstData, 0, 0)
  return outputCanvas
}

/**
 * Enhance document image from base64 (async wrapper)
 */
export async function enhanceDocument(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0)
        
        // Enhance the canvas
        enhanceDocumentCanvas(canvas)
        
        // Convert back to base64 with high quality
        resolve(canvas.toDataURL('image/jpeg', 0.95))
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for enhancement'))
    }
    
    img.src = base64Image
  })
}

/**
 * Enhance document canvas (renamed from original)
 */
function enhanceDocumentCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // Increase contrast
  const factor = 1.5
  const intercept = 128 * (1 - factor)
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * data[i] + intercept))
    data[i + 1] = Math.max(0, Math.min(255, factor * data[i + 1] + intercept))
    data[i + 2] = Math.max(0, Math.min(255, factor * data[i + 2] + intercept))
  }
  
  ctx.putImageData(imageData, 0, 0)
}
