'use client'

import { useState } from 'react'
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
  EventStatus,
  EVENT_TYPE_LABELS,
  EventFilters,
} from '@/lib/types/calendar'
import { Card } from '@/components/ui/card'

interface CalendarFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  onClear: () => void
}

const STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.SCHEDULED]: 'Scheduled',
  [EventStatus.CONFIRMED]: 'Confirmed',
  [EventStatus.COMPLETED]: 'Completed',
  [EventStatus.CANCELLED]: 'Cancelled',
  [EventStatus.RESCHEDULED]: 'Rescheduled',
}

export function CalendarFilters({
  filters,
  onFiltersChange,
  onClear,
}: CalendarFiltersProps) {
  const activeFiltersCount = 
    (filters.event_types?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.exclude_cancelled ? 1 : 0)

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

  const handleStatusToggle = (status: EventStatus) => {
    const currentStatuses = filters.statuses || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    onFiltersChange({
      ...filters,
      statuses: newStatuses.length > 0 ? newStatuses : undefined,
    })
  }

  const handleExcludeCancelledToggle = () => {
    onFiltersChange({
      ...filters,
      exclude_cancelled: !filters.exclude_cancelled,
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

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <div className="space-y-2">
          {Object.values(EventStatus).map(status => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.statuses?.includes(status) || false}
                onCheckedChange={() => handleStatusToggle(status)}
              />
              <label
                htmlFor={`status-${status}`}
                className="text-sm cursor-pointer flex-1"
              >
                {STATUS_LABELS[status]}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Options */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclude-cancelled"
            checked={filters.exclude_cancelled || false}
            onCheckedChange={handleExcludeCancelledToggle}
          />
          <label
            htmlFor="exclude-cancelled"
            className="text-sm cursor-pointer flex-1 font-medium"
          >
            Hide cancelled events
          </label>
        </div>
      </div>
    </Card>
  )
}
