'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { updateLead } from '@/lib/api/leads'
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
}

interface User {
  id: string
  full_name: string
  email: string
}

export function AssignUserDropdown({ leadId, currentAssignedTo }: AssignUserDropdownProps) {
  const { data: company } = useCurrentCompany()
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
    if (!company?.id) return

    const assignedTo = userId === 'unassigned' ? null : userId

    const result = await updateLead(company.id, leadId, {
      assigned_to: assignedTo,
    })

    if (result.error) {
      toast.error('Failed to assign user')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['leads', company.id] })
    queryClient.invalidateQueries({ queryKey: ['leads', company.id, leadId] })
    toast.success(assignedTo ? 'User assigned successfully' : 'Lead unassigned')
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
      <SelectTrigger className="w-[180px]">
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
