/**
 * Photo API functions for lead photos
 */

import { createClient } from '@/lib/supabase/client'

export interface LeadPhoto {
  id: string
  company_id: string
  lead_id: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string | null
  category: string
  caption: string | null
  uploaded_by: string | null
  uploaded_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PhotoUploadData {
  leadId: string
  companyId: string
  file: File
  category?: string
  caption?: string
}

/**
 * Get all photos for a lead
 */
export async function getLeadPhotos(leadId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('lead_photos')
    .select(`
      *,
      uploader:users!lead_photos_uploaded_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error fetching photos:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Upload a photo to Supabase Storage and create database record
 */
export async function uploadLeadPhoto({ leadId, companyId, file, category = 'general', caption }: PhotoUploadData) {
  const supabase = createClient()

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: new Error('Not authenticated') }
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${companyId}/${leadId}/${fileName}`

    // Upload to Supabase Storage (lead-photos bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lead-photos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { data: null, error: uploadError }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lead-photos')
      .getPublicUrl(filePath)

    // Create database record
    const { data: photoRecord, error: dbError } = await supabase
      .from('lead_photos')
      .insert({
        company_id: companyId,
        lead_id: leadId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category,
        caption,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('lead-photos').remove([filePath])
      return { data: null, error: dbError }
    }

    return { data: photoRecord, error: null }
  } catch (error) {
    console.error('Upload photo error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update photo metadata (category, caption)
 */
export async function updatePhotoMetadata(photoId: string, updates: { category?: string; caption?: string }) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('lead_photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .single()

  if (error) {
    console.error('Error updating photo:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a photo (soft delete + remove from storage)
 */
export async function deleteLeadPhoto(photoId: string, fileUrl: string) {
  const supabase = createClient()

  try {
    // Soft delete in database
    const { error: dbError } = await supabase
      .from('lead_photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photoId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return { error: dbError }
    }

    // Extract file path from URL and delete from storage
    try {
      const url = new URL(fileUrl)
      const pathParts = url.pathname.split('/lead-photos/')
      if (pathParts.length > 1) {
        const filePath = pathParts[1]
        await supabase.storage.from('lead-photos').remove([filePath])
      }
    } catch (storageError) {
      console.error('Storage delete error (non-critical):', storageError)
      // Continue even if storage delete fails
    }

    return { error: null }
  } catch (error) {
    console.error('Delete photo error:', error)
    return { error: error as Error }
  }
}

/**
 * Get photos by category
 */
export async function getPhotosByCategory(leadId: string, category: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('lead_photos')
    .select('*')
    .eq('lead_id', leadId)
    .eq('category', category)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error fetching photos by category:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
