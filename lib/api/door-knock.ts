// Door Knock Map API Client
import { createClient } from '@/lib/supabase/client';
import type {
  DoorKnockPin,
  DoorKnockPinWithUser,
  DoorKnockPinInsert,
  DoorKnockPinUpdate,
  DoorKnockFilters,
  DoorKnockStats,
} from '@/lib/types/door-knock';
import type { ApiResponse } from '@/lib/types/api';

const supabase = createClient();

/**
 * Get all door knock pins with optional filters
 */
export async function getDoorKnockPins(
  companyId: string,
  filters?: DoorKnockFilters
): Promise<ApiResponse<DoorKnockPinWithUser[]>> {
  try {
    let query = supabase
      .from('door_knock_pins')
      .select(`
        *,
        created_by_user:users!created_by(id, full_name, email)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // Apply filters
    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    if (filters?.pin_types && filters.pin_types.length > 0) {
      query = query.in('pin_type', filters.pin_types);
    }

    if (filters?.start_date) {
      query = query.gte('interaction_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('interaction_date', filters.end_date);
    }

    if (filters?.search) {
      query = query.or(
        `contact_name.ilike.%${filters.search}%,` +
        `contact_phone.ilike.%${filters.search}%,` +
        `address.ilike.%${filters.search}%,` +
        `notes.ilike.%${filters.search}%`
      );
    }

    query = query.order('interaction_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return {
      data: data as DoorKnockPinWithUser[],
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching door knock pins:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch door knock pins',
    };
  }
}

/**
 * Get a single door knock pin by ID
 */
export async function getDoorKnockPin(
  pinId: string
): Promise<ApiResponse<DoorKnockPinWithUser>> {
  try {
    const { data, error } = await supabase
      .from('door_knock_pins')
      .select(`
        *,
        created_by_user:users!created_by(id, full_name, email),
        lead:leads(id, full_name, email, phone, status),
        appointment:calendar_events(id, title, start_time, end_time)
      `)
      .eq('id', pinId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    return {
      data: data as DoorKnockPinWithUser,
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching door knock pin:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch door knock pin',
    };
  }
}

/**
 * Create a new door knock pin
 */
export async function createDoorKnockPin(
  pin: DoorKnockPinInsert
): Promise<ApiResponse<DoorKnockPin>> {
  try {
    const { data, error } = await supabase
      .from('door_knock_pins')
      .insert(pin)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as DoorKnockPin,
      error: null,
    };
  } catch (error: any) {
    console.error('Error creating door knock pin:', error);
    return {
      data: null,
      error: error.message || 'Failed to create door knock pin',
    };
  }
}

/**
 * Update a door knock pin
 */
export async function updateDoorKnockPin(
  pinId: string,
  updates: DoorKnockPinUpdate
): Promise<ApiResponse<DoorKnockPin>> {
  try {
    const { data, error } = await supabase
      .from('door_knock_pins')
      .update(updates)
      .eq('id', pinId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as DoorKnockPin,
      error: null,
    };
  } catch (error: any) {
    console.error('Error updating door knock pin:', error);
    return {
      data: null,
      error: error.message || 'Failed to update door knock pin',
    };
  }
}

/**
 * Soft delete a door knock pin
 */
export async function deleteDoorKnockPin(
  pinId: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('door_knock_pins')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pinId);

    if (error) throw error;

    return {
      data: true,
      error: null,
    };
  } catch (error: any) {
    console.error('Error deleting door knock pin:', error);
    return {
      data: null,
      error: error.message || 'Failed to delete door knock pin',
    };
  }
}

/**
 * Get pins within a radius using the database function
 */
export async function getDoorKnockPinsInRadius(
  companyId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5.0
): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase.rpc('get_door_knock_pins_in_radius', {
      p_company_id: companyId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: radiusKm,
    });

    if (error) throw error;

    return {
      data: data || [],
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching pins in radius:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch pins in radius',
    };
  }
}

/**
 * Get door knock statistics
 */
export async function getDoorKnockStats(
  companyId: string,
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<DoorKnockStats[]>> {
  try {
    const { data, error } = await supabase.rpc('get_door_knock_stats', {
      p_company_id: companyId,
      p_user_id: userId || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;

    return {
      data: data as DoorKnockStats[],
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching door knock stats:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch statistics',
    };
  }
}

/**
 * Convert a door knock pin to a lead
 */
export async function convertPinToLead(
  pinId: string,
  leadId: string
): Promise<ApiResponse<DoorKnockPin>> {
  try {
    const { data, error } = await supabase
      .from('door_knock_pins')
      .update({
        pin_type: 'lead_created',
        lead_id: leadId,
      })
      .eq('id', pinId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as DoorKnockPin,
      error: null,
    };
  } catch (error: any) {
    console.error('Error converting pin to lead:', error);
    return {
      data: null,
      error: error.message || 'Failed to convert pin to lead',
    };
  }
}

/**
 * Link a door knock pin to an appointment
 */
export async function linkPinToAppointment(
  pinId: string,
  appointmentId: string
): Promise<ApiResponse<DoorKnockPin>> {
  try {
    const { data, error } = await supabase
      .from('door_knock_pins')
      .update({
        pin_type: 'appointment_set',
        appointment_id: appointmentId,
      })
      .eq('id', pinId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as DoorKnockPin,
      error: null,
    };
  } catch (error: any) {
    console.error('Error linking pin to appointment:', error);
    return {
      data: null,
      error: error.message || 'Failed to link pin to appointment',
    };
  }
}
