'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LEAD_STAGE_LABELS, getStageBadgeClasses } from '@/lib/constants/pipeline'
import { useUpdateLeadStatus } from '@/lib/hooks/use-leads'

interface StatusDropdownProps {
  leadId: string
  currentStatus: string
}

export function StatusDropdown({ leadId, currentStatus }: StatusDropdownProps) {
  const updateStatus = useUpdateLeadStatus()

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus !== currentStatus) {
      await updateStatus.mutateAsync({ leadId, status: newStatus })
    }
  }

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageBadgeClasses(currentStatus as any)}`}>
            {LEAD_STAGE_LABELS[currentStatus as keyof typeof LEAD_STAGE_LABELS]}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageBadgeClasses(value as any)}`}>
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
