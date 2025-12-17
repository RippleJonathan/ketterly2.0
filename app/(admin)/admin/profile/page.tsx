'use client'

import { useState, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/admin/profile/profile-form'
import { AvatarUpload } from '@/components/admin/profile/avatar-upload'
import { NotificationPreferences } from '@/components/admin/profile/notification-preferences'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { User, Bell } from 'lucide-react'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and notification preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <NotificationPreferences />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
