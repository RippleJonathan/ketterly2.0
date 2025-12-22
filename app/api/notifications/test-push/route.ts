import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/api/onesignal'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Send test notification to current user
    const result = await sendPushNotification({
      userIds: [user.id],
      title: '🎉 Test Notification',
      message: 'If you can see this, push notifications are working perfectly!',
      url: '/admin/dashboard',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent successfully',
      notificationId: result.id,
    })
  } catch (error) {
    console.error('Test notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
