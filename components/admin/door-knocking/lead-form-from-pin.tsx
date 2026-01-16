'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reverseGeocode } from '@/lib/utils/geocoding';
import { LeadForm } from '@/components/admin/leads/lead-form';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUserLocations } from '@/lib/hooks/use-location-users';
import type { DoorKnockPinWithUser } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/lib/types';

interface LeadFormFromPinProps {
  isOpen: boolean;
  onClose: () => void;
  pin?: DoorKnockPinWithUser;
}

export function LeadFormFromPin({ isOpen, onClose, pin }: LeadFormFromPinProps) {
  const { data: userData } = useCurrentUser();
  const user = userData?.data;
  const { data: userLocationsData } = useUserLocations(user?.id);
  const userLocations = userLocationsData?.data || [];
  
  const [geocoding, setGeocoding] = useState(false);
  const [prefilledLead, setPrefilledLead] = useState<Partial<Lead> | null>(null);

  // Geocode address when pin is provided
  useEffect(() => {
    if (isOpen && pin && user) {
      setGeocoding(true);
      
      // Get user's primary location (first assigned location)
      const primaryLocation = userLocations.length > 0 ? userLocations[0].location_id : undefined;
      
      // Determine role assignments based on user role
      // Sales reps and marketing reps: get both roles (self-generated)
      // Everyone else: only gets sales_rep_id
      const isSalesOrMarketing = user.role === 'sales' || user.role === 'marketing';
      const roleAssignments = isSalesOrMarketing
        ? { sales_rep_id: user.id, marketing_rep_id: user.id }
        : { sales_rep_id: user.id };
      
      reverseGeocode(pin.latitude, pin.longitude)
        .then(result => {
          if (result) {
            setPrefilledLead({
              address: result.street_address || result.address || '',
              city: result.city || '',
              state: result.state || '',
              zip: result.zip || '',
              service_type: 'inspection',
              source: 'door_knocking',
              status: 'new',
              priority: 'medium',
              notes: pin.notes || '',
              location_id: primaryLocation,
              ...roleAssignments,
            } as Partial<Lead>);
          } else {
            setPrefilledLead({
              service_type: 'inspection',
              source: 'door_knocking',
              status: 'new',
              priority: 'medium',
              notes: pin.notes || '',
              location_id: primaryLocation,
              ...roleAssignments,
            } as Partial<Lead>);
          }
        })
        .catch(error => {
          console.error('Geocoding error:', error);
          toast.error('Could not geocode address');
          setPrefilledLead({
            service_type: 'inspection',
            source: 'door_knocking',
            status: 'new',
            priority: 'medium',
            notes: pin.notes || '',
            location_id: primaryLocation,
            ...roleAssignments,
          } as Partial<Lead>);
        })
        .finally(() => setGeocoding(false));
    } else {
      setPrefilledLead(null);
    }
  }, [isOpen, pin, user, userLocations]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Door Knock to Lead</DialogTitle>
        </DialogHeader>

        {geocoding ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-muted-foreground">Loading address information...</span>
          </div>
        ) : prefilledLead ? (
          <LeadForm mode="create" lead={prefilledLead as Lead} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
