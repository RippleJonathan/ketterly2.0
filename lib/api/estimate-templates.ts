// Estimate Template API Functions
// Mirror of material-templates.ts for estimate templates

import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'
import { calculateMaterialQuantity, RoofMeasurements } from '@/lib/types/materials'
import {
  EstimateTemplate,
  EstimateTemplateInsert,
  EstimateTemplateUpdate,
  EstimateTemplateWithItems,
  TemplateEstimateItem,
  TemplateEstimateItemInsert,
  TemplateEstimateItemUpdate,
  TemplateEstimateItemWithMaterial,
  EstimateTemplateCalculation,
} from '@/lib/types/estimate-templates'

/**
 * Get all estimate templates for a company
 */
export async function getEstimateTemplates(
  companyId: string,
  filters?: {
    category?: string
    includeDeleted?: boolean
  }
): Promise<ApiResponse<EstimateTemplate[]>> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('estimate_templates')
      .select(`
        *,
        template_estimate_items (id)
      `)
      .eq('company_id', companyId)
      .order('name')

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query

    if (error) throw error
    
    // Add item_count to each template
    const templatesWithCount = data?.map(template => ({
      ...template,
      item_count: template.template_estimate_items?.length || 0,
      template_estimate_items: undefined, // Remove the joined data
    })) || []
    
    return { data: templatesWithCount, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get a single estimate template by ID with all items
 */
export async function getEstimateTemplate(
  templateId: string
): Promise<ApiResponse<EstimateTemplateWithItems>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('estimate_templates')
      .select(`
        *,
        template_estimate_items (
          id,
          template_id,
          material_id,
          per_square,
          description,
          sort_order,
          created_at,
          material:materials (
            id,
            name,
            category,
            unit,
            current_cost,
            measurement_type,
            default_per_square
          )
        )
      `)
      .eq('id', templateId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Create a new estimate template
 */
export async function createEstimateTemplate(
  template: EstimateTemplateInsert
): Promise<ApiResponse<EstimateTemplate>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('estimate_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Update an estimate template
 */
export async function updateEstimateTemplate(
  templateId: string,
  updates: EstimateTemplateUpdate
): Promise<ApiResponse<EstimateTemplate>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('estimate_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Soft delete an estimate template
 */
export async function deleteEstimateTemplate(
  templateId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('estimate_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

// =====================================================
// TEMPLATE ESTIMATE ITEMS
// =====================================================

/**
 * Get all items for a template
 */
export async function getTemplateEstimateItems(
  templateId: string
): Promise<ApiResponse<TemplateEstimateItemWithMaterial[]>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('template_estimate_items')
      .select(`
        *,
        material:materials (
          id,
          name,
          category,
          unit,
          current_cost,
          measurement_type,
          default_per_unit,
          default_per_square,
          manufacturer,
          product_line
        )
      `)
      .eq('template_id', templateId)
      .order('sort_order')

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Add a material to an estimate template
 */
export async function addMaterialToEstimateTemplate(
  item: TemplateEstimateItemInsert
): Promise<ApiResponse<TemplateEstimateItem>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('template_estimate_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Bulk add materials to an estimate template
 */
export async function bulkAddMaterialsToEstimateTemplate(
  templateId: string,
  materials: Array<{
    material_id: string
    per_square: number
    description?: string
  }>
): Promise<ApiResponse<TemplateEstimateItem[]>> {
  try {
    const supabase = createClient()

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('template_estimate_items')
      .select('sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const startingSortOrder = existing?.[0]?.sort_order ?? -1

    const items = materials.map((m, index) => ({
      template_id: templateId,
      material_id: m.material_id,
      per_square: m.per_square,
      description: m.description || null,
      sort_order: startingSortOrder + index + 1,
    }))

    const { data, error } = await supabase
      .from('template_estimate_items')
      .insert(items)
      .select()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Update an estimate template item
 */
export async function updateTemplateEstimateItem(
  itemId: string,
  updates: TemplateEstimateItemUpdate
): Promise<ApiResponse<TemplateEstimateItem>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('template_estimate_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Remove a material from an estimate template
 */
export async function removeMaterialFromEstimateTemplate(
  itemId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('template_estimate_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
    return { data: null, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Reorder template items
 */
export async function reorderTemplateEstimateItems(
  items: Array<{ id: string; sort_order: number }>
): Promise<ApiResponse<void>> {
  try {
    const supabase = createClient()

    const updates = items.map(({ id, sort_order }) =>
      supabase
        .from('template_estimate_items')
        .update({ sort_order })
        .eq('id', id)
    )

    await Promise.all(updates)

    return { data: null, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get template calculations (uses database view)
 */
export async function getEstimateTemplateCalculations(
  companyId: string,
  templateId?: string
): Promise<ApiResponse<EstimateTemplateCalculation[]>> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('estimate_template_calculations')
      .select('*')
      .eq('company_id', companyId)

    if (templateId) {
      query = query.eq('template_id', templateId)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Import template items with auto-calculated quantities based on measurements
 * Returns formatted line items ready to be added to a quote
 */
export async function importTemplateToEstimate(params: {
  companyId: string
  templateId: string
  measurements: RoofMeasurements
  locationId?: string | null // Optional location ID for pricing
}): Promise<ApiResponse<any[]>> {
  try {
    const supabase = createClient()
    const { companyId, templateId, measurements, locationId } = params

    // Import pricing utility
    const { getMaterialPriceForLocation } = await import('@/lib/utils/location-pricing')

    // Fetch template items with material details
    const { data: items, error } = await supabase
      .from('template_estimate_items')
      .select(`
        *,
        material:materials(
          id,
          name,
          unit,
          current_cost,
          measurement_type,
          default_per_unit,
          default_per_square,
          manufacturer,
          product_line,
          notes
        )
      `)
      .eq('template_id', templateId)
      .order('sort_order')

    if (error) throw error
    if (!items || items.length === 0) {
      return { data: [], error: null }
    }

    // Calculate quantities and get location pricing for each item
    const lineItemsPromises = items.map(async (item: any) => {
      const material = item.material
      if (!material) return null

      const measurementType = material.measurement_type || 'square'
      const perUnit = material.default_per_unit || material.default_per_square || 1

      const calculatedQty = calculateMaterialQuantity(
        measurementType,
        perUnit,
        measurements
      )

      // Get location-specific pricing (falls back to base cost if no location)
      const pricingResult = await getMaterialPriceForLocation(
        material.id,
        locationId
      )

      console.log(`Template import - ${material.name}: $${pricingResult.price} (${pricingResult.source})`)

      return {
        description: item.description || `${material.name}${material.manufacturer ? ` - ${material.manufacturer}` : ''}`,
        quantity: calculatedQty,
        unit: material.unit,
        unit_price: pricingResult.price,
        cost_per_unit: pricingResult.price,
        supplier: '',
        notes: material.notes || '',
      }
    })

    const lineItems = (await Promise.all(lineItemsPromises)).filter(Boolean)

    return { data: lineItems, error: null }
  } catch (error: any) {
    console.error('Failed to import template:', error)
    return { data: null, error }
  }
}
