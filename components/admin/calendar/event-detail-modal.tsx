'use client'

import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Link as LinkIcon,
  Save,
} from 'lucide-react'
import {
  CalendarEventWithRelations,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_BG_COLORS,
  EVENT_TYPE_TEXT_COLORS,
  EVENT_TYPE_BORDER_COLORS,
  EventStatus,
} from '@/lib/types/calendar'
import {
  useCancelEvent,
  useCompleteEvent,
  useConfirmEvent,
  useDeleteEvent,
  useUpdateEvent,
} from '@/lib/hooks/use-calendar'
import { cn } from '@/lib/utils'
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

interface EventDetailModalProps {
  event: CalendarEventWithRelations | null
  open: boolean
  onClose: () => void
  onEdit?: (event: CalendarEventWithRelations) => void
  canEdit: boolean
}

export function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  canEdit,
}: EventDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [newDate, setNewDate] = useState(event?.event_date || '')
  
  const cancelEvent = useCancelEvent()
  const completeEvent = useCompleteEvent()
  const confirmEvent = useConfirmEvent()
  const deleteEvent = useDeleteEvent()
  const updateEvent = useUpdateEvent()

  if (!event) return null

  const bgColor = EVENT_TYPE_BG_COLORS[event.event_type]
  const textColor = EVENT_TYPE_TEXT_COLORS[event.event_type]
  const borderColor = EVENT_TYPE_BORDER_COLORS[event.event_type]
  const typeLabel = EVENT_TYPE_LABELS[event.event_type]

  const isCancelled = event.status === EventStatus.CANCELLED
  const isCompleted = event.status === EventStatus.COMPLETED
  const isConfirmed = event.status === EventStatus.CONFIRMED

  // Fix title if it says "Unknown Lead" but we have lead data
  const displayTitle = event.title.includes('Unknown Lead') && event.lead?.full_name
    ? event.title.replace('Unknown Lead', event.lead.full_name)
    : event.title

  const handleCancel = async () => {
    await cancelEvent.mutateAsync(event.id)
    onClose()
  }

  const handleComplete = async () => {
    await completeEvent.mutateAsync(event.id)
    onClose()
  }

  const handleConfirm = async () => {
    await confirmEvent.mutateAsync(event.id)
  }

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(event.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      // Error already handled by mutation onError
      setShowDeleteConfirm(false)
    }
  }

  const handleDateChange = async () => {
    if (!newDate || newDate === event.event_date) {
      setIsEditingDate(false)
      return
    }

    try {
      await updateEvent.mutateAsync({
        eventId: event.id,
        updates: { event_date: newDate },
      })
      setIsEditingDate(false)
      onClose()
    } catch (error) {
      // Error already handled by mutation onError
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className={cn(
                  "text-xl mb-2",
                  isCancelled && "line-through text-gray-500"
                )}>
                  {displayTitle}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="secondary" 
                    className={cn(bgColor, textColor)}
                  >
                    {typeLabel}
                  </Badge>
                  {isCancelled && (
                    <Badge variant="destructive">Cancelled</Badge>
                  )}
                  {isCompleted && (
                    <Badge className="bg-green-600">Completed</Badge>
                  )}
                  {isConfirmed && !isCompleted && (
                    <Badge className="bg-blue-600">Confirmed</Badge>
                  )}
                  {event.status === EventStatus.RESCHEDULED && (
                    <Badge variant="outline">Rescheduled</Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            {event.description && (
              <div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 mb-1">Date</p>
                  {isEditingDate ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleDateChange}
                        disabled={updateEvent.isPending}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingDate(false)
                          setNewDate(event.event_date)
                        }}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        {format(parseISO(event.event_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingDate(true)}
                          className="h-6 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  {(event.material_order_id || event.labor_order_id) && !isEditingDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {event.material_order_id && 'Syncs with material order'}
                      {event.labor_order_id && 'Syncs with work order'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Time</p>
                  <p className="text-sm text-gray-900">
                    {event.is_all_day ? (
                      'All Day'
                    ) : (
                      `${event.start_time} - ${event.end_time}`
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-sm text-gray-900">{event.location}</p>
                </div>
              </div>
            )}

            {/* Lead Info */}
            {event.lead && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Customer</p>
                  <p className="text-sm text-gray-900">{event.lead.full_name}</p>
                  {event.lead.phone && (
                    <p className="text-sm text-gray-600">{event.lead.phone}</p>
                  )}
                  {event.lead.email && (
                    <p className="text-sm text-gray-600">{event.lead.email}</p>
                  )}
                  {event.lead.address && (
                    <p className="text-sm text-gray-600">
                      {event.lead.address}, {event.lead.city}, {event.lead.state}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Users */}
            {event.assigned_users && event.assigned_users.length > 0 && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Assigned To</p>
                  <p className="text-sm text-gray-900">
                    {event.assigned_users.length} {event.assigned_users.length === 1 ? 'person' : 'people'}
                  </p>
                  {event.assigned_users_data && (
                    <div className="mt-1 space-y-1">
                      {event.assigned_users_data.map(user => (
                        <p key={user.id} className="text-sm text-gray-600">
                          {user.full_name} ({user.role})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Related Orders */}
            {(event.material_order || event.labor_order) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Linked Orders</p>
                  {event.material_order && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <span>Material Order #{event.material_order.order_number}</span>
                    </div>
                  )}
                  {event.labor_order && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                      <span>Work Order #{event.labor_order.order_number}</span>
                      <span className="text-gray-500">
                        ({format(parseISO(event.labor_order.start_date), 'MMM d')} - {format(parseISO(event.labor_order.end_date), 'MMM d, yyyy')})
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Related Event */}
            {event.related_event && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="h-4 w-4 text-gray-400" />
                <span>Related: {event.related_event.title}</span>
                <span className="text-gray-500">
                  ({format(parseISO(event.related_event.event_date), 'MMM d, yyyy')})
                </span>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {event.notes}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(event)
                  onClose()
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            {/* Note: Editing linked events (material/work orders) will sync changes to the order */}
            {(event.material_order_id || event.labor_order_id) && (
              <p className="text-sm text-gray-500 flex-1">
                {event.material_order_id && 'Note: Date changes will sync to the material order'}
                {event.labor_order_id && 'Note: Date changes will sync to the work order'}
              </p>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{event.title}". This action cannot be undone.
              {(event.material_order_id || event.labor_order_id) && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This event is linked to material/labor orders. Deleting it will not affect the orders.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
