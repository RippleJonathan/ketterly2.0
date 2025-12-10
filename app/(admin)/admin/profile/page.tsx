import { Suspense } from 'react'
import { ProfileForm } from '@/components/admin/profile/profile-form'
import { AvatarUpload } from '@/components/admin/profile/avatar-upload'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      <Separator />

      {/* Avatar Upload */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
        <Suspense fallback={<Skeleton className="h-32 w-32 rounded-full" />}>
          <AvatarUpload />
        </Suspense>
      </div>

      <Separator />

      {/* Profile Form */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <ProfileForm />
        </Suspense>
      </div>
    </div>
  )
}
