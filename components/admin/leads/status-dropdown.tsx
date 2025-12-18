'use client'

import { useState } from 'react'
import { LeadStatus, LeadSubStatus } from '@/lib/types/enums'
import { 
  VALID_SUB_STATUSES, 
  formatStatusDisplay,
  getStatusColor,
  validateStatusTransition 
} from '@/lib/utils/status-transitions'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { updateLeadStatus } from '@/lib/api/leads'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface StatusDropdownProps {
  leadId: string
  companyId: string
  currentStatus: LeadStatus
  currentSubStatus?: LeadSubStatus | null
  userId?: string
  onStatusChange?: (newStatus: LeadStatus, newSubStatus: LeadSubStatus) => void
  disabled?: boolean
}

export function StatusDropdown({
  leadId,
  companyId,
  currentStatus,
  currentSubStatus,
  userId,
  onStatusChange,
  disabled = false,
}: StatusDropdownProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [pendingChange, setPendingChange] = useState<{
    status: LeadStatus
    subStatus: LeadSubStatus
  } | null>(null)
  const queryClient = useQueryClient()

  const handleStatusChange = async (value: string) => {
    // Parse the value: "status:substatus"
    const [newStatus, newSubStatus] = value.split(':') as [LeadStatus, LeadSubStatus]

    // Validate the transition
    const validation = validateStatusTransition(
      currentStatus,
      currentSubStatus,
      newStatus,
      newSubStatus
    )

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid status transition')
      return
    }

    // If permission required, show confirmation dialog
    if (validation.requiresPermission) {
      setPendingChange({ status: newStatus, subStatus: newSubStatus })
      return
    }

    // Otherwise, apply immediately
    await applyStatusChange(newStatus, newSubStatus)
  }

  const applyStatusChange = async (newStatus: LeadStatus, newSubStatus: LeadSubStatus) => {
    setIsChanging(true)
    
    try {
      const result = await updateLeadStatus(
        companyId,
        leadId,
        newStatus,
        newSubStatus,
        userId,
        false // manual change
      )

      if (result.error) {
        toast.error(`Failed to update status: ${result.error}`)
        return
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['leads', companyId] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-status-history', leadId] })

      toast.success(`Status updated to ${formatStatusDisplay(newStatus, newSubStatus)}`)
      
      onStatusChange?.(newStatus, newSubStatus)
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update status')
    } finally {
      setIsChanging(false)
      setPendingChange(null)
    }
  }

  const currentValue = currentSubStatus 
    ? `${currentStatus}:${currentSubStatus}` 
    : currentStatus

  const statusColor = getStatusColor(currentStatus, currentSubStatus)

  return (
    <>
      <Select
        value={currentValue}
        onValueChange={handleStatusChange}
        disabled={disabled || isChanging}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor as any}>
                {formatStatusDisplay(currentStatus, currentSubStatus)}
              </Badge>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* NEW LEAD */}
          <SelectGroup>
            <SelectLabel>New Lead</SelectLabel>
            {VALID_SUB_STATUSES[LeadStatus.NEW_LEAD].map((subStatus) => (
              <SelectItem 
                key={`${LeadStatus.NEW_LEAD}:${subStatus}`}
                value={`${LeadStatus.NEW_LEAD}:${subStatus}`}
              >
                {formatStatusDisplay(LeadStatus.NEW_LEAD, subStatus)}
              </SelectItem>
            ))}
          </SelectGroup>

          {/* QUOTE */}
          <SelectGroup>
            <SelectLabel>Quote</SelectLabel>
            {VALID_SUB_STATUSES[LeadStatus.QUOTE].map((subStatus) => (
              <SelectItem 
                key={`${LeadStatus.QUOTE}:${subStatus}`}
                value={`${LeadStatus.QUOTE}:${subStatus}`}
              >
                {formatStatusDisplay(LeadStatus.QUOTE, subStatus)}
              </SelectItem>
            ))}
          </SelectGroup>

          {/* PRODUCTION */}
          <SelectGroup>
            <SelectLabel>Production</SelectLabel>
            {VALID_SUB_STATUSES[LeadStatus.PRODUCTION].map((subStatus) => (
              <SelectItem 
                key={`${LeadStatus.PRODUCTION}:${subStatus}`}
                value={`${LeadStatus.PRODUCTION}:${subStatus}`}
              >
                {formatStatusDisplay(LeadStatus.PRODUCTION, subStatus)}
              </SelectItem>
            ))}
          </SelectGroup>

          {/* INVOICED */}
          <SelectGroup>
            <SelectLabel>Invoiced</SelectLabel>
            {VALID_SUB_STATUSES[LeadStatus.INVOICED].map((subStatus) => (
              <SelectItem 
                key={`${LeadStatus.INVOICED}:${subStatus}`}
                value={`${LeadStatus.INVOICED}:${subStatus}`}
              >
                {formatStatusDisplay(LeadStatus.INVOICED, subStatus)}
              </SelectItem>
            ))}
          </SelectGroup>

          {/* CLOSED */}
          <SelectGroup>
            <SelectLabel>Closed</SelectLabel>
            {VALID_SUB_STATUSES[LeadStatus.CLOSED].map((subStatus) => (
              <SelectItem 
                key={`${LeadStatus.CLOSED}:${subStatus}`}
                value={`${LeadStatus.CLOSED}:${subStatus}`}
              >
                {formatStatusDisplay(LeadStatus.CLOSED, subStatus)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Confirmation dialog for sensitive changes */}
      <AlertDialog open={!!pendingChange} onOpenChange={(open) => !open && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              This action requires special permissions. Are you sure you want to change the status to{' '}
              <strong>
                {pendingChange && formatStatusDisplay(pendingChange.status, pendingChange.subStatus)}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingChange) {
                  applyStatusChange(pendingChange.status, pendingChange.subStatus)
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
