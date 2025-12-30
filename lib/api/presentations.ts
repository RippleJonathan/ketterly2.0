/**
 * Ketterly CRM - Presentation System API
 * Functions for managing sales presentations, templates, and sessions
 */

import { createClient } from '@/lib/supabase/client'
import type {
  PresentationTemplate,
  PresentationTemplateInsert,
  PresentationTemplateUpdate,
  PresentationSlide,
  PresentationSlideInsert,
  PresentationSlideUpdate,
  PresentationMedia,
  PresentationMediaInsert,
  PresentationSession,
  PresentationSessionInsert,
  PresentationSessionUpdate,
  PresentationDeck,
  FlowType,
} from '@/lib/types/presentations'

// =============================================
// PRESENTATION TEMPLATES
// =============================================

export async function getPresentationTemplates(companyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_templates')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching presentation templates:', error)
    return { data: null, error }
  }

  return { data: data as PresentationTemplate[], error: null }
}

export async function getActivePresentationTemplates(companyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching active presentation templates:', error)
    return { data: null, error }
  }

  return { data: data as PresentationTemplate[], error: null }
}

export async function getPresentationTemplate(templateId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_templates')
    .select('*, presentation_slides(*)')
    .eq('id', templateId)
    .single()

  if (error) {
    console.error('Error fetching presentation template:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

export async function createPresentationTemplate(template: PresentationTemplateInsert) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_templates')
    .insert(template)
    .select()
    .single()

  if (error) {
    console.error('Error creating presentation template:', error)
    return { data: null, error }
  }

  return { data: data as PresentationTemplate, error: null }
}

export async function updatePresentationTemplate(
  templateId: string,
  updates: PresentationTemplateUpdate
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single()

  if (error) {
    console.error('Error updating presentation template:', error)
    return { data: null, error }
  }

  return { data: data as PresentationTemplate, error: null }
}

export async function deletePresentationTemplate(templateId: string) {
  const supabase = createClient()

  // Soft delete
  const { error } = await supabase
    .from('presentation_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) {
    console.error('Error deleting presentation template:', error)
    return { error }
  }

  return { error: null }
}

// =============================================
// PRESENTATION SLIDES
// =============================================

export async function getPresentationSlides(templateId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_slides')
    .select('*')
    .eq('template_id', templateId)
    .order('slide_order', { ascending: true })

  if (error) {
    console.error('Error fetching presentation slides:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSlide[], error: null }
}

export async function createPresentationSlide(slide: PresentationSlideInsert) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_slides')
    .insert(slide)
    .select()
    .single()

  if (error) {
    console.error('Error creating presentation slide:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSlide, error: null }
}

export async function updatePresentationSlide(
  slideId: string,
  updates: PresentationSlideUpdate
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_slides')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', slideId)
    .select()
    .single()

  if (error) {
    console.error('Error updating presentation slide:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSlide, error: null }
}

export async function deletePresentationSlide(slideId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('presentation_slides')
    .delete()
    .eq('id', slideId)

  if (error) {
    console.error('Error deleting presentation slide:', error)
    return { error }
  }

  return { error: null }
}

export async function reorderPresentationSlides(
  templateId: string,
  slideOrders: { id: string; order: number }[]
) {
  const supabase = createClient()

  // Update each slide's order
  const updates = slideOrders.map(({ id, order }) =>
    supabase
      .from('presentation_slides')
      .update({ slide_order: order, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('template_id', templateId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    console.error('Error reordering slides:', errors)
    return { error: errors[0].error }
  }

  return { error: null }
}

// =============================================
// PRESENTATION MEDIA
// =============================================

export async function getPresentationMedia(companyId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_media')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching presentation media:', error)
    return { data: null, error }
  }

  return { data: data as PresentationMedia[], error: null }
}

export async function createPresentationMedia(media: PresentationMediaInsert) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_media')
    .insert(media)
    .select()
    .single()

  if (error) {
    console.error('Error creating presentation media:', error)
    return { data: null, error }
  }

  return { data: data as PresentationMedia, error: null }
}

export async function deletePresentationMedia(mediaId: string) {
  const supabase = createClient()

  // Soft delete
  const { error } = await supabase
    .from('presentation_media')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', mediaId)

  if (error) {
    console.error('Error deleting presentation media:', error)
    return { error }
  }

  return { error: null }
}

// =============================================
// PRESENTATION SESSIONS
// =============================================

export async function getPresentationSessions(leadId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .select('*, presentation_templates(name), users(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching presentation sessions:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

export async function getPresentationSession(sessionId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Error fetching presentation session:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSession, error: null }
}

export async function createPresentationSession(session: PresentationSessionInsert) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .insert(session)
    .select()
    .single()

  if (error) {
    console.error('Error creating presentation session:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSession, error: null }
}

export async function updatePresentationSession(
  sessionId: string,
  updates: PresentationSessionUpdate
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating presentation session:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSession, error: null }
}

export async function completePresentationSession(
  sessionId: string,
  contractSigned: boolean = false
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      contract_signed: contractSigned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error completing presentation session:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSession, error: null }
}

export async function abandonPresentationSession(sessionId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presentation_sessions')
    .update({
      status: 'abandoned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error abandoning presentation session:', error)
    return { data: null, error }
  }

  return { data: data as PresentationSession, error: null }
}

// =============================================
// PRESENTATION DECK COMPILATION
// =============================================

/**
 * Get compiled presentation deck using database function
 * This calls the get_presentation_deck() PostgreSQL function
 */
export async function getPresentationDeck(
  templateId: string,
  leadId: string,
  flowType: FlowType,
  estimateIds?: string[]
) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_presentation_deck', {
    p_template_id: templateId,
    p_lead_id: leadId,
    p_flow_type: flowType,
    p_estimate_ids: estimateIds || null,
  })

  if (error) {
    console.error('Error getting presentation deck:', error)
    return { data: null, error }
  }

  // Debug: Log financing options from deck
  if (data) {
    console.log('Presentation deck financing options:', {
      option1_enabled: data.company_financing_option_1_enabled,
      option2_enabled: data.company_financing_option_2_enabled,
      option3_enabled: data.company_financing_option_3_enabled,
      option1_name: data.company_financing_option_1_name,
      option1_months: data.company_financing_option_1_months,
      option1_apr: data.company_financing_option_1_apr,
    })
  }

  return { data: data as PresentationDeck, error: null }
}

/**
 * Start a new presentation session and get the compiled deck
 * This is the main function called when "Start Presentation" is clicked
 */
export async function startPresentation(
  companyId: string,
  templateId: string,
  leadId: string,
  flowType: FlowType,
  estimateIds: string[],
  presentedBy?: string
) {
  // First, compile the deck
  const { data: deck, error: deckError } = await getPresentationDeck(
    templateId,
    leadId,
    flowType,
    estimateIds
  )

  if (deckError || !deck) {
    return { data: null, error: deckError }
  }

  // Create the session with the compiled deck
  const sessionData: PresentationSessionInsert = {
    company_id: companyId,
    template_id: templateId,
    lead_id: leadId,
    flow_type: flowType,
    deck_data: deck,
    presented_by: presentedBy,
  }

  const { data: session, error: sessionError } = await createPresentationSession(sessionData)

  if (sessionError || !session) {
    return { data: null, error: sessionError }
  }

  return {
    data: {
      session,
      deck,
    },
    error: null,
  }
}
