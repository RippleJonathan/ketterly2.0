'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, Building2, Star, MoreVertical, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Badge } from '@/components/ui/badge'
import { LocationForm } from '@/components/admin/locations/location-form'
import { 
  useLocations, 
  useCreateLocation, 
  useUpdateLocation, 
  useDeleteLocation,
  useSetPrimaryLocation,
} from '@/lib/hooks/use-locations'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useManagedLocations } from '@/lib/hooks/use-location-admin'
import type { Location } from '@/lib/api/locations'

export default function LocationsPage() {
  const router = useRouter()
  const { data: company } = useCurrentCompany()
  const { data: currentUserData } = useCurrentUser()
  const userData = currentUserData?.data
  const { data: allLocationsResponse, isLoading } = useLocations()
  const { managedLocationIds } = useManagedLocations()  // FIXED: Returns object with managedLocationIds directly
  
  // Filter locations based on user role
  // Admin/super_admin see all, office users see only their managed locations
  const locations = useMemo(() => {
    const allLocations = allLocationsResponse?.data || []
    
    console.log('🏢 Locations Debug:', {
      allLocationsResponse,
      allLocationsCount: allLocations.length,
      userData: userData ? { id: userData.id, email: userData.email, role: userData.role, default_location_id: userData.default_location_id } : null,
      userRole: userData?.role,
      managedLocationIds,  // Now correctly populated
      allLocationIds: allLocations.map(l => ({ id: l.id, name: l.name }))
    })
    
    if (!allLocations.length || !userData) {
      console.log('⚠️ No locations or user data')
      return []
    }
    
    const isAdmin = ['admin', 'super_admin'].includes(userData.role || '')
    if (isAdmin) {
      console.log('✅ Admin user - showing all locations:', allLocations.length)
      return allLocations
    }
    
    // Office users: Try location_users table first (preferred multi-location method)
    if (managedLocationIds.length > 0) {
      const filtered = allLocations.filter(loc => managedLocationIds.includes(loc.id))
      console.log('✅ Office user - filtered via location_users table:', {
        managedLocationIds,
        filteredCount: filtered.length,
        locationNames: filtered.map(l => l.name)
      })
      return filtered
    }
    
    // FALLBACK: If no location_users entries, check users.default_location_id (legacy single location)
    if (userData.default_location_id) {
      const filtered = allLocations.filter(loc => loc.id === userData.default_location_id)
      console.log('✅ Office user - filtered via users.default_location_id fallback:', {
        userLocationId: userData.default_location_id,
        filteredCount: filtered.length,
        locationNames: filtered.map(l => l.name)
      })
      return filtered
    }
    
    console.error('⚠️ Office user has no location assignment!', {
      message: 'User needs entry in location_users table OR default_location_id on users table',
      userId: userData.id,
      userEmail: userData.email,
      checkSql: `SELECT * FROM location_users WHERE user_id = '${userData.id}';`
    })
    return []
  }, [allLocationsResponse, userData, managedLocationIds])
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()
  const setPrimary = useSetPrimaryLocation()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null)

  const handleCreate = async (data: any) => {
    await createLocation.mutateAsync({
      ...data,
      company_id: company!.id,
    })
    setIsCreateDialogOpen(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editingLocation) return
    await updateLocation.mutateAsync({
      id: editingLocation.id,
      ...data,
    })
    setEditingLocation(null)
  }

  const handleDelete = async () => {
    if (!deletingLocation) return
    await deleteLocation.mutateAsync(deletingLocation.id)
    setDeletingLocation(null)
  }

  const handleSetPrimary = async (locationId: string) => {
    await setPrimary.mutateAsync({ locationId })
  }

  // Check if user is admin (can create/delete locations)
  const isAdmin = ['admin', 'super_admin'].includes(userData?.role || '')

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? "Manage your company's offices and service territories"
              : "View and update your location's pricing"
            }
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      {locations && locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Add your first location to start organizing your business by office or territory.
            </p>
            {isAdmin && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Location
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations?.map((location) => (
            <Card key={location.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingLocation(location)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {isAdmin && !location.is_primary && (
                        <DropdownMenuItem onClick={() => handleSetPrimary(location.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Primary
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingLocation(location)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {location.location_code && (
                  <Badge variant="secondary" className="w-fit mt-1">
                    {location.location_code}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {location.is_primary && (
                    <Badge variant="default">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{location.address}</p>
                  <p className="text-muted-foreground">
                    {location.city}, {location.state} {location.zip}
                  </p>
                </div>

                {location.phone && (
                  <p className="text-sm text-muted-foreground">{location.phone}</p>
                )}

                {location.email && (
                  <p className="text-sm text-muted-foreground">{location.email}</p>
                )}

                {location.license_number && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      License: {location.license_number}
                    </p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => router.push(`/admin/settings/locations/${location.id}`)}
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Create a new office or service territory for your company.
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details and settings.
            </DialogDescription>
          </DialogHeader>
          {editingLocation && (
            <LocationForm
              location={editingLocation}
              onSubmit={handleUpdate}
              onCancel={() => setEditingLocation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingLocation?.name}</strong>?
              This will soft-delete the location and it can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
