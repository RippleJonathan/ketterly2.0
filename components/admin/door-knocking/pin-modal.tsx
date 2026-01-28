'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorKnockPinType, PIN_TYPE_CONFIG, type DoorKnockPinInsert, type DoorKnockPinWithUser } from '@/lib/types/door-knock';
import { Loader2 } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  coordinates?: { lat: number; lng: number };
  existingPin?: DoorKnockPinWithUser;
  onSave: (pin: Partial<DoorKnockPinInsert>) => Promise<void>;
  onDelete?: (pinId: string) => Promise<void>;
  onConvertToLead?: (pin: DoorKnockPinWithUser) => void;
}

export function PinModal({
  isOpen,
  onClose,
  mode,
  coordinates,
  existingPin,
  onSave,
  onDelete,
  onConvertToLead,
}: PinModalProps) {
  const [pinType, setPinType] = useState<DoorKnockPinType>(DoorKnockPinType.NOT_HOME);
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Update state when existingPin changes
  useEffect(() => {
    if (existingPin) {
      setPinType(existingPin.pin_type as DoorKnockPinType);
      setNotes(existingPin.notes || '');
      setAddress(existingPin.address || '');
    } else {
      setPinType(DoorKnockPinType.NOT_HOME);
      setNotes('');
      setAddress('');
    }
  }, [existingPin, isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        pin_type: pinType,
        notes: notes || null,
        address: address || null,
        ...(mode === 'create' && coordinates ? {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        } : {}),
      });
      onClose();
    } catch (error) {
      console.error('Error saving pin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPin || !onDelete) return;
    if (!confirm('Are you sure you want to delete this pin?')) return;
    
    setLoading(true);
    try {
      await onDelete(existingPin.id);
      onClose();
    } catch (error) {
      console.error('Error deleting pin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToLead = () => {
    if (existingPin && onConvertToLead) {
      onConvertToLead(existingPin);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Drop New Pin' : 'Edit Pin'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'edit' && address && (
            <div className="space-y-2">
              <Label>Address</Label>
              <p className="text-sm text-muted-foreground">{address}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pin-type">Pin Type *</Label>
            <Select value={pinType} onValueChange={(value) => setPinType(value as DoorKnockPinType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PIN_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span style={{ color: config.color }}>● </span>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PIN_TYPE_CONFIG[pinType]?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this interaction..."
              rows={3}
            />
          </div>

          {mode === 'edit' && existingPin && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created {new Date(existingPin.created_at).toLocaleString()}</div>
              {existingPin.created_by_user && (
                <div>Dropped by {existingPin.created_by_user.full_name}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div>
            {mode === 'edit' && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'edit' && existingPin && pinType === DoorKnockPinType.APPOINTMENT_SET && onConvertToLead && (
              <Button onClick={handleConvertToLead} disabled={loading}>
                Convert to Lead
              </Button>
            )}
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
