import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.')
}

export const resend = new Resend(process.env.RESEND_API_KEY || '')

export interface EmailOptions {
  from: string
  to: string | string[]
  replyTo?: string
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    content: string | Buffer
  }>
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: EmailOptions) {
  try {
    // Add anti-spam headers
    const headers = {
      'X-Entity-Ref-ID': Date.now().toString(),
      'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/admin/profile>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      ...options.headers,
    }

    const { data, error } = await resend.emails.send({
      ...options,
      headers,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}
