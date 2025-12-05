/**
 * API functions for lead measurements
 * Handles CRUD operations for roof measurements
 */

import { createClient } from '@/lib/supabase/client'

export interface LeadMeasurement {
  id: string
  company_id: string
  lead_id: string
  flat_squares: number | null  // Base measurement without pitch multiplier
  actual_squares: number | null
  waste_percentage: number
  total_squares: number | null
  two_story_squares: number | null
  low_slope_squares: number | null
  steep_7_12_squares: number | null
  steep_8_12_squares: number | null
  steep_9_12_squares: number | null
  steep_10_12_squares: number | null
  steep_11_12_squares: number | null
  steep_12_plus_squares: number | null
  ridge_feet: number | null
  valley_feet: number | null
  eave_feet: number | null
  rake_feet: number | null
  hip_feet: number | null
  layers_to_remove: number
  pitch_ratio: string | null
  notes: string | null
  measured_by: string | null
  measured_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  roof_data_raw: any | null  // Satellite visualization data from Google Solar API
  measurer?: {
    id: string
    full_name: string
    email: string
  }
  accessories?: MeasurementAccessory[]
}

export interface MeasurementAccessory {
  id: string
  measurement_id: string
  material_id: string
  quantity: number
  notes: string | null
  material: {
    id: string
    name: string
    category: string
    unit: string
    current_cost: number | null
  }
}

export interface MeasurementFormData {
  flat_squares: number | null  // Base measurement without pitch multiplier
  actual_squares: number | null
  waste_percentage: number
  two_story_squares: number | null
  low_slope_squares: number | null
  steep_7_12_squares: number | null
  steep_8_12_squares: number | null
  steep_9_12_squares: number | null
  steep_10_12_squares: number | null
  steep_11_12_squares: number | null
  steep_12_plus_squares: number | null
  ridge_feet: number | null
  valley_feet: number | null
  eave_feet: number | null
  rake_feet: number | null
  hip_feet: number | null
  layers_to_remove: number
  pitch_ratio: string | null
  notes: string | null
  roof_data_raw?: any | null  // Satellite visualization data
}

/**
 * Get measurements for a lead (latest measurement)
 */
export async function getLeadMeasurements(leadId: string, companyId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('lead_measurements')
      .select(`
        *,
        measurer:users!lead_measurements_measured_by_fkey(
          id,
          full_name,
          email
        ),
        accessories:measurement_accessories(
          id,
          material_id,
          quantity,
          notes,
          material:materials(
            id,
            name,
            category,
            unit,
            current_cost
          )
        )
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching measurements:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching measurements:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get measurement history for a lead
 */
export async function getMeasurementHistory(leadId: string, companyId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('lead_measurements')
      .select(`
        *,
        measurer:users!lead_measurements_measured_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false })

    if (error) {
      console.error('Error fetching measurement history:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching measurement history:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create new measurements for a lead
 */
export async function createMeasurements(
  leadId: string,
  companyId: string,
  measurements: MeasurementFormData
) {
  const supabase = createClient()

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: new Error('Not authenticated') }
    }

    const { data, error } = await supabase
      .from('lead_measurements')
      .insert({
        lead_id: leadId,
        company_id: companyId,
        measured_by: user.id,
        measured_at: new Date().toISOString(),
        ...measurements,
      })
      .select(`
        *,
        measurer:users!lead_measurements_measured_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating measurements:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error creating measurements:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update existing measurements
 */
export async function updateMeasurements(
  measurementId: string,
  measurements: Partial<MeasurementFormData>
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('lead_measurements')
      .update(measurements)
      .eq('id', measurementId)
      .select(`
        *,
        measurer:users!lead_measurements_measured_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating measurements:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error updating measurements:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete measurements (soft delete)
 */
export async function deleteMeasurements(measurementId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('lead_measurements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', measurementId)

    if (error) {
      console.error('Error deleting measurements:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Error deleting measurements:', error)
    return { error: error as Error }
  }
}

/**
 * Add accessory to measurement
 */
export async function addMeasurementAccessory(
  measurementId: string,
  materialId: string,
  quantity: number,
  notes?: string
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('measurement_accessories')
      .insert({
        measurement_id: measurementId,
        material_id: materialId,
        quantity,
        notes: notes || null,
      })
      .select(`
        *,
        material:materials(
          id,
          name,
          category,
          unit,
          current_cost
        )
      `)
      .single()

    if (error) {
      console.error('Error adding accessory:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error adding accessory:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update measurement accessory quantity
 */
export async function updateMeasurementAccessory(
  accessoryId: string,
  quantity: number
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('measurement_accessories')
      .update({ quantity })
      .eq('id', accessoryId)
      .select(`
        *,
        material:materials(
          id,
          name,
          category,
          unit,
          current_cost
        )
      `)
      .single()

    if (error) {
      console.error('Error updating accessory:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error updating accessory:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Remove accessory from measurement
 */
export async function removeMeasurementAccessory(accessoryId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('measurement_accessories')
      .delete()
      .eq('id', accessoryId)

    if (error) {
      console.error('Error removing accessory:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Error removing accessory:', error)
    return { error: error as Error }
  }
}
