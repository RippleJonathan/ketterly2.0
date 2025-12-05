/**
 * Material Master System Types
 * Replaces embedded template items with reusable material catalog
 */

export type MaterialCategory = 
  | 'shingles'
  | 'underlayment'
  | 'ventilation'
  | 'flashing'
  | 'fasteners'
  | 'siding'
  | 'windows'
  | 'gutters'
  | 'other'

export type MaterialUnit = 
  | 'bundle'
  | 'roll'
  | 'box'
  | 'square'
  | 'linear_foot'
  | 'each'
  | 'sheet'
  | 'bag'

export type MeasurementType = 
  | 'square'        // Per roofing square (100 sq ft)
  | 'hip_ridge'     // Per linear foot of hip + ridge combined
  | 'perimeter'     // Per linear foot of rake + eave combined
  | 'ridge'         // Per linear foot of ridge only
  | 'valley'        // Per linear foot of valley only
  | 'rake'          // Per linear foot of rake only
  | 'eave'          // Per linear foot of eave only
  | 'each'          // Fixed quantity (not measurement-based)

export interface Material {
  id: string
  company_id: string
  
  // Material identification
  name: string
  category: MaterialCategory
  manufacturer: string | null
  product_line: string | null
  sku: string | null
  
  // Pricing & units
  unit: MaterialUnit
  current_cost: number | null
  last_price_update: string | null
  
  // Supplier
  default_supplier_id: string | null
  
  // Measurement & conversion
  measurement_type: MeasurementType  // What measurement this material uses
  default_per_unit: number | null    // Default quantity per measurement unit
  default_per_square: number | null  // DEPRECATED: Use default_per_unit instead (kept for backward compatibility)
  
  // Status
  is_active: boolean
  notes: string | null
  
  // Audit
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MaterialInsert {
  name: string
  category: MaterialCategory
  manufacturer?: string | null
  product_line?: string | null
  sku?: string | null
  unit: MaterialUnit
  current_cost?: number | null
  default_supplier_id?: string | null
  measurement_type?: MeasurementType
  default_per_unit?: number | null
  default_per_square?: number | null  // DEPRECATED: Use default_per_unit
  is_active?: boolean
  notes?: string | null
}

export interface MaterialUpdate {
  name?: string
  category?: MaterialCategory
  manufacturer?: string | null
  product_line?: string | null
  sku?: string | null
  unit?: MaterialUnit
  current_cost?: number | null
  last_price_update?: string | null
  default_supplier_id?: string | null
  measurement_type?: MeasurementType
  default_per_unit?: number | null
  default_per_square?: number | null  // DEPRECATED: Use default_per_unit
  is_active?: boolean
  notes?: string | null
}

export interface MaterialFilters {
  category?: MaterialCategory
  is_active?: boolean
  supplier_id?: string
  search?: string
}

/**
 * Junction table: Materials assigned to templates
 * Note: measurement_type and per_unit come from the material itself, not stored here
 */
export interface TemplateMaterial {
  id: string
  template_id: string
  material_id: string
  per_square: number                 // DEPRECATED: Use material.default_per_unit instead (kept for backward compatibility)
  description: string | null
  sort_order: number
  created_at: string
  
  // Joined data (when querying with relations)
  material?: Material  // This contains measurement_type and default_per_unit
}

export interface TemplateMaterialInsert {
  template_id: string
  material_id: string
  description?: string | null
  sort_order?: number
}

export interface TemplateMaterialUpdate {
  description?: string | null
  sort_order?: number
}

/**
 * Material with full template context
 */
export interface MaterialWithTemplates extends Material {
  templates?: Array<{
    template_id: string
    template_name: string
  }>
}

/**
 * Helper for material search/autocomplete
 */
export interface MaterialSearchResult {
  id: string
  name: string
  category: MaterialCategory
  manufacturer: string | null
  unit: MaterialUnit
  current_cost: number | null
  measurement_type: MeasurementType
  default_per_unit: number | null
  default_per_square: number | null  // DEPRECATED
}

/**
 * Price history tracking (future enhancement)
 */
export interface MaterialPriceHistory {
  id: string
  material_id: string
  cost: number
  effective_date: string
  supplier_id: string | null
  notes: string | null
  created_at: string
}

/**
 * Roof measurements needed for material calculations
 */
export interface RoofMeasurements {
  total_squares: number
  hip_ridge_total?: number  // Combined hip + ridge feet
  perimeter_total?: number  // Combined rake + eave feet
  ridge_feet?: number
  valley_feet?: number
  rake_feet?: number
  eave_feet?: number
  hip_feet?: number
}

/**
 * Calculated material quantity from template + measurements
 */
export interface CalculatedMaterialQuantity {
  material_id: string
  material_name: string
  measurement_type: MeasurementType
  measurement_value: number  // The actual measurement used (e.g., 25 squares or 100 LF)
  per_unit: number          // Conversion rate (e.g., 3.0 bundles per square)
  calculated_quantity: number  // Final calculated quantity
  unit: string
  description: string | null
  estimated_unit_cost: number | null
  estimated_total: number | null
}

/**
 * Helper to get measurement value based on type
 */
export function getMeasurementValue(
  measurementType: MeasurementType,
  measurements: RoofMeasurements
): number {
  switch (measurementType) {
    case 'square':
      return measurements.total_squares
    case 'hip_ridge':
      return measurements.hip_ridge_total || 0
    case 'perimeter':
      return measurements.perimeter_total || 0
    case 'ridge':
      return measurements.ridge_feet || 0
    case 'valley':
      return measurements.valley_feet || 0
    case 'rake':
      return measurements.rake_feet || 0
    case 'eave':
      return measurements.eave_feet || 0
    case 'each':
      return 1 // Fixed quantity
    default:
      return 0
  }
}

/**
 * Helper to calculate quantity based on measurement type
 */
export function calculateMaterialQuantity(
  measurementType: MeasurementType,
  perUnit: number,
  measurements: RoofMeasurements
): number {
  const measurementValue = getMeasurementValue(measurementType, measurements)
  
  switch (measurementType) {
    case 'square':
      // Quantity = squares × per_unit (e.g., 25 squares × 3.0 bundles = 75 bundles)
      return measurementValue * perUnit
      
    case 'hip_ridge':
    case 'perimeter':
    case 'ridge':
    case 'valley':
    case 'rake':
    case 'eave':
      // Quantity = feet ÷ per_unit (e.g., 100 LF ÷ 33 LF per bundle = 3.03 bundles)
      return perUnit > 0 ? measurementValue / perUnit : 0
      
    case 'each':
      // Fixed quantity (per_unit is the quantity itself)
      return perUnit
      
    default:
      return 0
  }
}

/**
 * Helper to get display label for measurement type
 */
export function getMeasurementTypeLabel(type: MeasurementType): string {
  const labels: Record<MeasurementType, string> = {
    square: 'Per Square (100 sq ft)',
    hip_ridge: 'Per Hip + Ridge Linear Feet',
    perimeter: 'Per Perimeter (Rake + Eave)',
    ridge: 'Per Ridge Linear Feet',
    valley: 'Per Valley Linear Feet',
    rake: 'Per Rake Linear Feet',
    eave: 'Per Eave Linear Feet',
    each: 'Fixed Quantity',
  }
  return labels[type] || type
}

/**
 * Helper to get unit description for measurement type
 */
export function getMeasurementUnitDescription(type: MeasurementType): string {
  switch (type) {
    case 'square':
      return 'bundles per square'
    case 'hip_ridge':
    case 'perimeter':
    case 'ridge':
    case 'valley':
    case 'rake':
    case 'eave':
      return 'linear feet per unit'
    case 'each':
      return 'fixed quantity'
    default:
      return 'per unit'
  }
}
