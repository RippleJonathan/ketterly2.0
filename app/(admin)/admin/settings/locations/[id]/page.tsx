'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useLocation } from '@/lib/hooks/use-locations'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { LocationPricingTab } from '@/components/admin/locations/location-pricing-tab'

interface LocationDetailPageProps {
  params: Promise<{ id: string }>
}

export default function LocationDetailPage({ params }: LocationDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  
  const { data: location, isLoading } = useLocation(id)
  const { data: currentUser } = useCurrentUser()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading location...</p>
        </div>
      </div>
    )
  }
  
  if (!location?.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Location Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The location you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => router.push('/admin/settings/locations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>
        </div>
      </div>
    )
  }
  
  const loc = location.data
  const isAdmin = currentUser?.data?.role === 'admin' || currentUser?.data?.role === 'super_admin'
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/settings/locations')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{loc.name}</h1>
              {loc.is_primary && (
                <Badge variant="default">Primary Location</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {[loc.city, loc.state].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
              <CardDescription>
                Basic information about this location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-base">{loc.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-base capitalize">{(loc as any).type || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-base">
                  {loc.address || 'No address provided'}
                  {loc.city && <><br />{loc.city}, {loc.state} {loc.zip}</>}
                </p>
              </div>

              {loc.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-base">{loc.phone}</p>
                </div>
              )}

              {loc.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base">{loc.email}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                    {loc.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <LocationPricingTab 
            locationId={id} 
            locationName={loc.name}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Users assigned to this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Team management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
