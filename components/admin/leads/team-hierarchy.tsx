'use client'

import { useEffect, useState } from 'react'
import { Building2, Crown, Briefcase, Megaphone, Wrench, Users } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

interface TeamHierarchyProps {
  leadId: string
  locationId: string | null
  salesRepId: string | null
  marketingRepId: string | null
  salesManagerId: string | null
  productionManagerId: string | null
}

interface HierarchyMember {
  id: string | null
  name: string
  role: string
  icon: typeof Building2
  description: string
  isEmpty: boolean
}

export function TeamHierarchy({
  leadId,
  locationId,
  salesRepId,
  marketingRepId,
  salesManagerId,
  productionManagerId,
}: TeamHierarchyProps) {
  const [hierarchy, setHierarchy] = useState<HierarchyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadHierarchy() {
      if (!locationId) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      const members: HierarchyMember[] = []

      try {
        // 2. Get Team Lead (if sales rep has a team)
        let teamLeadId: string | null = null
        let teamLeadName: string | null = null
        
        if (salesRepId) {
          const { data: salesRepTeam } = await supabase
            .from('location_users')
            .select(`
              team_id,
              teams!inner(
                team_lead_id,
                users!teams_team_lead_id_fkey(id, full_name)
              )
            `)
            .eq('user_id', salesRepId)
            .not('team_id', 'is', null)
            .maybeSingle()

          if (salesRepTeam?.teams) {
            const team = salesRepTeam.teams as any
            teamLeadId = team.users?.id
            teamLeadName = team.users?.full_name
          }
        }

        members.push({
          id: teamLeadId,
          name: teamLeadName || salesManagerId ? '(Direct assignment)' : 'Not assigned',
          role: 'Team Lead / Sales Manager',
          icon: Crown,
          description: '',
          isEmpty: !teamLeadName && !salesManagerId,
        })

        // 3. Get Sales Rep
        if (salesRepId) {
          const { data: salesRep } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', salesRepId)
            .single()

          members.push({
            id: salesRep?.id || null,
            name: salesRep?.full_name || 'Unknown',
            role: 'Sales Rep',
            icon: Briefcase,
            description: '',
            isEmpty: false,
          })
        } else {
          members.push({
            id: null,
            name: 'Not assigned',
            role: 'Sales Rep',
            icon: Briefcase,
            description: '',
            isEmpty: true,
          })
        }

        // 4. Get Marketing Rep
        if (marketingRepId) {
          const { data: marketingRep } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', marketingRepId)
            .single()

          members.push({
            id: marketingRep?.id || null,
            name: marketingRep?.full_name || 'Unknown',
            role: 'Marketing Rep',
            icon: Megaphone,
            description: '',
            isEmpty: false,
          })
        } else {
          members.push({
            id: null,
            name: 'Not assigned',
            role: 'Marketing Rep',
            icon: Megaphone,
            description: '',
            isEmpty: true,
          })
        }

        // 5. Get Production Manager
        if (productionManagerId) {
          const { data: productionManager } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', productionManagerId)
            .single()

          members.push({
            id: productionManager?.id || null,
            name: productionManager?.full_name || 'Unknown',
            role: 'Production Manager',
            icon: Wrench,
            description: '',
            isEmpty: false,
          })
        } else {
          members.push({
            id: null,
            name: 'Not assigned',
            role: 'Production Manager',
            icon: Wrench,
            description: '',
            isEmpty: true,
          })
        }

        setHierarchy(members)
      } catch (error) {
        console.error('Error loading team hierarchy:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHierarchy()
  }, [leadId, locationId, salesRepId, marketingRepId, salesManagerId, productionManagerId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </CardTitle>
          <CardDescription>Loading team structure...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!locationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </CardTitle>
          <CardDescription>
            Assign a location to view the team hierarchy
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team
        </CardTitle>
        <CardDescription>
          Team members assigned to this lead
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {hierarchy.map((member, index) => {
            const Icon = member.icon
            const isLast = index === hierarchy.length - 1

            return (
              <div key={index} className="relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Member Card */}
                <div
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border transition-colors
                    ${member.isEmpty ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}
                  `}
                >
                  <div className={`
                    h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${member.isEmpty ? 'bg-gray-200' : 'bg-primary/10'}
                  `}>
                    <Icon className={`h-5 w-5 ${member.isEmpty ? 'text-gray-400' : 'text-primary'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium ${member.isEmpty ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                        {member.name}
                      </p>
                      <Badge variant={member.isEmpty ? 'secondary' : 'default'} className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
