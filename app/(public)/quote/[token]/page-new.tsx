'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch quote ID from API and redirect to PDF
    const fetchAndRedirect = async () => {
      try {
        const response = await fetch(`/api/public/quote/${token}`)
        
        if (!response.ok) {
          setError('Quote not found or link has expired')
          return
        }
        
        const { data } = await response.json()
        
        if (data?.id) {
          // Redirect to PDF page which has full quote display
          window.location.href = `/api/quotes/${data.id}/pdf?token=${token}`
        } else {
          setError('Invalid quote data')
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err)
        setError('Failed to load quote')
      }
    }
    
    fetchAndRedirect()
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-sm rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Not Available</h2>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quote...</p>
      </div>
    </div>
  )
}
