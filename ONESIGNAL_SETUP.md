# OneSignal Implementation Guide - Ketterly CRM

## 🚀 Quick Setup (1-2 hours)

### Step 1: Create OneSignal Account (10 minutes)

1. **Sign up**: https://onesignal.com/
2. Click **"New App/Website"**
3. Select **"Web Push"**
4. Name your app: **"Ketterly CRM"**
5. Choose **Web Push** platform

### Step 2: Configure Web Push (15 minutes)

1. **Site URL Configuration**:
   ```
   Production URL: https://your-domain.com
   Default Icon URL: https://your-domain.com/icons/icon-192x192.png
   ```

2. **Get your credentials** (save these):
   ```
   App ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   REST API Key: (found in Settings → Keys & IDs)
   ```

3. **Add to environment variables**:
   ```env
   # .env.local
   NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id-here
   ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

### Step 3: Install OneSignal SDK (5 minutes)

```powershell
npm install react-onesignal
```

### Step 4: Initialize OneSignal (20 minutes)

Create initialization file:

```typescript
// lib/notifications/onesignal.ts
import OneSignal from 'react-onesignal';

let isInitialized = false;

export async function initializeOneSignal() {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    await OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      allowLocalhostAsSecureOrigin: true, // For local testing
      notifyButton: {
        enable: false, // We'll use custom UI
      },
      serviceWorkerParam: {
        scope: '/',
      },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    });

    isInitialized = true;
    console.log('OneSignal initialized successfully');
  } catch (error) {
    console.error('OneSignal initialization failed:', error);
  }
}

/**
 * Subscribe user to push notifications
 * @param userId - Supabase user ID to link subscription
 */
export async function subscribeUser(userId: string) {
  try {
    await OneSignal.setExternalUserId(userId);
    const permission = await OneSignal.getNotificationPermission();
    
    if (permission === 'default') {
      await OneSignal.showNativePrompt();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to subscribe user:', error);
    return false;
  }
}

/**
 * Unsubscribe user from notifications
 */
export async function unsubscribeUser() {
  try {
    await OneSignal.setSubscription(false);
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Check if user is subscribed
 */
export async function isUserSubscribed(): Promise<boolean> {
  try {
    const permission = await OneSignal.getNotificationPermission();
    return permission === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Add tags for user segmentation (e.g., company_id)
 */
export async function setUserTags(tags: Record<string, string>) {
  try {
    await OneSignal.sendTags(tags);
  } catch (error) {
    console.error('Failed to set user tags:', error);
  }
}
```

### Step 5: Add to App Layout (10 minutes)

Update your root layout to initialize OneSignal:

```typescript
// app/layout.tsx
'use client'

import { useEffect } from 'react'
import { initializeOneSignal } from '@/lib/notifications/onesignal'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize OneSignal when app loads
    initializeOneSignal()
  }, [])

  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
```

**IMPORTANT**: If your layout is currently a Server Component, create a client component wrapper:

```typescript
// components/providers/onesignal-provider.tsx
'use client'

import { useEffect } from 'react'
import { initializeOneSignal } from '@/lib/notifications/onesignal'

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeOneSignal()
  }, [])

  return <>{children}</>
}
```

Then wrap in your layout:

```typescript
// app/layout.tsx (Server Component - keep as is)
import { OneSignalProvider } from '@/components/providers/onesignal-provider'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <OneSignalProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </OneSignalProvider>
      </body>
    </html>
  )
}
```

### Step 6: Subscribe Users After Login (15 minutes)

Add notification subscription after successful login:

```typescript
// app/(auth)/login/page.tsx or your auth handler
import { subscribeUser, setUserTags } from '@/lib/notifications/onesignal'

async function handleSuccessfulLogin(user: User) {
  // ... existing login logic

  // Subscribe to notifications and tag with company
  await subscribeUser(user.id)
  
  // Tag user with company for segmented notifications
  await setUserTags({
    company_id: user.company_id,
    role: user.role,
  })
}
```

### Step 7: Create Notification Settings UI (20 minutes)

Add a settings page for users to manage notifications:

```typescript
// components/admin/settings/notification-settings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, BellOff } from 'lucide-react'
import { isUserSubscribed, subscribeUser, unsubscribeUser } from '@/lib/notifications/onesignal'
import { toast } from 'sonner'

export function NotificationSettings({ userId }: { userId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  async function checkSubscriptionStatus() {
    const subscribed = await isUserSubscribed()
    setIsSubscribed(subscribed)
    setLoading(false)
  }

  async function handleToggle(enabled: boolean) {
    setLoading(true)
    
    try {
      if (enabled) {
        const success = await subscribeUser(userId)
        if (success) {
          setIsSubscribed(true)
          toast.success('Push notifications enabled!')
        } else {
          toast.error('Failed to enable notifications')
        }
      } else {
        await unsubscribeUser()
        setIsSubscribed(false)
        toast.success('Push notifications disabled')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications for new leads, messages, and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications" className="flex flex-col gap-1">
            <span>Enable Push Notifications</span>
            <span className="text-sm text-muted-foreground font-normal">
              {isSubscribed ? 'You will receive notifications' : 'You will not receive notifications'}
            </span>
          </Label>
          <Switch
            id="notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {!isSubscribed && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> On iPhone, you must first "Add to Home Screen" 
              before enabling notifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 8: Send Notifications from Supabase (30 minutes)

Create a Supabase Edge Function to send notifications:

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

serve(async (req) => {
  try {
    const { 
      userIds,        // Array of user IDs to notify
      companyId,      // Optional: notify all users in company
      title, 
      message, 
      url,            // URL to open when clicked
      data            // Additional data
    } = await req.json()

    // Build filter for targeting users
    const filters = []
    
    if (userIds && userIds.length > 0) {
      // Target specific users
      filters.push({
        field: 'tag',
        key: 'user_id',
        relation: 'in',
        value: userIds
      })
    } else if (companyId) {
      // Target all users in a company
      filters.push({
        field: 'tag',
        key: 'company_id',
        relation: '=',
        value: companyId
      })
    }

    // Send notification via OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        filters: filters.length > 0 ? filters : undefined,
        included_segments: filters.length === 0 ? ['All'] : undefined,
        headings: { en: title },
        contents: { en: message },
        url: url || undefined,
        data: data || {},
        web_push_topic: companyId || undefined, // For notification grouping
      }),
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deploy the Edge Function**:

```powershell
# Set environment variables in Supabase Dashboard
# Settings → Edge Functions → Environment Variables:
# ONESIGNAL_APP_ID=your-app-id
# ONESIGNAL_REST_API_KEY=your-rest-api-key

# Deploy function
npx supabase functions deploy send-notification
```

### Step 9: Trigger Notifications from Your App (15 minutes)

Create helper to call the Edge Function:

```typescript
// lib/notifications/send.ts
import { createClient } from '@/lib/supabase/client'

export interface SendNotificationParams {
  userIds?: string[]      // Specific users
  companyId?: string      // All users in company
  title: string
  message: string
  url?: string            // Page to open when clicked
  data?: Record<string, any>
}

export async function sendNotification(params: SendNotificationParams) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: params
    })

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Failed to send notification:', error)
    return { success: false, error }
  }
}

// Example usage:
export async function notifyNewLead(leadId: string, companyId: string) {
  await sendNotification({
    companyId,
    title: 'New Lead',
    message: 'A new lead has been added to your CRM',
    url: `/admin/leads/${leadId}`,
    data: { leadId, type: 'new_lead' }
  })
}

export async function notifyNewMessage(recipientId: string, senderName: string, messageId: string) {
  await sendNotification({
    userIds: [recipientId],
    title: 'New Message',
    message: `${senderName} sent you a message`,
    url: `/admin/messages/${messageId}`,
    data: { messageId, type: 'message' }
  })
}
```

Use in your code:

```typescript
// Example: Notify when new lead is created
import { notifyNewLead } from '@/lib/notifications/send'

async function createLead(leadData: LeadInsert) {
  const { data: lead } = await supabase.from('leads').insert(leadData).select().single()
  
  // Send notification to all users in company
  await notifyNewLead(lead.id, lead.company_id)
  
  return lead
}
```

---

## ✅ Testing Your Setup

### 1. Test on Desktop (Chrome/Edge)
1. Run `npm run dev`
2. Open http://localhost:3000
3. Look for notification permission prompt
4. Grant permission
5. Go to Settings → Notifications
6. Verify "Enabled" status

### 2. Test on iPhone (iOS 16.4+)
1. Deploy to production (HTTPS required)
2. Open Safari → Your site
3. Share → "Add to Home Screen"
4. Launch from home screen
5. Grant notification permission when prompted
6. Test notification from OneSignal dashboard

### 3. Test on Android
1. Open Chrome → Your site
2. Permission prompt should appear automatically
3. Grant permission
4. Test notification

### 4. Send Test Notification
1. Go to OneSignal dashboard
2. Messages → New Push → Start from Scratch
3. Select "All Subscribed Users"
4. Enter title and message
5. Click "Confirm" → "Send Message"
6. Check your device!

---

## 🎯 Common Use Cases

### Notify on New Lead
```typescript
// In your create lead function
await notifyNewLead(lead.id, lead.company_id)
```

### Notify Specific User
```typescript
await sendNotification({
  userIds: [userId],
  title: 'Quote Approved',
  message: 'Your quote has been approved!',
  url: `/admin/quotes/${quoteId}`
})
```

### Notify Entire Company
```typescript
await sendNotification({
  companyId: company.id,
  title: 'Team Update',
  message: 'Weekly sales meeting in 1 hour',
  url: '/admin/schedule'
})
```

---

## 📊 Analytics & Monitoring

OneSignal Dashboard shows:
- Total subscribers
- Notification delivery rate
- Click-through rate
- Active users
- Segmentation data

Access at: https://dashboard.onesignal.com

---

## 🐛 Troubleshooting

### "Permission Denied" on iPhone
- **Cause**: App not added to home screen first
- **Fix**: Must use "Add to Home Screen" → Then grant permission

### Notifications not sending
- **Check**: OneSignal dashboard → Delivery Reports
- **Verify**: User has granted permission (check Settings page)
- **Test**: Send test notification from dashboard

### Service Worker errors
- **Cause**: HTTP instead of HTTPS
- **Fix**: Deploy to Vercel (auto HTTPS)

### User not receiving notifications
```typescript
// Debug subscription status
const subscribed = await isUserSubscribed()
console.log('Is subscribed:', subscribed)

// Check external user ID
const externalId = await OneSignal.getExternalUserId()
console.log('External ID:', externalId)
```

---

## 💰 Cost Estimate

**Your Scale**:
- 5 companies × 10 users = 50 subscribers
- 100% free forever on current plan
- Would need 200 companies to approach limit

**When you grow**:
- 10,000 subscribers: Still free!
- Beyond 10,000: ~$9/month per 10k subscribers
- But at that scale, you're making good money! 🚀

---

## 🔒 Security Best Practices

1. **Never expose REST API Key** in frontend
   - Use Edge Functions for sending
   - Keep in environment variables

2. **Validate user permissions** before sending
   - Check company_id matches
   - Verify user has access to resource

3. **Tag users properly**
   ```typescript
   await setUserTags({
     company_id: user.company_id,
     role: user.role,
     user_id: user.id
   })
   ```

4. **Use HTTPS in production**
   - Required for PWA and notifications
   - Vercel provides automatically

---

## ✨ You're Done!

Your notification system is ready. Users can:
- ✅ Enable/disable notifications in Settings
- ✅ Receive instant notifications
- ✅ Click to navigate to relevant pages
- ✅ Works on iOS, Android, Desktop

Next step: Build your internal messaging system and connect it! 💬

---

**Need Help?**
- OneSignal Docs: https://documentation.onesignal.com/docs/web-push-quickstart
- Test notifications: OneSignal Dashboard → Messages → New Push
- Debug: Browser DevTools → Application → Service Workers

