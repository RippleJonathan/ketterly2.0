'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin } from 'lucide-react'

declare global {
  interface Window {
    google: any
    googleMapsLoaded?: boolean
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

// Global flag to track script loading
let isLoadingScript = false
const loadCallbacks: Array<() => void> = []

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.maps?.places) {
      resolve()
      return
    }

    // Currently loading, add to callback queue
    if (isLoadingScript) {
      loadCallbacks.push(() => resolve())
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.google?.maps?.places) {
          reject(new Error('Script load timeout'))
        }
      }, 10000)
      return
    }

    // Start loading
    isLoadingScript = true
    
    const script = document.createElement('script')
    // Load ALL libraries needed by the entire app: places, drawing, geometry
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      // Wait a bit for places library to be ready
      const checkPlaces = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkPlaces)
          isLoadingScript = false
          window.googleMapsLoaded = true
          resolve()
          // Call all queued callbacks
          loadCallbacks.forEach(cb => cb())
          loadCallbacks.length = 0
        }
      }, 50)
      
      setTimeout(() => {
        clearInterval(checkPlaces)
        if (!window.google?.maps?.places) {
          reject(new Error('Places library not available'))
        }
      }, 5000)
    }
    
    script.onerror = () => {
      isLoadingScript = false
      reject(new Error('Failed to load Google Maps script'))
    }
    
    document.head.appendChild(script)
  })
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

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      setLoadError(true)
      return
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    // Load the script
    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoaded(true)
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err)
        setLoadError(true)
      })
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled || loadError) return

    try {
      // Double-check that places API is available
      if (!window.google?.maps?.places) {
        console.error('Google Places API not available')
        return
      }

      // Initialize autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' }, // Restrict to US addresses
          fields: ['address_components', 'formatted_address', 'geometry'],
          // Don't set bounds - let it search anywhere
        }
      )

      // Set dropdown to append to body to avoid clipping in modals/dialogs
      const pacContainer = document.querySelector('.pac-container') as HTMLElement
      if (pacContainer) {
        pacContainer.style.zIndex = '99999'
      }

      // Listen for place selection
      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        
        if (!place.address_components) {
          console.warn('AddressAutocomplete: No address components found')
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

      return () => {
        // Cleanup listener on unmount
        if (listener) {
          window.google.maps.event.removeListener(listener)
        }
      }
    } catch (error) {
      console.error('Error initializing Google Maps Autocomplete:', error)
      setLoadError(true)
    }
  }, [isLoaded, disabled, loadError]) // Removed onChange and onAddressSelect from deps to prevent re-initialization

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
