'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react'
import { globalSearch, type SearchResult } from '@/app/actions/search'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      const { results: searchResults } = await globalSearch(query)
      setResults(searchResults)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false)
    router.push(`/admin/leads/${result.id}`)
  }, [router, onOpenChange])

  const formatPhone = (phone: string | null) => {
    if (!phone) return null
    // Format as (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new': return 'text-blue-600'
      case 'contacted': return 'text-purple-600'
      case 'qualified': return 'text-green-600'
      case 'estimate_sent': return 'text-orange-600'
      case 'won': return 'text-emerald-600'
      case 'lost': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatStatus = (status?: string) => {
    if (!status) return null
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      label="Global search"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search customers, leads, addresses, phone numbers..."
          className="w-full px-4 py-4 text-base bg-white border-b border-gray-200 outline-none rounded-t-lg"
        />
        
        <Command.List className="max-h-[400px] overflow-y-auto bg-white rounded-b-lg shadow-2xl">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {!loading && query.length > 0 && query.length < 2 && (
            <div className="py-8 text-center text-sm text-gray-500">
              Type at least 2 characters to search
            </div>
          )}

          {!loading && query.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Start typing to search...
              <div className="mt-3 text-xs text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-100 rounded border">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded border">K</kbd> to open
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <Command.Group heading="Leads" className="px-2 py-2">
              {results.map((result) => (
                <Command.Item
                  key={result.id}
                  value={`${result.full_name} ${result.email} ${result.phone} ${result.address}`}
                  onSelect={() => handleSelect(result)}
                  className={cn(
                    "px-4 py-3 cursor-pointer rounded-md mb-1",
                    "hover:bg-gray-100 aria-selected:bg-gray-100",
                    "transition-colors duration-150"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-blue-50 rounded-full">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {result.full_name}
                        </span>
                        {result.status && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            getStatusColor(result.status)
                          )}>
                            {formatStatus(result.status)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        {result.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{result.email}</span>
                          </div>
                        )}
                        
                        {result.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{formatPhone(result.phone)}</span>
                          </div>
                        )}
                        
                        {result.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {result.address}
                              {result.city && `, ${result.city}`}
                              {result.state && `, ${result.state}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
