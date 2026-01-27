'use client';

import { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';

interface AddressSearchProps {
  onAddressSelect: (lat: number, lng: number, address: string) => void;
  isMobile?: boolean;
}

export function AddressSearch({ onAddressSelect, isMobile = false }: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Initialize Google Places Autocomplete
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['geometry', 'formatted_address', 'address_components'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();

      if (!place?.geometry?.location) {
        toast.error('Address not found. Please select from the dropdown.');
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || '';

      onAddressSelect(lat, lng, address);
      toast.success(`Zoomed to: ${address}`);

      // Clear input after selection
      if (isMobile) {
        setIsOpen(false);
      }
      setInputValue('');
    });
  }, [onAddressSelect, isMobile]);

  const handleClear = () => {
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // Mobile: Show button that opens search
  if (isMobile) {
    return (
      <div className="relative">
        {!isOpen ? (
          <Button
            onClick={() => setIsOpen(true)}
            variant="secondary"
            size="sm"
            className="shadow-lg"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Address
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-background rounded-md shadow-lg p-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search address..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-48 h-8"
            />
            <Button
              onClick={() => {
                setIsOpen(false);
                handleClear();
              }}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Always show search bar
  return (
    <div className="relative flex items-center gap-2 bg-background rounded-md shadow-lg px-3 py-2">
      <Search className="w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search address to zoom..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-64 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
      />
      {inputValue && (
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
