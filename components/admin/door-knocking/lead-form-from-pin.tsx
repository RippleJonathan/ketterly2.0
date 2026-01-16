'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reverseGeocode } from '@/lib/utils/geocoding';
import { createLeadAction } from '@/lib/actions/leads';
import { useCurrentCompany } from '@/lib/hooks/use-current-company';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { SERVICE_TYPE_OPTIONS } from '@/lib/constants/leads';
import type { DoorKnockPinWithUser } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LeadFormFromPinProps {
  isOpen: boolean;
  onClose: () => void;
  pin?: DoorKnockPinWithUser;
}

export function LeadFormFromPin({ isOpen, onClose, pin }: LeadFormFromPinProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const { data: userData } = useCurrentUser();
  const user = userData?.data;

  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [serviceType, setServiceType] = useState('roofing');
  const [notes, setNotes] = useState('');

  // Geocode address when pin is provided
  useEffect(() => {
    if (isOpen && pin) {
      setGeocoding(true);
      setNotes(pin.notes || '');
      
      reverseGeocode(pin.latitude, pin.longitude)
        .then(result => {
          if (result) {
            setAddress(result.address || result.formatted_address || '');
            setCity(result.city || '');
            setState(result.state || '');
            setZip(result.zip || '');
          } else {
            // Fallback if geocoding fails
            setAddress(pin.address || 'Address unavailable');
          }
        })
        .catch(error => {
          console.error('Geocoding error:', error);
          setAddress(pin.address || 'Address unavailable');
          toast.error('Could not geocode address');
        })
        .finally(() => setGeocoding(false));
    }
  }, [isOpen, pin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company?.data?.id || !user?.id) {
      toast.error('Missing company or user information');
      return;
    }

    setLoading(true);
    try {
      const result = await createLeadAction({
        company_id: company.data.id,
        full_name: fullName,
        email,
        phone,
        address,
        city,
        state,
        zip,
        service_type: serviceType,
        source: 'door_knocking',
        status: 'new',
        priority: 'medium',
        notes,
        sales_rep_id: user.id,
      });

      if (result.success && result.data) {
        toast.success('Lead created successfully!');
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['door-knock-pins'] });
        
        // Close modal and navigate to lead
        onClose();
        router.push(`/admin/leads/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create lead');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFullName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setServiceType('roofing');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Door Knock to Lead</DialogTitle>
        </DialogHeader>

        {geocoding ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span className="text-muted-foreground">Loading address information...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Contact Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Contact Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Property Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Austin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="78701"
                  />
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Service Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="service_type">Service Type *</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <p className="font-semibold mb-1">Lead Source: Door Knocking</p>
              <p className="text-xs text-blue-700">
                This lead will be automatically assigned to you and marked as coming from door-to-door canvassing.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Lead...
                  </>
                ) : (
                  'Create Lead'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
