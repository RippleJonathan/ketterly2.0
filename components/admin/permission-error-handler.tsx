'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function PermissionErrorHandler() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const error = searchParams.get('error')
    
    if (error === 'insufficient_permissions') {
      toast.error('You do not have permission to access that page', {
        duration: 5000,
      })
      
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])
  
  return null
}
