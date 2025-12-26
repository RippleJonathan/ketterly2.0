/**
 * Ketterly CRM - Presentation System Types
 * Sales presentation builder with dynamic slides and interactive pricing
 */

// =============================================
// DATABASE TYPES
// =============================================

export type FlowType = 'retail' | 'insurance' | 'both'

export type SlideType =
  | 'static'           // Static content (images/text)
  | 'dynamic_pricing'  // Interactive Good/Better/Best grid
  | 'customer_info'    // Dynamic customer data
  | 'measurement_data' // Roof measurements
  | 'company_info'     // Company details
  | 'photo_gallery'    // Photo slideshow
  | 'video'            // Video embed
  | 'closing'          // Final slide with CTA

export type ActionButtonType =
  | 'trigger_contract'
  | 'trigger_contingency'
  | 'link_external'
  | 'next_slide'

export type SessionStatus = 'active' | 'completed' | 'abandoned'

export type PricingOption = 'good' | 'better' | 'best'

// =============================================
// PRESENTATION TEMPLATES
// =============================================

export interface PresentationTemplate {
  id: string
  company_id: string
  name: string
  description: string | null
  flow_type: FlowType
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PresentationTemplateInsert {
  company_id: string
  name: string
  description?: string
  flow_type: FlowType
  is_active?: boolean
  created_by?: string
}

export interface PresentationTemplateUpdate {
  name?: string
  description?: string
  flow_type?: FlowType
  is_active?: boolean
  updated_at?: string
}

// =============================================
// PRESENTATION SLIDES
// =============================================

export interface ActionButtonConfig {
  enabled: boolean
  label?: string
  type?: ActionButtonType
  config?: Record<string, any>
}

export interface SlideContent {
  // For static slides
  html?: string
  images?: string[]
  
  // For dynamic_pricing slides
  options?: PricingOptionConfig[]
  recommended_option?: PricingOption
  
  // For customer_info slides
  fields?: string[]
  
  // For photo_gallery slides
  media_ids?: string[]
  
  // For video slides
  video_url?: string
  video_provider?: 'youtube' | 'vimeo' | 'direct'
  
  // For company_info slides
  show_logo?: boolean
  show_address?: boolean
  show_contact?: boolean
  custom_html?: string
}

export interface PricingOptionConfig {
  id: string
  name: string
  label: string
  description?: string
  highlight?: boolean
  features?: string[]
}

export interface PresentationSlide {
  id: string
  template_id: string
  title: string | null
  slide_order: number
  slide_type: SlideType
  content: SlideContent
  show_for_retail: boolean
  show_for_insurance: boolean
  requires_estimates: boolean
  action_button_enabled: boolean
  action_button_label: string | null
  action_button_type: ActionButtonType | null
  action_button_config: Record<string, any>
  created_at: string
  updated_at: string
}

export interface PresentationSlideInsert {
  template_id: string
  title?: string
  slide_order: number
  slide_type: SlideType
  content?: SlideContent
  show_for_retail?: boolean
  show_for_insurance?: boolean
  requires_estimates?: boolean
  action_button_enabled?: boolean
  action_button_label?: string
  action_button_type?: ActionButtonType
  action_button_config?: Record<string, any>
}

export interface PresentationSlideUpdate {
  title?: string
  slide_order?: number
  slide_type?: SlideType
  content?: SlideContent
  show_for_retail?: boolean
  show_for_insurance?: boolean
  requires_estimates?: boolean
  action_button_enabled?: boolean
  action_button_label?: string
  action_button_type?: ActionButtonType
  action_button_config?: Record<string, any>
  updated_at?: string
}

// =============================================
// PRESENTATION MEDIA
// =============================================

export interface PresentationMedia {
  id: string
  company_id: string
  file_name: string
  file_url: string
  file_type: 'image' | 'video'
  mime_type: string | null
  file_size: number | null
  used_in_slides: string[]
  uploaded_by: string | null
  created_at: string
  deleted_at: string | null
}

export interface PresentationMediaInsert {
  company_id: string
  file_name: string
  file_url: string
  file_type: 'image' | 'video'
  mime_type?: string
  file_size?: number
  uploaded_by?: string
}

// =============================================
// PRESENTATION SESSIONS
// =============================================

export interface PresentationSession {
  id: string
  company_id: string
  template_id: string
  lead_id: string
  flow_type: FlowType
  selected_estimate_id: string | null
  selected_option: PricingOption | null
  deck_data: PresentationDeck | null
  status: SessionStatus
  completed_at: string | null
  contract_signed: boolean
  presented_by: string | null
  created_at: string
  updated_at: string
}

export interface PresentationSessionInsert {
  company_id: string
  template_id: string
  lead_id: string
  flow_type: FlowType
  selected_estimate_id?: string
  deck_data?: PresentationDeck
  presented_by?: string
}

export interface PresentationSessionUpdate {
  selected_estimate_id?: string
  selected_option?: PricingOption
  deck_data?: PresentationDeck
  status?: SessionStatus
  completed_at?: string
  ended_at?: string
  duration_seconds?: number
  contract_signed?: boolean
  updated_at?: string
}

// =============================================
// PRESENTATION DECK (Runtime)
// =============================================

export interface CustomerData {
  name: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  service_address: string | null
  city: string | null
  service_city: string | null
  state: string | null
  service_state: string | null
  zip: string | null
  service_zip: string | null
  property_type: string | null
  square_footage: number | null
}

export interface EstimateData {
  id: string
  quote_number: string
  subtotal: number
  tax: number
  total: number
  price_good: number
  price_better: number
  price_best: number
  line_items: any[]
}

export interface CompiledSlide {
  id: string
  title: string | null
  slide_type: SlideType
  content: SlideContent
  action_button: ActionButtonConfig
}

export interface PresentationDeck {
  template_id: string
  template_name: string
  flow_type: FlowType
  customer_data: CustomerData
  estimates: EstimateData[]
  slides: CompiledSlide[]
  company_name: string
  company_logo_url: string | null
  company_primary_color: string | null
  company_email: string | null
  company_phone: string | null
  company_address: string | null
}

// =============================================
// FRONTEND STATE MANAGEMENT
// =============================================

export interface PresentationState {
  session_id: string
  current_slide: number
  selected_estimate_id: string | null
  selected_option: PricingOption | null
  is_fullscreen: boolean
  show_exit_confirmation: boolean
}

export interface PricingGridState {
  options: {
    good?: EstimateData
    better?: EstimateData
    best?: EstimateData
  }
  selected: PricingOption
  highlighted: PricingOption | null
}

// =============================================
// MODAL/UI TYPES
// =============================================

export interface PresentModalConfig {
  lead_id: string
  available_estimates: EstimateData[]
  available_templates: PresentationTemplate[]
}

export interface PresentModalSelection {
  template_id: string
  flow_type: FlowType
  estimate_ids: string[]
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface GetPresentationDeckResponse {
  deck: PresentationDeck
  session_id: string
}

export interface UpdatePresentationSessionResponse {
  session: PresentationSession
  success: boolean
}

export interface CompletePresentationResponse {
  session: PresentationSession
  contract_id?: string
  success: boolean
}
