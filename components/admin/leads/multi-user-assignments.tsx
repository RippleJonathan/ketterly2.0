'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tantml:react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { useCheckPermission } from '@/lib/hooks/use-permissions'
import { updateLeadAction } from '@/lib/actions/leads'
import { autoCreateCommission } from '@/lib/utils/auto-commission'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { UserCircle } from 'lucide-react'

interface MultiUserAssignmentsProps {
  leadId: string
  salesRepId: string | null
  marketingRepId: string | null
  salesManagerId: string | null
  productionManagerId: string | null
  compact?: boolean
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

export function MultiUserAssignments({ 
  leadId, 
  salesRepId, 
  marketingRepId, 
  salesManagerId, 
  productionManagerId,
  compact = false 
}: MultiUserAssignmentsProps) {
  const { data: company } = useCurrentCompany()
  const { data: userData } = useCurrentUser()
  const currentUser = userData?.data
  const queryClient = useQueryClient()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check team assignment permissions
  const { data: canAssignSalesRep } = useCheckPermission(currentUser?.id, 'can_assign_sales_rep')
  const { data: canAssignSalesManager } = useCheckPermission(currentUser?.id, 'can_assign_sales_manager')
  const { data: canAssignMarketingRep } = useCheckPermission(currentUser?.id, 'can_assign_marketing_rep')
  const { data: canAssignProductionManager } = useCheckPermission(currentUser?.id, 'can_assign_production_manager')

  useEffect(() => {
    async function fetchUsers() {
      if (!company?.id) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('company_id', company.id)
        .order('full_name')

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setUsers(data || [])
      setIsLoading(false)
    }

    fetchUsers()
  }, [company?.id])

  const handleAssign = async (field: string, userId: string) => {
    if (!company?.id) {
      toast.error('Missing company context')
      return
    }
    
    if (!currentUser?.id) {
      toast.error('User not authenticated')
      return
    }

    const assignedTo = userId === 'unassigned' ? null : userId

    // Update lead assignment using server action (triggers notifications)
    const result = await updateLeadAction(
      company.id,
      leadId,
      { [field]: assignedTo } as any,
      currentUser.id
    )

    if (!result.success) {
      console.error('Failed to assign user:', result.error)
      toast.error(result.error || 'Failed to assign user')
      return
    }

    // Automatically create/update commission for assigned user (non-blocking)
    if (assignedTo) {
      await autoCreateCommission(leadId, assignedTo, company.id, currentUser.id, field as any)
    }

    queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
    queryClient.invalidateQueries({ queryKey: ['leads', company.id, leadId] })
    queryClient.invalidateQueries({ queryKey: ['lead-commissions', company.id, leadId] })
    
    const fieldLabel = {
      sales_rep_id: 'Sales Rep',
      marketing_rep_id: 'Marketing Rep',
      sales_manager_id: 'Sales Manager',
      production_manager_id: 'Production Manager',
    }[field]
    
    toast.success(assignedTo ? `${fieldLabel} assigned` : `${fieldLabel} unassigned`)
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  const renderDropdown = (
    label: string, 
    field: string, 
    currentValue: string | null,
    canAssign: boolean | undefined
  ) => {
    const content = (
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <Select
          value={currentValue || 'unassigned'}
          onValueChange={(value) => handleAssign(field, value)}
          disabled={!canAssign}
        >
          <SelectTrigger className={compact ? 'h-8 text-sm' : ''} disabled={!canAssign}>
            <SelectValue placeholder="Unassigned">
              <div className="flex items-center gap-2">
                <UserCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                <span>
                  {currentValue 
                    ? users.find(u => u.id === currentValue)?.full_name || 'Unknown'
                    : 'Unassigned'
                  }
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-gray-400" />
                <span>Unassigned</span>
              </div>
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  <span>{user.full_name}</span>
                  <span className="text-xs text-gray-500">({user.role})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )

    if (!canAssign) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent>
              <p>You don't have permission to assign {label.toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return content
  }

  return (
    <div className="space-y-4">
      {renderDropdown('Sales Rep', 'sales_rep_id', salesRepId, canAssignSalesRep)}
      {renderDropdown('Marketing Rep', 'marketing_rep_id', marketingRepId, canAssignMarketingRep)}
      {renderDropdown('Sales Manager', 'sales_manager_id', salesManagerId, canAssignSalesManager)}
      {renderDropdown('Production Manager', 'production_manager_id', productionManagerId, canAssignProductionManager)}
    </div>
  )
}
