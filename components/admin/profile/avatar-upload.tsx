'use client'

import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/use-users'
import { useUploadAvatar, useDeleteAvatar } from '@/lib/hooks/use-users'
import { toast } from 'sonner'

export function AvatarUpload() {
  const { data: userResponse } = useCurrentUser()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const user = userResponse?.data

  if (!user) {
    return <div>Loading...</div>
  }

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    uploadAvatar.mutate({ userId: user.id, file })
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove your profile photo?')) {
      await deleteAvatar.mutateAsync(user.id)
      setPreviewUrl(null)
    }
  }

  const currentAvatar = previewUrl || user.avatar_url

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-32 w-32">
        <AvatarImage src={currentAvatar || undefined} />
        <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadAvatar.isPending ? 'Uploading...' : 'Upload Photo'}
          </Button>
          {currentAvatar && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteAvatar.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          JPG, PNG or GIF. Max size 5MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
