'use client'

import { useState } from 'react'
import { Search, Plus, ArrowLeft } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { CommandPalette } from './command-palette'
import { NotificationDropdown } from './notification-dropdown'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: company } = useCurrentCompany()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const handleBackClick = () => {
    router.back()
  }

  return (
    <>
      {/* Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />

      {/* Top Bar with Search and Profile */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 px-4 lg:px-8 py-3">
          {/* Left: Back button (persistent on all pages) */}
          <div className="flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackClick}
              className="px-2 sm:px-4"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>

          {/* Middle: Search (hidden on mobile, shown on larger screens) */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-left text-sm text-gray-500 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search customers, leads, addresses...</span>
              <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            </button>
          </div>

          {/* Mobile: Company name */}
          <div className="md:hidden flex-1">
            <h2 className="text-base font-semibold text-gray-900">
              {company?.name || 'Dashboard'}
            </h2>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            <button 
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <NotificationDropdown />
          </div>
        </div>
      </header>
    </>
  )
}