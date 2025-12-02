'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'
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

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setGlobalFilter(searchValue)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchValue, setGlobalFilter])

  // Get current filter values
  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string[]) || []
  const sourceFilter = (columnFilters.find((f) => f.id === 'source')?.value as string[]) || []
  const priorityFilter = (columnFilters.find((f) => f.id === 'priority')?.value as string[]) || []

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

  const toggleSourceFilter = (source: string) => {
    const newValues = sourceFilter.includes(source)
      ? sourceFilter.filter((s) => s !== source)
      : [...sourceFilter, source]
    updateFilter('source', newValues)
  }

  const togglePriorityFilter = (priority: string) => {
    const newValues = priorityFilter.includes(priority)
      ? priorityFilter.filter((p) => p !== priority)
      : [...priorityFilter, priority]
    updateFilter('priority', newValues)
  }

  const activeFilterCount = columnFilters.length + (globalFilter ? 1 : 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
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

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              Status
              {statusFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {statusFilter.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_FILTER_OPTIONS.statuses.map((option: { value: string; label: string }) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={statusFilter.includes(option.value)}
                onCheckedChange={() => toggleStatusFilter(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Source Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              Source
              {sourceFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {sourceFilter.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_FILTER_OPTIONS.sources.map((option: { value: string; label: string }) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={sourceFilter.includes(option.value)}
                onCheckedChange={() => toggleSourceFilter(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              Priority
              {priorityFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                  {priorityFilter.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_FILTER_OPTIONS.priorities.map((option: { value: string; label: string }) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={priorityFilter.includes(option.value)}
                onCheckedChange={() => togglePriorityFilter(option.value)}
              >
                {option.label}
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
    </div>
  )
}
