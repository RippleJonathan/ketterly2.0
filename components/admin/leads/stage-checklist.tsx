'use client'

import { useLeadChecklist, useToggleChecklistItem } from '@/lib/hooks/use-checklist'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LEAD_STAGE_LABELS, STAGE_CHECKLIST_ITEMS, getStageCompletionPercentage } from '@/lib/constants/pipeline'
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!checklistItems || checklistItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No checklist items for this stage yet.
          </p>
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-4">
      {Object.entries(itemsByStage).map(([stage, items]) => {
        const completedItems = items.filter(item => item.is_completed).length
        const totalItems = items.length
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        const isCurrentStage = stage === currentStage

        return (
          <Card key={stage} className={isCurrentStage ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] || stage}
                  {isCurrentStage && (
                    <Badge variant="default" className="ml-2">Current</Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {completedItems}/{totalItems} complete
                  </span>
                  <Badge variant="outline">{percentage}%</Badge>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
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
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={item.id}
                        className={`text-sm font-medium cursor-pointer ${
                          item.is_completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {item.item_label}
                      </label>
                      {item.is_completed && item.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {format(new Date(item.completed_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    {item.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
