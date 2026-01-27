'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LEAD_FILTER_OPTIONS,
} from '@/lib/constants/leads'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { useUsers } from '@/lib/hooks/use-users'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useUserLocations } from '@/lib/hooks/use-location-users'
import { createClient } from '@/lib/supabase/client'

interface LeadsFiltersProps {
  globalFilter: string
  setGlobalFilter: (value: string) => void
  columnFilters: ColumnFiltersState
  setColumnFilters: (filters: ColumnFiltersState) => void
}

export function LeadsFilters({
  globalFilter,
  setGlobalFilter,
  columnFilters,
  setColumnFilters,
}: LeadsFiltersProps) {
  const [searchValue, setSearchValue] = useState(globalFilter)
  const { data: userData } = useCurrentUser()
  const user = userData?.data
  const [locationUsers, setLocationUsers] = useState<any[]>([])
  
  // Fetch users from current user's locations
  useEffect(() => {
    async function fetchLocationUsers() {
      if (!user?.id) return
      
      const supabase = createClient()
      const isSuperAdmin = user.role && ['admin', 'super_admin'].includes(user.role as string)
      
      if (isSuperAdmin) {
        // Only super admins see all users
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('company_id', user.company_id)
          .order('full_name')
        setLocationUsers(data || [])
      } else {
        // Office, sales, and other users see only users from their assigned locations
        const { data: userLocs } = await supabase
          .from('location_users')
          .select('location_id')
          .eq('user_id', user.id)
        
        if (userLocs && userLocs.length > 0) {
          const locationIds = userLocs.map(ul => ul.location_id)
          const { data: locUsers } = await supabase
            .from('location_users')
            .select('user_id, users!inner(id, full_name, email, role)')
            .in('location_id', locationIds)
          
          // Deduplicate users
          const uniqueUsers = Array.from(
            new Map(locUsers?.map((lu: any) => [lu.users.id, lu.users]) || []).values()
          )
          setLocationUsers(uniqueUsers)
        }
      }
    }
    
    fetchLocationUsers()
  }, [user])

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setGlobalFilter(searchValue)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchValue, setGlobalFilter])

  // Get current filter values
  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string[]) || []
  const repFilter = (columnFilters.find((f) => f.id === 'rep')?.value as string[]) || []

  const handleClearFilters = () => {
    setGlobalFilter('')
    setSearchValue('')
    setColumnFilters([])
  }

  const updateFilter = (columnId: string, values: string[]) => {
    const newFilters = columnFilters.filter((f) => f.id !== columnId)
    if (values.length > 0) {
      newFilters.push({ id: columnId, value: values })
    }
    setColumnFilters(newFilters)
  }

  const toggleStatusFilter = (status: string) => {
    const newValues = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status]
    updateFilter('status', newValues)
  }

  const toggleRepFilter = (userId: string) => {
    const newValues = repFilter.includes(userId)
      ? repFilter.filter((id) => id !== userId)
      : [...repFilter, userId]
    updateFilter('rep', newValues)
  }

  const activeFilterCount = columnFilters.length + (globalFilter ? 1 : 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Search Input Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads by name, email, phone, or address..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue('')
                setGlobalFilter('')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Rep Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Users className="h-4 w-4 mr-2" />
              Rep
              {repFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {repFilter.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Sales Rep</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {locationUsers.map((user: any) => (
              <DropdownMenuCheckboxItem
                key={user.id}
                checked={repFilter.includes(user.id)}
                onCheckedChange={() => toggleRepFilter(user.id)}
              >
                {user.full_name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-2" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Status Toggle Bar */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
          Status:
        </span>
        {LEAD_FILTER_OPTIONS.statuses.map((option: { value: string; label: string }) => {
          const isSelected = statusFilter.includes(option.value)
          return (
            <Button
              key={option.value}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleStatusFilter(option.value)}
              className={`transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
