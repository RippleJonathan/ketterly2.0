'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin } from 'lucide-react'

declare global {
  interface Window {
    google: any
    initAutocomplete?: () => void
  }
}

interface AddressComponents {
  address: string
  city: string
  state: string
  zip: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (components: AddressComponents) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  label = 'Address',
  placeholder = '123 Main St',
  required = false,
  error,
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const scriptLoadedRef = useRef(false) // Track if script is already loaded

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true)
      return
    }

    // Check if script is already being loaded
    if (scriptLoadedRef.current) {
      return
    }

    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      setLoadError(true)
      return
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    )
    
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)
      
      setTimeout(() => clearInterval(checkLoaded), 5000) // Timeout after 5s
      return
    }

    // Mark as loading
    scriptLoadedRef.current = true

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      setLoadError(true)
      scriptLoadedRef.current = false
    }
    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount - keep it for other components
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled || loadError) return

    try {
      // Initialize autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' }, // Restrict to US addresses
          fields: ['address_components', 'formatted_address', 'geometry'],
        }
      )

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        
        if (!place.address_components) {
          return
        }

        // Parse address components
        let streetNumber = ''
        let route = ''
        let city = ''
        let state = ''
        let zip = ''

        place.address_components.forEach((component: any) => {
          const types = component.types

          if (types.includes('street_number')) {
            streetNumber = component.long_name
          }
          if (types.includes('route')) {
            route = component.long_name
          }
          if (types.includes('locality')) {
            city = component.long_name
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name // Use short name for state (e.g., "TX")
          }
          if (types.includes('postal_code')) {
            zip = component.long_name
          }
        })

        const fullAddress = `${streetNumber} ${route}`.trim()

        // Update the input value
        onChange(fullAddress)

        // Call the callback with parsed components
        if (onAddressSelect) {
          onAddressSelect({
            address: fullAddress,
            city,
            state,
            zip,
          })
        }
      })
    } catch (error) {
      console.error('Error initializing Google Maps Autocomplete:', error)
      setLoadError(true)
    }

    return () => {
      // Cleanup autocomplete listener
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, disabled, onChange, onAddressSelect, loadError])

  // If Google Maps failed to load, show regular input
  if (loadError) {
    return (
      <div>
        {label && (
          <Label htmlFor="address">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <Input
          id="address"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      {label && (
        <Label htmlFor="address" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          {label} {required && <span className="text-red-500">*</span>}
          {isLoaded && !loadError && (
            <span className="text-xs text-gray-400">(Start typing for suggestions)</span>
          )}
        </Label>
      )}
      <Input
        id="address"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || !isLoaded}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {!isLoaded && !loadError && (
        <p className="text-xs text-gray-400 mt-1">Loading address suggestions...</p>
      )}
    </div>
  )
}
