'use client'

import { useLeadChecklist, useToggleChecklistItem } from '@/lib/hooks/use-checklist'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LEAD_STAGE_LABELS, PIPELINE_STAGE_ORDER } from '@/lib/constants/pipeline'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Circle } from 'lucide-react'
import { format } from 'date-fns'

interface StageChecklistProps {
  leadId: string
  currentStage: string
}

export function StageChecklist({ leadId, currentStage }: StageChecklistProps) {
  const { data: checklistItems, isLoading } = useLeadChecklist(leadId)
  const toggleItem = useToggleChecklistItem()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!checklistItems || checklistItems.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          No checklist items for this stage yet.
        </p>
      </div>
    )
  }

  // Group items by stage
  const itemsByStage = checklistItems.reduce((acc, item) => {
    if (!acc[item.stage]) {
      acc[item.stage] = []
    }
    acc[item.stage].push(item)
    return acc
  }, {} as Record<string, typeof checklistItems>)

  // Show all pipeline stages in order (even if no items exist)
  const sortedStages = PIPELINE_STAGE_ORDER

  return (
    <div className="space-y-3">
      {sortedStages.map((stage) => {
        const items = itemsByStage[stage] || []
        const completedItems = items.filter(item => item.is_completed).length
        const totalItems = items.length
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        const isCurrentStage = stage === currentStage

        return (
          <div
            key={stage}
            className={`bg-white border rounded-lg p-4 ${
              isCurrentStage ? 'border-blue-500 shadow-sm' : 'border-gray-200'
            }`}
          >
            {/* Stage Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] || stage}
                </h3>
                {isCurrentStage && (
                  <Badge variant="default" className="text-xs">Current</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {completedItems}/{totalItems}
                </span>
                <Badge variant="outline" className="text-xs">{percentage}%</Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {items.length > 0 ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.is_completed}
                      onCheckedChange={(checked) => {
                        toggleItem.mutate({
                          itemId: item.id,
                          isCompleted: checked === true,
                          leadId,
                          itemLabel: item.item_label,
                          stage: item.stage,
                        })
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={item.id}
                        className={`text-sm cursor-pointer block ${
                          item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {item.item_label}
                      </label>
                      {item.is_completed && item.completed_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(item.completed_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    {item.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic py-2">
                  No checklist items for this stage yet.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
