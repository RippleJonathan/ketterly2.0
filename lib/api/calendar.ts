import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse } from '@/lib/types/api'
import {
  CalendarEvent,
  CalendarEventWithRelations,
  CalendarEventInsert,
  CalendarEventUpdate,
  EventFilters,
  EventType,
  EventStatus,
} from '@/lib/types/calendar'

const supabase = createClient()

// =============================================
// CALENDAR EVENTS - READ
// =============================================

/**
 * Get all calendar events for a company with optional filters
 */
export async function getEvents(
  companyId: string,
  filters?: EventFilters
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(
          id, full_name, email, phone, address, city, state, location_id
        ),
        created_by_user:users!calendar_events_created_by_fkey(
          id, full_name
        ),
        material_order:material_orders!calendar_events_material_order_id_fkey(
          id, order_number, expected_delivery_date, actual_delivery_date
        ),
        labor_order:work_orders!calendar_events_labor_order_id_fkey(
          id, work_order_number, scheduled_date, actual_start_date, actual_completion_date
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply filters
    if (filters?.event_types && filters.event_types.length > 0) {
      query = query.in('event_type', filters.event_types)
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id)
    }

    if (filters?.start_date) {
      query = query.gte('event_date', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('event_date', filters.end_date)
    }

    if (filters?.is_all_day !== undefined) {
      query = query.eq('is_all_day', filters.is_all_day)
    }

    if (filters?.exclude_cancelled) {
      query = query.neq('status', 'cancelled')
    }

    // Search in title, description, location
    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query

    if (error) throw error

    // Filter by assigned users (PostgreSQL array search)
    let filteredData = data || []
    if (filters?.assigned_user_ids && filters.assigned_user_ids.length > 0) {
      filteredData = filteredData.filter(event =>
        filters.assigned_user_ids!.some(userId => event.assigned_users.includes(userId))
      )
    }

    // Filter by location if specified (for location admins/office users)
    if (filters?.location_id) {
      filteredData = filteredData.filter(event =>
        event.lead?.location_id === filters.location_id
      )
    }

    return { data: filteredData, error: null, count: count ?? undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get a single calendar event by ID
 */
export async function getEventById(
  eventId: string
): Promise<ApiResponse<CalendarEventWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(
          id, full_name, email, phone, address, city, state
        ),
        created_by_user:users!calendar_events_created_by_fkey(
          id, full_name
        ),
        material_order:material_orders!calendar_events_material_order_id_fkey(
          id, order_number, expected_delivery_date, actual_delivery_date
        ),
        labor_order:work_orders!calendar_events_labor_order_id_fkey(
          id, work_order_number, scheduled_date, actual_start_date, actual_completion_date
        ),
        related_event:calendar_events!calendar_events_related_event_id_fkey(
          id, event_type, title, event_date
        )
      `)
      .eq('id', eventId)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    // Get assigned users data
    if (data && data.assigned_users.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('id', data.assigned_users)

      if (usersData) {
        data.assigned_users_data = usersData
      }
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get all events for a specific lead
 */
export async function getEventsByLead(
  leadId: string
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        created_by_user:users!calendar_events_created_by_fkey(id, full_name)
      `)
      .eq('lead_id', leadId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Get events for a specific user (their schedule)
 */
export async function getEventsByUser(
  companyId: string,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<CalendarEventWithRelations[]>> {
  try {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads!calendar_events_lead_id_fkey(id, full_name, address, city)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true })

    if (startDate) {
      query = query.gte('event_date', startDate)
    }

    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter by assigned user
    const filteredData = (data || []).filter(event =>
      event.assigned_users.includes(userId)
    )

    return { data: filteredData, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Find existing calendar event for a material order
 * Used to prevent duplicate event creation
 */
export async function findEventByMaterialOrderId(
  companyId: string,
  materialOrderId: string
): Promise<ApiResponse<CalendarEvent | null>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('company_id', companyId)
      .eq('material_order_id', materialOrderId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Find existing calendar event for a work order
 * Used to prevent duplicate event creation
 */
export async function findEventByLaborOrderId(
  companyId: string,
  laborOrderId: string
): Promise<ApiResponse<CalendarEvent | null>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('company_id', companyId)
      .eq('labor_order_id', laborOrderId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// CALENDAR EVENTS - CREATE
// =============================================

/**
 * Create a new calendar event
 */
export async function createEvent(
  companyId: string,
  event: CalendarEventInsert
): Promise<ApiResponse<CalendarEvent>> {
  try {
    // Convert empty strings to null for optional UUID fields
    const eventData = {
      ...event,
      company_id: companyId,
      lead_id: event.lead_id || null,
      material_order_id: event.material_order_id || null,
      labor_order_id: event.labor_order_id || null,
      related_event_id: event.related_event_id || null,
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(eventData)
      .select()
      .single()

    if (error) throw error

    // Send email to customer if requested
    if (event.send_email_to_customer && event.lead_id) {
      try {
        // Get lead details for email
        const { data: lead } = await supabase
          .from('leads')
          .select('full_name, email')
          .eq('id', event.lead_id)
          .single()

        if (lead?.email) {
          // Send email via API route to avoid import issues
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-appointment-emails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send_customer_email',
              eventId: data.id,
              customerEmail: lead.email,
              customerName: lead.full_name,
              companyId,
            }),
          }).catch(emailError => {
            console.error('Failed to send appointment confirmation email:', emailError)
          })
        }
      } catch (emailError) {
        console.error('Failed to send appointment confirmation email:', emailError)
        // Don't fail the event creation if email fails
      }
    }

    // Send notifications to assigned users
    if (event.assigned_users && event.assigned_users.length > 0) {
      try {
        // Get lead name if available
        let leadName = null
        if (event.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('full_name')
            .eq('id', event.lead_id)
            .single()
          leadName = lead?.full_name || null
        }

        // Send appointment email notifications via API route
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-appointment-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_user_notifications',
            assignedUsers: event.assigned_users,
            eventData: {
              eventId: data.id,
              eventTitle: event.title,
              eventDate: event.event_date,
              startTime: event.start_time,
              endTime: event.end_time,
              location: event.location,
              leadName,
            },
            companyId,
          }),
        }).catch(notificationError => {
          console.error('Failed to send appointment notifications:', notificationError)
        })

        // Send push notifications for job scheduled
        const { notifyJobScheduled } = await import('@/lib/email/user-notifications')
        for (const userId of event.assigned_users) {
          try {
            await notifyJobScheduled({
              userId,
              companyId,
              eventId: data.id,
              leadId: event.lead_id || null,
              leadName,
              jobDate: event.event_date,
              jobType: event.title,
              address: event.location || null,
            })
          } catch (pushError) {
            console.error(`Failed to send job_scheduled push to user ${userId}:`, pushError)
          }
        }
      } catch (notificationError) {
        console.error('Failed to send appointment notifications:', notificationError)
        // Don't fail the event creation if notifications fail
      }
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create or update calendar event from material order
 * Checks for existing event first to prevent duplicates
 */
export async function createEventFromMaterialOrder(
  companyId: string,
  materialOrderId: string,
  deliveryDate: string,
  leadId: string,
  leadName: string,
  orderNumber: string,
  createdBy: string,
  assignedUsers: string[] = [],
  isWorkOrder: boolean = false  // Flag to create PRODUCTION_LABOR events for work orders
): Promise<ApiResponse<CalendarEvent>> {
  try {
    // Check if event already exists for this material order
    const existingEventResult = await findEventByMaterialOrderId(companyId, materialOrderId)
    
    if (existingEventResult.error) {
      throw existingEventResult.error
    }

    // Determine event type and details based on order type
    const eventType = isWorkOrder ? EventType.PRODUCTION_LABOR : EventType.PRODUCTION_MATERIALS
    const title = isWorkOrder ? `Installation - ${leadName}` : `Material Delivery - ${leadName}`
    const description = isWorkOrder ? `Work Order #${orderNumber}` : `Order #${orderNumber}`

    // If event exists, update it
    if (existingEventResult.data) {
      const updateData: CalendarEventUpdate = {
        event_date: deliveryDate,
        title,
        description,
        assigned_users: assignedUsers.length > 0 ? assignedUsers : existingEventResult.data.assigned_users,
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', existingEventResult.data.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }

    // Otherwise, create new event
    // For unified order system: always use material_order_id (since there's only one table)
    const event: CalendarEventInsert = {
      company_id: companyId,
      lead_id: leadId,
      event_type: eventType,
      title,
      description,
      event_date: deliveryDate,
      is_all_day: true,
      assigned_users: assignedUsers,
      created_by: createdBy,
      material_order_id: materialOrderId,  // Always use this FK for both types
      status: EventStatus.SCHEDULED,
    }

    return createEvent(companyId, event)
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Create or update calendar event from labor order
 * Checks for existing event first to prevent duplicates
 * NOTE: Uses material_order_id because work orders are stored in material_orders table with order_type='work'
 */
export async function createEventFromLaborOrder(
  companyId: string,
  laborOrderId: string,  // This is actually a material_orders.id where order_type='work'
  startDate: string,
  leadId: string,
  leadName: string,
  orderNumber: string,
  crewName: string,
  createdBy: string,
  assignedUsers: string[] = []
): Promise<ApiResponse<CalendarEvent>> {
  try {
    // Check if event already exists for this material order (work orders stored there)
    const existingEventResult = await findEventByMaterialOrderId(companyId, laborOrderId)
    
    if (existingEventResult.error) {
      throw existingEventResult.error
    }

    // If event exists, update it
    if (existingEventResult.data) {
      const updateData: CalendarEventUpdate = {
        event_date: startDate,
        title: `Installation - ${leadName}`,
        description: crewName ? `Work Order #${orderNumber} - ${crewName}` : `Work Order #${orderNumber}`,
        assigned_users: assignedUsers.length > 0 ? assignedUsers : existingEventResult.data.assigned_users,
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', existingEventResult.data.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }

    // Otherwise, create new event
    // Check if there's a related material delivery event
    const { data: materialEvent } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('lead_id', leadId)
      .eq('event_type', EventType.PRODUCTION_MATERIALS)
      .is('deleted_at', null)
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    // For unified order system: use material_order_id for both material and work orders
    const event: CalendarEventInsert = {
      company_id: companyId,
      lead_id: leadId,
      event_type: EventType.PRODUCTION_LABOR,
      title: `Installation - ${leadName}`,
      description: crewName ? `Work Order #${orderNumber} - ${crewName}` : `Work Order #${orderNumber}`,
      event_date: startDate,
      is_all_day: true,
      assigned_users: assignedUsers,
      created_by: createdBy,
      material_order_id: laborOrderId,  // Use material_order_id for work orders too!
      related_event_id: materialEvent?.id || null,
      status: EventStatus.SCHEDULED,
    }

    const result = await createEvent(companyId, event)

    // If material event exists, link them both ways
    if (materialEvent && result.data) {
      await supabase
        .from('calendar_events')
        .update({ related_event_id: result.data.id })
        .eq('id', materialEvent.id)
    }

    return result
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// CALENDAR EVENTS - UPDATE
// =============================================

/**
 * Update a calendar event
 */
export async function updateEvent(
  eventId: string,
  updates: CalendarEventUpdate
): Promise<ApiResponse<CalendarEvent>> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error

    // If this event is linked to a material order, update the delivery/scheduled date
    // Note: Both material and work orders are in the material_orders table (unified architecture)
    if (data.material_order_id && updates.event_date) {
      try {
        // Check if this is a work order or material order
        const { data: orderData, error: fetchError } = await supabase
          .from('material_orders')
          .select('order_type, status')
          .eq('id', data.material_order_id)
          .single()

        if (fetchError) {
          console.error('Failed to fetch order data:', fetchError)
          // Don't throw - calendar event already updated successfully
        } else if (orderData) {
          const isWorkOrder = orderData.order_type === 'work'
          const dateField = isWorkOrder ? 'scheduled_date' : 'expected_delivery_date'
          
          // Auto-update status from 'draft' to 'scheduled' when date is set via drag/drop
          const orderUpdates: any = { [dateField]: updates.event_date }
          if (orderData.status === 'draft') {
            orderUpdates.status = 'scheduled'
          }

          const { error: updateError } = await supabase
            .from('material_orders')
            .update(orderUpdates)
            .eq('id', data.material_order_id)

          if (updateError) {
            console.error('Failed to update order date:', updateError)
            // Don't throw - calendar event already updated successfully
          }
        }
      } catch (orderError) {
        console.error('Error syncing event to order:', orderError)
        // Don't throw - calendar event already updated successfully
      }
    }

    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Reschedule an event to a new date/time
 */
export async function rescheduleEvent(
  eventId: string,
  newDate: string,
  newStartTime?: string | null,
  newEndTime?: string | null
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, {
    event_date: newDate,
    start_time: newStartTime,
    end_time: newEndTime,
    status: EventStatus.RESCHEDULED,
  })
}

/**
 * Cancel an event
 */
export async function cancelEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.CANCELLED })
}

/**
 * Complete an event
 */
export async function completeEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.COMPLETED })
}

/**
 * Confirm an event
 */
export async function confirmEvent(
  eventId: string
): Promise<ApiResponse<CalendarEvent>> {
  return updateEvent(eventId, { status: EventStatus.CONFIRMED })
}

// =============================================
// CALENDAR EVENTS - DELETE
// =============================================

/**
 * Soft delete a calendar event
 */
export async function deleteEvent(
  eventId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()
    
    // Soft delete the event directly (RLS will ensure user has access)
    const { error } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', eventId)
      .is('deleted_at', null) // Only delete if not already deleted

    if (error) {
      console.error('Delete event error:', error)
      throw error
    }
    
    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Check for event conflicts (overlapping times)
 */
export async function checkEventConflicts(
  userId: string,
  eventDate: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<ApiResponse<{ hasConflicts: boolean; conflicts: any[] }>> {
  try {
    const { data, error } = await supabase.rpc('check_event_conflicts', {
      p_user_id: userId,
      p_event_date: eventDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_exclude_event_id: excludeEventId || null,
    })

    if (error) throw error

    const result = data?.[0] || { conflict_count: 0, conflicting_events: null }
    
    return {
      data: {
        hasConflicts: result.conflict_count > 0,
        conflicts: result.conflicting_events || [],
      },
      error: null,
    }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Link two related events (e.g., material delivery and labor install)
 */
export async function linkRelatedEvents(
  eventId1: string,
  eventId2: string
): Promise<ApiResponse<void>> {
  try {
    // Update both events to reference each other
    const { error: error1 } = await supabase
      .from('calendar_events')
      .update({ related_event_id: eventId2 })
      .eq('id', eventId1)

    const { error: error2 } = await supabase
      .from('calendar_events')
      .update({ related_event_id: eventId1 })
      .eq('id', eventId2)

    if (error1) throw error1
    if (error2) throw error2

    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

// =============================================
// BIDIRECTIONAL SYNC FUNCTIONS
// =============================================

/**
 * Update material order delivery date and sync to calendar event
 * Called when user changes the order date in UI
 */
export async function updateMaterialOrderDate(
  companyId: string,
  materialOrderId: string,
  deliveryDate: string | null
): Promise<ApiResponse<void>> {
  try {
    // First, get the current order to check status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('material_orders')
      .select('status')
      .eq('id', materialOrderId)
      .single()

    if (fetchError) throw fetchError

    // Update the material order with auto-status transition
    const updates: any = { expected_delivery_date: deliveryDate }
    if (deliveryDate && currentOrder.status === 'draft') {
      updates.status = 'scheduled'
    }

    const { error: orderError } = await supabase
      .from('material_orders')
      .update(updates)
      .eq('id', materialOrderId)

    if (orderError) throw orderError

    // Find and update the calendar event if it exists
    const eventResult = await findEventByMaterialOrderId(companyId, materialOrderId)
    
    if (eventResult.error) throw eventResult.error

    if (eventResult.data) {
      if (deliveryDate) {
        // Update event date
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({ event_date: deliveryDate })
          .eq('id', eventResult.data.id)

        if (eventError) throw eventError
      } else {
        // No date set, delete the calendar event
        await deleteEvent(eventResult.data.id)
      }
    }

    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * Update work order scheduled date and sync to calendar event
 * Called when user changes the order date in UI
 */
export async function updateWorkOrderDate(
  companyId: string,
  laborOrderId: string,
  scheduledDate: string | null
): Promise<ApiResponse<void>> {
  try {
    // First, get the current order to check status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('material_orders')  // Note: work orders are in material_orders table with order_type='work'
      .select('status')
      .eq('id', laborOrderId)
      .single()

    if (fetchError) throw fetchError

    // Update the work order with auto-status transition
    // Work orders use expected_delivery_date for scheduled date
    const updates: any = { expected_delivery_date: scheduledDate }
    if (scheduledDate && currentOrder.status === 'draft') {
      updates.status = 'scheduled'
    }

    const { error: orderError } = await supabase
      .from('material_orders')  // Note: work orders are in material_orders table with order_type='work'
      .update(updates)
      .eq('id', laborOrderId)

    if (orderError) throw orderError

    // Find and update the calendar event if it exists
    const eventResult = await findEventByLaborOrderId(companyId, laborOrderId)
    
    if (eventResult.error) throw eventResult.error

    if (eventResult.data) {
      if (scheduledDate) {
        // Update event date
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({ event_date: scheduledDate })
          .eq('id', eventResult.data.id)

        if (eventError) throw eventError
      } else {
        // No date set, delete the calendar event
        await deleteEvent(eventResult.data.id)
      }
    }

    return { data: undefined, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
