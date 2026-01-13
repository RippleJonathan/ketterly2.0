'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentCompany } from '@/lib/hooks/use-current-company'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, MapPin, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export function RecentJobs({ limit = 5 }: { limit?: number }) {
  const { data: company } = useCurrentCompany()

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['recent-jobs', company?.id, limit],
    queryFn: async () => {
      const supabase = createClient()
      
      // Get most recently updated leads
      const { data } = await supabase
        .from('leads')
        .select(`
          id,
          full_name,
          address,
          city,
          state,
          status,
          sub_status,
          updated_at,
          quotes (
            id,
            status,
            total,
            accepted_at
          )
        `)
        .eq('company_id', company!.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit)

      return data || []
    },
    enabled: !!company?.id,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No recent jobs
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <Link
              key={job.id}
              href={`/admin/leads/${job.id}`}
              className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-gray-900">{job.full_name}</div>
                {job.quotes && job.quotes.length > 0 && job.quotes[0].total && (
                  <div className="text-sm font-semibold text-green-600">
                    ${job.quotes[0].total.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{job.city}, {job.state}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {job.status.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
