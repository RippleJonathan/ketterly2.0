import { createClient } from '@/lib/supabase/client'
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/types/api'
import { Company, CompanyInsert, CompanyUpdate } from '@/lib/types'

export async function getCompany(companyId: string): ApiResponse<Company> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function getCompanyBySlug(slug: string): ApiResponse<Company> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function updateCompany(
  companyId: string,
  updates: CompanyUpdate
): ApiResponse<Company> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single()

    if (error) throw error
    return createSuccessResponse(data)
  } catch (error) {
    return createErrorResponse(error)
  }
}
