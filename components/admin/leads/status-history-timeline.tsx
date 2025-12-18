'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatStatusDisplay } from '@/lib/utils/status-transitions'
import { LeadStatus, LeadSubStatus } from '@/lib/types/enums'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Bot, User } from 'lucide-react'

interface StatusHistoryEntry {
  id: string
  from_status: LeadStatus | null
  from_sub_status: LeadSubStatus | null
  to_status: LeadStatus
  to_sub_status: LeadSubStatus | null
  automated: boolean
  changed_by: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

interface StatusHistoryTimelineProps {
  leadId: string
  companyId: string
  maxHeight?: string
}

export function StatusHistoryTimeline({
  leadId,
  companyId,
  maxHeight = '400px',
}: StatusHistoryTimelineProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['lead-status-history', leadId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('lead_status_history')
        .select(`
          *,
          user:users(full_name, email)
        `)
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as StatusHistoryEntry[]
    },
    enabled: !!leadId && !!companyId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No status changes yet</p>
      </div>
    )
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div key={entry.id} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                entry.automated 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
              }`}>
                {entry.automated ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              {index < history.length - 1 && (
                <div className="w-0.5 h-full bg-border flex-1 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                {entry.from_status && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {formatStatusDisplay(entry.from_status, entry.from_sub_status)}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </>
                )}
                <Badge variant="default" className="text-xs">
                  {formatStatusDisplay(entry.to_status, entry.to_sub_status)}
                </Badge>
                {entry.automated && (
                  <Badge variant="secondary" className="text-xs">
                    Auto
                  </Badge>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {entry.automated ? (
                  <span>Automatically updated</span>
                ) : (
                  <span>
                    Updated by{' '}
                    <span className="font-medium">
                      {entry.user?.full_name || 'Unknown User'}
                    </span>
                  </span>
                )}
                <span className="mx-1">•</span>
                <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
