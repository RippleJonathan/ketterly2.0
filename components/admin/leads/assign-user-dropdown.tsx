'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { updateLeadAction } from '@/lib/actions/leads'
import { autoCreateCommission } from '@/lib/utils/auto-commission'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserCircle } from 'lucide-react'

interface AssignUserDropdownProps {
  leadId: string
  currentAssignedTo: string | null
  compact?: boolean
}

interface User {
  id: string
  full_name: string
  email: string
}

export function AssignUserDropdown({ leadId, currentAssignedTo, compact = false }: AssignUserDropdownProps) {
  const { data: company } = useCurrentCompany()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      if (!company?.id) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
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

  const handleAssign = async (userId: string) => {
    if (!company?.id) {
      toast.error('Missing company context')
      return
    }
    
    if (!currentUser?.id) {
      toast.error('User not authenticated')
      return
    }

    const supabase = createClient()
    const assignedTo = userId === 'unassigned' ? null : userId

    // Update lead assignment using server action (triggers notifications)
    const result = await updateLeadAction(
      company.id,
      leadId,
      { assigned_to: assignedTo },
      currentUser.id
    )

    if (!result.success) {
      console.error('Failed to assign user:', result.error)
      toast.error(result.error || 'Failed to assign user')
      return
    }

    // Automatically create/update commission for assigned user (non-blocking)
    // Note: This component uses assigned_to which maps to sales_rep_id
    await autoCreateCommission(leadId, assignedTo, company.id, currentUser.id, 'sales_rep_id')

    queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
    queryClient.invalidateQueries({ queryKey: ['leads', company.id, leadId] })
    queryClient.invalidateQueries({ queryKey: ['lead-commissions', company.id, leadId] })
    
    toast.success(assignedTo ? 'User assigned' : 'Lead unassigned')
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <UserCircle className="h-4 w-4" />
        Loading...
      </div>
    )
  }

  return (
    <Select value={currentAssignedTo || 'unassigned'} onValueChange={handleAssign}>
      <SelectTrigger className={compact ? "w-[140px] h-7 text-sm" : "w-[180px]"}>
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Unassigned</span>
          </div>
        </SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              {user.full_name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
