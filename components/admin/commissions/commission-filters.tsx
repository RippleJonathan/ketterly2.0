'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CommissionFiltersProps {
  onUserChange: (userId?: string) => void
  onStatusChange: (status?: string) => void
  onDateFromChange: (date?: string) => void
  onDateToChange: (date?: string) => void
}

export function CommissionFilters({
  onUserChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
}: CommissionFiltersProps) {
  const { data: company } = useCurrentCompany()
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  // Fetch all company users for filter
  const { data: users } = useQuery({
    queryKey: ['company-users', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', company.id)
        .order('full_name')
      
      return data || []
    },
    enabled: !!company?.id,
  })

  return (
    <div className="flex items-center gap-2">
      {/* User Filter */}
      <Select onValueChange={(value) => onUserChange(value === 'all' ? undefined : value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select onValueChange={(value) => onStatusChange(value === 'all' ? undefined : value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">⏳ Pending</SelectItem>
          <SelectItem value="eligible">✓ Eligible</SelectItem>
          <SelectItem value="approved">✅ Approved</SelectItem>
          <SelectItem value="paid">💰 Paid</SelectItem>
          <SelectItem value="voided">❌ Voided</SelectItem>
        </SelectContent>
      </Select>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={(date) => {
              setDateFrom(date)
              onDateFromChange(date ? date.toISOString() : undefined)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={(date) => {
              setDateTo(date)
              onDateToChange(date ? date.toISOString() : undefined)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {(dateFrom || dateTo) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDateFrom(undefined)
            setDateTo(undefined)
            onDateFromChange(undefined)
            onDateToChange(undefined)
          }}
        >
          Clear Dates
        </Button>
      )}
    </div>
  )
}
