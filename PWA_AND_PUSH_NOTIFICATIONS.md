# Progressive Web App (PWA) & Push Notifications Guide

## 🎉 Current PWA Implementation Status

### ✅ What's Already Working

1. **Add to Home Screen** - Users can install Ketterly CRM like a native app
   - iOS (Safari): Share button → "Add to Home Screen"
   - Android (Chrome): "Install app" prompt or menu → "Add to Home Screen"
   - Desktop (Chrome/Edge): Install icon in address bar

2. **App-Like Experience**
   - Standalone display mode (no browser chrome)
   - Custom splash screen
   - App icon on home screen
   - Proper theming and branding

3. **Mobile Optimizations**
   - Responsive design with Tailwind breakpoints
   - Touch-friendly UI (44px minimum tap targets)
   - Mobile sidebar menu
   - Camera access for photo uploads

4. **Performance**
   - React Server Components for fast loading
   - Image optimization
   - Code splitting

### 📱 Testing the PWA

#### On iPhone (iOS 16.4+)
1. Open Safari and navigate to your deployed site
2. Tap the Share button (box with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The app icon will appear on your home screen
6. Launch from home screen to use in standalone mode

#### On Android
1. Open Chrome and navigate to your site
2. Look for "Install app" banner at bottom (or)
3. Tap menu (three dots) → "Add to Home Screen" or "Install app"
4. Confirm installation
5. Launch from home screen or app drawer

#### On Desktop
1. Open Chrome/Edge and navigate to your site
2. Click the install icon (+) in address bar (or)
3. Menu → "Install Ketterly CRM"
4. App opens in standalone window

---

## 🔔 Push Notifications Implementation Guide

### Overview

Web Push Notifications work on:
- ✅ **Android** (Chrome, Firefox, Samsung Internet) - Direct support
- ✅ **iOS 16.4+** (Safari) - Requires app to be added to Home Screen first
- ✅ **Desktop** (Chrome, Firefox, Edge, Safari 16+) - Full support

### Architecture Options

#### Option 1: OneSignal (Recommended for Quick Setup)
**Best for**: Fast implementation, managed infrastructure, free tier available

**Pros**:
- Free up to 10,000 subscribers
- Easy setup with SDK
- Handles all browser compatibility
- Built-in analytics
- Segmentation and targeting
- Works with Supabase

**Cons**:
- Third-party dependency
- Paid plans for larger scale

**Implementation Steps**:

1. **Sign up for OneSignal**
   ```
   https://onesignal.com/
   ```

2. **Install OneSignal SDK**
   ```powershell
   npm install react-onesignal
   ```

3. **Initialize in your app**
   ```typescript
   // lib/notifications/onesignal.ts
   import OneSignal from 'react-onesignal';

   export async function initializeOneSignal() {
     await OneSignal.init({
       appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
       allowLocalhostAsSecureOrigin: true,
     });
   }
   ```

4. **Call in layout**
   ```typescript
   // app/layout.tsx
   useEffect(() => {
     if (typeof window !== 'undefined') {
       initializeOneSignal();
     }
   }, []);
   ```

5. **Send notifications from Supabase Edge Function**
   ```typescript
   // supabase/functions/send-notification/index.ts
   const response = await fetch('https://onesignal.com/api/v1/notifications', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`,
     },
     body: JSON.stringify({
       app_id: Deno.env.get('ONESIGNAL_APP_ID'),
       include_external_user_ids: [userId],
       contents: { en: 'New message from team' },
       headings: { en: 'Ketterly CRM' },
       data: { type: 'message', messageId: '123' },
     }),
   });
   ```

#### Option 2: Native Web Push API (Advanced)
**Best for**: Full control, no third-party dependencies, complex requirements

**Pros**:
- Complete control
- No external dependencies
- No subscriber limits
- Free (except server costs)

**Cons**:
- More complex setup
- Requires VAPID keys management
- Need to handle browser compatibility
- More maintenance

**Implementation Steps**:

1. **Install web-push library**
   ```powershell
   npm install web-push
   ```

2. **Generate VAPID keys** (one-time setup)
   ```powershell
   npx web-push generate-vapid-keys
   ```
   Save these in `.env.local`:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_EMAIL=your-email@domain.com
   ```

3. **Create service worker**
   ```javascript
   // public/sw.js
   self.addEventListener('push', function(event) {
     const data = event.data ? event.data.json() : {};
     const options = {
       body: data.body || 'New notification',
       icon: '/icons/icon-192x192.png',
       badge: '/icons/icon-96x96.png',
       vibrate: [200, 100, 200],
       data: data.data || {},
     };

     event.waitUntil(
       self.registration.showNotification(data.title || 'Ketterly CRM', options)
     );
   });

   self.addEventListener('notificationclick', function(event) {
     event.notification.close();
     event.waitUntil(
       clients.openWindow(event.notification.data.url || '/admin/dashboard')
     );
   });
   ```

4. **Register service worker and subscribe**
   ```typescript
   // lib/notifications/push.ts
   export async function subscribeToPushNotifications(userId: string) {
     if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
       throw new Error('Push notifications not supported');
     }

     const registration = await navigator.serviceWorker.register('/sw.js');
     const subscription = await registration.pushManager.subscribe({
       userVisibleOnly: true,
       applicationServerKey: urlBase64ToUint8Array(
         process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
       ),
     });

     // Save subscription to database
     const { data, error } = await supabase
       .from('push_subscriptions')
       .insert({
         user_id: userId,
         subscription: subscription.toJSON(),
       });

     return subscription;
   }

   function urlBase64ToUint8Array(base64String: string) {
     const padding = '='.repeat((4 - base64String.length % 4) % 4);
     const base64 = (base64String + padding)
       .replace(/\\-/g, '+')
       .replace(/_/g, '/');
     const rawData = window.atob(base64);
     return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
   }
   ```

5. **Send notifications from Supabase Edge Function**
   ```typescript
   // supabase/functions/send-push/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import * as webpush from 'npm:web-push';

   webpush.setVapidDetails(
     `mailto:${Deno.env.get('VAPID_EMAIL')}`,
     Deno.env.get('VAPID_PUBLIC_KEY')!,
     Deno.env.get('VAPID_PRIVATE_KEY')!
   );

   serve(async (req) => {
     const { userId, title, body, data } = await req.json();

     // Get user's push subscriptions from database
     const { data: subscriptions } = await supabase
       .from('push_subscriptions')
       .select('subscription')
       .eq('user_id', userId);

     const promises = subscriptions.map(async (sub) => {
       try {
         await webpush.sendNotification(
           sub.subscription,
           JSON.stringify({ title, body, data })
         );
       } catch (error) {
         console.error('Send failed:', error);
       }
     });

     await Promise.all(promises);
     return new Response('Sent');
   });
   ```

6. **Create database table for subscriptions**
   ```sql
   CREATE TABLE public.push_subscriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     subscription JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, subscription->>'endpoint')
   );

   ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can manage own subscriptions"
     ON push_subscriptions
     FOR ALL
     USING (auth.uid() = user_id);
   ```

---

## 📨 Internal Messaging System

### Database Schema

```sql
-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) NOT NULL,
  lead_id UUID REFERENCES leads(id), -- Optional: link to lead/project
  project_id UUID REFERENCES projects(id), -- Optional
  subject TEXT,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_company ON messages(company_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their company"
  ON messages FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );

CREATE POLICY "Users can send messages in their company"
  ON messages FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND sender_id = auth.uid()
  );

-- Trigger for sending push notification
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to send push notification
  PERFORM
    net.http_post(
      url := 'https://[YOUR-PROJECT].supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('request.jwt.claims')::json->>'role'),
      body := jsonb_build_object(
        'userId', NEW.recipient_id::text,
        'title', 'New Message',
        'body', NEW.subject,
        'data', jsonb_build_object('messageId', NEW.id::text, 'url', '/admin/messages/' || NEW.id::text)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

### Storage Estimates

| Data Volume | Storage Used | Notes |
|-------------|--------------|-------|
| 1,000 messages | ~100 KB | Text only (avg 100 bytes per message) |
| 10,000 messages | ~1 MB | Includes sender/recipient IDs, timestamps |
| 100,000 messages | ~10 MB | Still very small compared to photos |
| 1 million messages | ~100 MB | Negligible for modern databases |

**Comparison**:
- A single high-res photo: ~5-10 MB
- Text messages are 50-100x smaller
- Supabase free tier: 500 MB database storage

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Replace placeholder icons with actual company logo
  - Generate all required sizes (see `/public/icons/README.md`)
  - Create maskable versions
  - Add apple-touch-icon

- [ ] Update manifest.json
  - Set correct theme_color to match company branding
  - Update app name and description
  - Configure start_url for production domain

- [ ] Test PWA Installation
  - iPhone (iOS 16.4+) via Safari
  - Android via Chrome
  - Desktop via Chrome/Edge

- [ ] Set up Push Notifications
  - Choose provider (OneSignal vs native)
  - Configure VAPID keys or API keys
  - Create push subscription table
  - Set up Supabase Edge Functions
  - Test notification delivery

- [ ] Configure Environment Variables
  ```env
  # For OneSignal
  NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
  ONESIGNAL_API_KEY=your-api-key

  # OR for Native Web Push
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
  VAPID_PRIVATE_KEY=your-private-key
  VAPID_EMAIL=your-email@domain.com
  ```

- [ ] Test Notifications
  - Send test notification on iOS (after add to home screen)
  - Send test notification on Android
  - Verify notification click opens correct page
  - Test notification permissions prompt

- [ ] Performance Optimization
  - Run Lighthouse PWA audit
  - Ensure score > 90
  - Fix any warnings

---

## 📖 User Guide

### How to Install Ketterly CRM as an App

**iPhone Users**:
1. Open Safari and go to your CRM site
2. Tap Share → Add to Home Screen
3. Launch from home screen icon
4. Grant notification permission when prompted

**Android Users**:
1. Open Chrome and go to your CRM site
2. Tap "Install app" banner or Menu → Install app
3. Launch from app drawer or home screen
4. Grant notification permission when prompted

**Desktop Users**:
1. Click install icon in address bar
2. App opens in standalone window
3. Notifications work like desktop apps

---

## 🔧 Troubleshooting

### iOS Notifications Not Working
- **Cause**: App not installed to home screen
- **Fix**: Must use "Add to Home Screen" first, then permission prompt appears

### Android Install Prompt Not Showing
- **Cause**: PWA criteria not met or already dismissed
- **Fix**: Menu → Add to Home Screen, or check console for errors

### Service Worker Not Registering
- **Cause**: HTTP instead of HTTPS
- **Fix**: PWA requires HTTPS (localhost is exempt for dev)

### Notifications Permissions Denied
- **Cause**: User clicked "Block" or browser default
- **Fix**: Settings → Site Settings → Notifications → Allow

---

## 📚 Additional Resources

- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [OneSignal Docs](https://documentation.onesignal.com/docs)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [PWA Builder](https://www.pwabuilder.com/)

---

**Last Updated**: December 5, 2024  
**Status**: PWA Foundation Complete, Push Notifications Ready for Implementation
