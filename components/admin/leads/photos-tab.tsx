'use client'

import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { useLeadPhotos, useUploadPhoto, useDeletePhoto, useUpdatePhoto } from '@/lib/hooks/use-photos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, X, Download, Loader2, Image as ImageIcon, Tag, Edit2, Trash2, Camera, ZoomIn, Share2 } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface PhotosTabProps {
  leadId: string
  leadName: string
}

const PHOTO_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'before', label: 'Before' },
  { value: 'during', label: 'During Work' },
  { value: 'after', label: 'After' },
  { value: 'damage', label: 'Damage' },
  { value: 'measurement', label: 'Measurements' },
]

export function PhotosTab({ leadId, leadName }: PhotosTabProps) {
  const { data: photosResponse, isLoading } = useLeadPhotos(leadId)
  const uploadPhoto = useUploadPhoto(leadId)
  const deletePhoto = useDeletePhoto(leadId)
  const updatePhoto = useUpdatePhoto(leadId)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState('general')
  const [uploadCaption, setUploadCaption] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<{ id: string; url: string } | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const photos = photosResponse?.data || []
  const filteredPhotos = filterCategory === 'all'
    ? photos
    : photos.filter(p => p.category === filterCategory)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      
      // Show loading toast
      const toastId = toast.loading(`Compressing and uploading ${files.length} photo(s)...`)
      
      try {
        // Compression options for fast uploads with good quality
        const compressionOptions = {
          maxSizeMB: 1,              // Max 1MB file size
          maxWidthOrHeight: 1920,     // Max dimension (full HD)
          useWebWorker: true,         // Don't block UI
          fileType: 'image/jpeg',     // Convert to JPEG for better compression
          initialQuality: 0.8,        // 80% quality (barely noticeable)
        }
        
        // Auto-upload camera photos immediately with compression
        for (const file of files) {
          try {
            // Compress the image
            const compressedFile = await imageCompression(file, compressionOptions)
            
            console.log(`📸 Photo compression:`, {
              originalSize: formatBytes(file.size),
              compressedSize: formatBytes(compressedFile.size),
              reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
            })
            
            // Upload compressed file
            await uploadPhoto.mutateAsync({
              file: compressedFile,
              category: uploadCategory,
              caption: uploadCaption || undefined,
            })
          } catch (compressionError) {
            console.error('Compression failed, uploading original:', compressionError)
            // Fallback to original file if compression fails
            await uploadPhoto.mutateAsync({
              file,
              category: uploadCategory,
              caption: uploadCaption || undefined,
            })
          }
        }
        
        // Success feedback
        toast.success(`${files.length} photo(s) uploaded successfully!`, { id: toastId })
      } catch (error) {
        toast.error('Failed to upload photo(s)', { id: toastId })
      }

      // Reset camera input
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      
      // Clear caption after upload
      setUploadCaption('')
    }
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    // Show loading toast
    const toastId = toast.loading(`Compressing and uploading ${selectedFiles.length} photo(s)...`)

    try {
      // Compression options
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      }

      for (const file of selectedFiles) {
        try {
          // Compress before upload
          const compressedFile = await imageCompression(file, compressionOptions)
          
          await uploadPhoto.mutateAsync({
            file: compressedFile,
            category: uploadCategory,
            caption: uploadCaption || undefined,
          })
        } catch (compressionError) {
          // Fallback to original
          await uploadPhoto.mutateAsync({
            file,
            category: uploadCategory,
            caption: uploadCaption || undefined,
          })
        }
      }

      toast.success(`${selectedFiles.length} photo(s) uploaded!`, { id: toastId })
    } catch (error) {
      toast.error('Upload failed', { id: toastId })
    }

    // Reset form
    setSelectedFiles([])
    setUploadCaption('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteClick = (photoId: string, fileUrl: string) => {
    setPhotoToDelete({ id: photoId, url: fileUrl })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!photoToDelete) return
    await deletePhoto.mutateAsync({ photoId: photoToDelete.id, fileUrl: photoToDelete.url })
    setDeleteDialogOpen(false)
    setPhotoToDelete(null)
  }

  const handleEditClick = (photo: any) => {
    setEditingPhoto(photo.id)
    setEditCategory(photo.category)
    setEditCaption(photo.caption || '')
  }

  const handleSaveEdit = async (photoId: string) => {
    await updatePhoto.mutateAsync({
      photoId,
      updates: {
        category: editCategory,
        caption: editCaption || undefined,
      },
    })
    setEditingPhoto(null)
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      // For mobile: Try to save to Photos using Share API
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // Fetch the image as a blob
        const response = await fetch(url)
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: blob.type })
        
        // Share/Save to device
        await navigator.share({
          files: [file],
          title: 'Save Photo',
        })
      } else {
        // Desktop: Standard download
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      // Fallback: Open in new tab (user can long-press to save on mobile)
      window.open(url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Photos
          </CardTitle>
          <CardDescription>
            Add photos for {leadName} - before, during, or after work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="photo-files">Select Photos</Label>
            <div className="flex gap-2 mt-1">
              <Input
                ref={fileInputRef}
                id="photo-files"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="flex-1"
              />
              {/* Mobile Camera Button */}
              <Button
                type="button"
                variant="outline"
                onClick={openCamera}
                className="shrink-0"
                title="Take Photo"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            {/* Hidden camera input for mobile devices */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedFiles.length} file(s) selected ({formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0))})
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Add a description..."
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploadPhoto.isPending}
            className="w-full"
          >
            {uploadPhoto.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Photo(s)` : 'Photos'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photos ({filteredPhotos.length})
            </CardTitle>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PHOTO_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No photos uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload photos using the form above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPhotos.map((photo: any) => (
                <div 
                  key={photo.id} 
                  className="group relative bg-white border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setLightboxPhoto(photo)
                    setLightboxOpen(true)
                  }}
                >
                  {/* Thumbnail Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={photo.file_url}
                      alt={photo.caption || photo.file_name}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay with zoom icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Photo info */}
                  <div className="p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 truncate">
                        {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label || photo.category}
                      </span>
                    </div>
                    {photo.caption && (
                      <p className="text-xs text-gray-700 mb-1 line-clamp-2">{photo.caption}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate">
                      {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {lightboxPhoto && (
            <div className="relative">
              {/* Full size image */}
              <img
                src={lightboxPhoto.file_url}
                alt={lightboxPhoto.caption || lightboxPhoto.file_name}
                className="w-full h-auto max-h-[85vh] object-contain bg-black"
              />
              
              {/* Photo info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {lightboxPhoto.caption && (
                      <p className="text-white font-medium mb-1">{lightboxPhoto.caption}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-white/80">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {PHOTO_CATEGORIES.find(c => c.value === lightboxPhoto.category)?.label || lightboxPhoto.category}
                      </span>
                      <span>{formatBytes(lightboxPhoto.file_size)}</span>
                      <span>{formatDistanceToNow(new Date(lightboxPhoto.uploaded_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(lightboxPhoto.file_url, lightboxPhoto.file_name)
                      }}
                      className="hidden sm:flex"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {/* Mobile: Save/Share button */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(lightboxPhoto.file_url, lightboxPhoto.file_name)
                      }}
                      className="sm:hidden"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClick(lightboxPhoto)
                        setLightboxOpen(false)
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(lightboxPhoto.id, lightboxPhoto.file_url)
                        setLightboxOpen(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Photo Dialog */}
      <Dialog open={editingPhoto !== null} onOpenChange={(open) => !open && setEditingPhoto(null)}>
        <DialogContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Edit Photo</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-caption">Caption</Label>
                <Input
                  id="edit-caption"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Add a description..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditingPhoto(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => editingPhoto && handleSaveEdit(editingPhoto)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
