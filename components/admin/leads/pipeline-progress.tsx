'use client'

import { PIPELINE_STAGE_ORDER, LEAD_STAGE_LABELS } from '@/lib/constants/pipeline'
import { useUpdateLeadStatus } from '@/lib/hooks/use-leads'
import { Check } from 'lucide-react'

interface PipelineProgressProps {
  leadId: string
  currentStatus: string
  compact?: boolean
}

const PIPELINE_STAGES = PIPELINE_STAGE_ORDER

export function PipelineProgress({ leadId, currentStatus, compact = false }: PipelineProgressProps) {
  const updateStatus = useUpdateLeadStatus()
  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus as any)

  const handleStageClick = async (status: string) => {
    if (status !== currentStatus) {
      await updateStatus.mutateAsync({ leadId, status })
    }
  }

  return (
    <div className={compact ? "w-full py-1" : "w-full py-4"}>
      <div className="flex items-center justify-between">
        {PIPELINE_STAGES.map((status, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isClickable = true

          return (
            <div key={status} className="flex items-center flex-1">
              {/* Stage Circle */}
              <button
                onClick={() => handleStageClick(status)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center rounded-full border-2 transition-all
                  ${compact ? 'w-6 h-6' : 'w-10 h-10'}
                  ${isCurrent ? 'border-blue-600 bg-blue-600 text-white' : ''}
                  ${isCompleted ? 'border-green-600 bg-green-600 text-white' : ''}
                  ${!isCurrent && !isCompleted ? 'border-gray-300 bg-white text-gray-400' : ''}
                  ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                `}
                title={LEAD_STAGE_LABELS[status as keyof typeof LEAD_STAGE_LABELS]}
              >
                {isCompleted ? (
                  <Check className={compact ? "w-3 h-3" : "w-5 h-5"} />
                ) : (
                  <span className={compact ? "text-[10px] font-semibold" : "text-xs font-semibold"}>{index + 1}</span>
                )}
              </button>

              {/* Connecting Line */}
              {index < PIPELINE_STAGES.length - 1 && (
                <div
                  className={`
                    flex-1 mx-1 transition-all
                    ${compact ? 'h-0.5' : 'h-1'}
                    ${index < currentIndex ? 'bg-green-600' : 'bg-gray-300'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels - hide in compact mode */}
      {!compact && (
        <div className="flex items-center justify-between mt-2">
          {PIPELINE_STAGES.map((status) => (
            <div key={status} className="flex-1 text-center">
              <p className="text-xs text-gray-600 px-1">
                {LEAD_STAGE_LABELS[status as keyof typeof LEAD_STAGE_LABELS]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
