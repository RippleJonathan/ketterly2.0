'use client'

import { X, Filter as FilterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  EventType,
  EVENT_TYPE_LABELS,
  EventFilters,
} from '@/lib/types/calendar'
import { Card } from '@/components/ui/card'

interface CalendarFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  onClear: () => void
  locations?: Array<{ id: string; name: string }>
  users?: Array<{ id: string; full_name: string }>
}

export function CalendarFilters({
  filters,
  onFiltersChange,
  onClear,
  locations = [],
  users = [],
}: CalendarFiltersProps) {
  const activeFiltersCount = 
    (filters.event_types?.length || 0) +
    (filters.assigned_user_ids?.length || 0) +
    (filters.location_id ? 1 : 0)

  const handleEventTypeToggle = (type: EventType) => {
    const currentTypes = filters.event_types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    onFiltersChange({
      ...filters,
      event_types: newTypes.length > 0 ? newTypes : undefined,
    })
  }

  const handleAssignedUserToggle = (userId: string) => {
    const currentUsers = filters.assigned_user_ids || []
    const newUsers = currentUsers.includes(userId)
      ? currentUsers.filter(u => u !== userId)
      : [...currentUsers, userId]
    
    onFiltersChange({
      ...filters,
      assigned_user_ids: newUsers.length > 0 ? newUsers : undefined,
    })
  }

  const handleLocationChange = (locationId: string) => {
    onFiltersChange({
      ...filters,
      location_id: locationId === 'all' ? undefined : locationId,
    })
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          <h3 className="font-semibold">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-auto p-1"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Event Types */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Event Types</Label>
        <div className="space-y-2">
          {Object.values(EventType).map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.event_types?.includes(type) || false}
                onCheckedChange={() => handleEventTypeToggle(type)}
              />
              <label
                htmlFor={`type-${type}`}
                className="text-sm cursor-pointer flex-1"
              >
                {EVENT_TYPE_LABELS[type]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      {locations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Location</Label>
          <Select
            value={filters.location_id || 'all'}
            onValueChange={handleLocationChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assigned Users */}
      {users.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Assigned To</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`user-${user.id}`}
                  checked={filters.assigned_user_ids?.includes(user.id) || false}
                  onCheckedChange={() => handleAssignedUserToggle(user.id)}
                />
                <label
                  htmlFor={`user-${user.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {user.full_name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
