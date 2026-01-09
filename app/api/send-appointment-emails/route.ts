import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentConfirmationEmail } from '@/lib/email/notifications'
import { notifyAppointmentAssigned } from '@/lib/email/user-notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'send_customer_email') {
      const { eventId, customerEmail, customerName, companyId } = data
      await sendAppointmentConfirmationEmail(eventId, customerEmail, customerName, companyId)
      return NextResponse.json({ success: true })
    }

    if (action === 'send_user_notifications') {
      const { assignedUsers, eventData, companyId } = data
      for (let i = 0; i < assignedUsers.length; i++) {
        await notifyAppointmentAssigned({
          assignedUserId: assignedUsers[i],
          ...eventData,
          companyId,
        })
        // Add delay between emails to avoid rate limiting (Resend allows 2/sec)
        if (i < assignedUsers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay
        }
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}