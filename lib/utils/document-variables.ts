// Variable Replacement Utility for Document Builder
import { format } from 'date-fns'

interface CompanyData {
  name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  contact_phone?: string
  contact_email?: string
}

interface CustomerData {
  full_name?: string
  email?: string
  phone?: string
  property_address?: string
  city?: string
  state?: string
  zip?: string
}

interface QuoteData {
  quote_number?: string
  subtotal?: number
  tax?: number
  total?: number
  created_at?: string
}

interface ProjectData {
  project_number?: string
  start_date?: string
  completion_date?: string
}

export interface DocumentData {
  company?: CompanyData
  customer?: CustomerData
  quote?: QuoteData
  project?: ProjectData
}

/**
 * Format a value based on its format type
 */
function formatValue(value: any, formatType?: string): string {
  if (value === null || value === undefined) return ''

  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)

    case 'date':
      try {
        return format(new Date(value), 'MM/dd/yyyy')
      } catch {
        return value
      }

    case 'phone':
      // Format as (XXX) XXX-XXXX
      const digits = value.toString().replace(/\D/g, '')
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return value

    case 'email':
    case 'text':
    default:
      return value.toString()
  }
}

/**
 * Replace all {{variables}} in content with actual values
 */
export function replaceVariables(
  content: string,
  data: DocumentData
): string {
  if (!content) return ''

  let result = content

  // Company variables
  if (data.company) {
    result = result.replace(/\{\{company\.name\}\}/g, data.company.name || '')
    result = result.replace(/\{\{company\.address\}\}/g, data.company.address || '')
    result = result.replace(/\{\{company\.city\}\}/g, data.company.city || '')
    result = result.replace(/\{\{company\.state\}\}/g, data.company.state || '')
    result = result.replace(/\{\{company\.zip\}\}/g, data.company.zip || '')
    result = result.replace(
      /\{\{company\.phone\}\}/g,
      formatValue(data.company.contact_phone, 'phone')
    )
    result = result.replace(/\{\{company\.email\}\}/g, data.company.contact_email || '')
  }

  // Customer variables
  if (data.customer) {
    result = result.replace(/\{\{customer\.name\}\}/g, data.customer.full_name || '')
    result = result.replace(/\{\{customer\.email\}\}/g, data.customer.email || '')
    result = result.replace(
      /\{\{customer\.phone\}\}/g,
      formatValue(data.customer.phone, 'phone')
    )
    result = result.replace(/\{\{customer\.address\}\}/g, data.customer.property_address || '')
    result = result.replace(/\{\{customer\.city\}\}/g, data.customer.city || '')
    result = result.replace(/\{\{customer\.state\}\}/g, data.customer.state || '')
    result = result.replace(/\{\{customer\.zip\}\}/g, data.customer.zip || '')
  }

  // Quote variables
  if (data.quote) {
    result = result.replace(/\{\{quote\.number\}\}/g, data.quote.quote_number || '')
    result = result.replace(
      /\{\{quote\.subtotal\}\}/g,
      formatValue(data.quote.subtotal, 'currency')
    )
    result = result.replace(/\{\{quote\.tax\}\}/g, formatValue(data.quote.tax, 'currency'))
    result = result.replace(/\{\{quote\.total\}\}/g, formatValue(data.quote.total, 'currency'))
    result = result.replace(
      /\{\{quote\.created_date\}\}/g,
      formatValue(data.quote.created_at, 'date')
    )
  }

  // Project variables
  if (data.project) {
    result = result.replace(/\{\{project\.number\}\}/g, data.project.project_number || '')
    result = result.replace(
      /\{\{project\.start_date\}\}/g,
      formatValue(data.project.start_date, 'date')
    )
    result = result.replace(
      /\{\{project\.end_date\}\}/g,
      formatValue(data.project.completion_date, 'date')
    )
  }

  // System variables
  const today = new Date()
  result = result.replace(/\{\{today\}\}/g, format(today, 'MM/dd/yyyy'))
  result = result.replace(/\{\{current_year\}\}/g, today.getFullYear().toString())
  result = result.replace(/\{\{current_month\}\}/g, format(today, 'MMMM'))

  return result
}

/**
 * Extract all variables from content
 */
export function extractVariables(content: string): string[] {
  if (!content) return []

  const matches = content.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []

  return matches.map((match) => match.replace(/\{\{|\}\}/g, ''))
}

/**
 * Check if content contains any variables
 */
export function hasVariables(content: string): boolean {
  if (!content) return false
  return /\{\{[^}]+\}\}/.test(content)
}
