'use client'

import { useState, useRef } from 'react'
import { useLeadPhotos, useUploadPhoto, useDeletePhoto, useUpdatePhoto } from '@/lib/hooks/use-photos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Upload, X, Download, Loader2, Image as ImageIcon, Tag, Edit2, Trash2, Camera } from 'lucide-react'
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
      const toastId = toast.loading(`Uploading ${files.length} photo(s)...`)
      
      try {
        // Auto-upload camera photos immediately
        for (const file of files) {
          await uploadPhoto.mutateAsync({
            file,
            category: uploadCategory,
            caption: uploadCaption || undefined,
          })
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

    for (const file of selectedFiles) {
      await uploadPhoto.mutateAsync({
        file,
        category: uploadCategory,
        caption: uploadCaption || undefined,
      })
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

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPhotos.map((photo: any) => (
                <div key={photo.id} className="group relative bg-white border rounded-lg overflow-hidden">
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={photo.file_url}
                      alt={photo.caption || photo.file_name}
                      className="w-full h-full object-cover"
                    />
                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(photo.file_url, photo.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditClick(photo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(photo.id, photo.file_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Photo info */}
                  <div className="p-3">
                    {editingPhoto === photo.id ? (
                      <div className="space-y-2">
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-8">
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
                        <Input
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          placeholder="Caption..."
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(photo.id)}
                            className="flex-1"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPhoto(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <Tag className="h-3 w-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-600">
                            {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label || photo.category}
                          </span>
                        </div>
                        {photo.caption && (
                          <p className="text-sm text-gray-700 mb-2 line-clamp-2">{photo.caption}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatBytes(photo.file_size)} • {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
