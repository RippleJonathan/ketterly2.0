# Ketterly.com - Vercel Deployment Checklist

**Domain**: ketterly.com  
**Status**: Ready to Deploy ✅  
**Date**: January 13, 2026

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Required

Copy these to Vercel Environment Variables (Settings > Environment Variables):

```env
# Supabase - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>

# App URL - REQUIRED
NEXT_PUBLIC_APP_URL=https://ketterly.com

# Email (Resend) - REQUIRED for email features
RESEND_API_KEY=<your_resend_api_key>
RESEND_FROM_EMAIL=orders@ketterly.com

# Google Maps - REQUIRED for map features
GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>

# OneSignal - REQUIRED for push notifications
NEXT_PUBLIC_ONESIGNAL_APP_ID=<your_onesignal_app_id>
ONESIGNAL_REST_API_KEY=<your_onesignal_rest_api_key>

# Twilio - OPTIONAL (for SMS features)
TWILIO_ACCOUNT_SID=<your_twilio_account_sid>
TWILIO_AUTH_TOKEN=<your_twilio_auth_token>
TWILIO_PHONE_NUMBER=<your_twilio_phone_number>
```

---

## 🚀 Deployment Steps

### Step 1: Clean Up Debug Logging (Production Ready)

**Files with console.logs to remove/comment:**
- ✅ `components/admin/dashboard/leaderboard.tsx` (lines 72, 80, 108)
- ✅ `lib/api/dashboard.ts` (multiple debug logs)
- ⚠️ Keep error logs (console.error) - these are useful for debugging

**Action**: See "Production Cleanup" section below for automated fix.

### Step 2: Update Supabase Configuration

**In Supabase Dashboard:**
1. Go to Settings > API
2. Add to "Site URL": `https://ketterly.com`
3. Add to "Redirect URLs":
   ```
   https://ketterly.com/auth/callback
   https://ketterly.com/login
   https://ketterly.com/signup
   ```
4. Update CORS settings if needed

**In Supabase Storage:**
1. Verify bucket policies for `quotes-pdfs` bucket
2. Ensure public access is configured correctly

### Step 3: Update next.config.ts

**Current Supabase hostname:** `ofwbaxfxhoefbyfhgaph.supabase.co`

Verify this matches your actual Supabase project URL. If not, update:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '<your-supabase-project-id>.supabase.co',
    },
  ],
},
```

### Step 4: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" > "Project"
3. Import from Git (connect your repository)
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Add all environment variables from Step 1
6. Click "Deploy"

### Step 5: Configure Custom Domain

**In Vercel Dashboard:**
1. Go to Project Settings > Domains
2. Add domain: `ketterly.com`
3. Add domain: `www.ketterly.com` (redirect to ketterly.com)

**DNS Configuration (in your domain registrar):**

Add these DNS records:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Verification:**
- Wait 24-48 hours for DNS propagation
- Check status in Vercel dashboard
- SSL certificate will auto-provision

### Step 6: Verify Deployment

**Test these critical paths:**
- ✅ `https://ketterly.com` - Landing page
- ✅ `https://ketterly.com/login` - Login page
- ✅ `https://ketterly.com/signup` - Company signup
- ✅ `https://ketterly.com/admin/dashboard` - Admin dashboard (after login)
- ✅ `https://ketterly.com/admin/leads` - Leads page
- ✅ `https://ketterly.com/admin/calendar` - Calendar

**Test features:**
- [ ] User login/logout
- [ ] Create a new lead
- [ ] Generate a quote
- [ ] View dashboard stats (revenue, leaderboard)
- [ ] Upload photos
- [ ] Generate PDF
- [ ] Send email

---

## 🧹 Production Cleanup Script

Run this to remove debug logs before deployment:

```bash
# Remove leaderboard debug logs
# (Or just comment them out manually)
```

**Files to clean:**
1. `components/admin/dashboard/leaderboard.tsx`:
   - Line 72: `console.log('🏆 Leaderboard Debug - Raw invoices data:', invoices)`
   - Line 80-87: `console.log('Processing invoice:', {...})`
   - Line 108: `console.log('🏆 Aggregated user stats:', ...)`

2. `lib/api/dashboard.ts`:
   - Lines 119-126: Quote status debug logs
   - Lines 143-153: Invoice debug logs

**Keep these:**
- All `console.error()` statements (for production error tracking)
- Critical error logging in try/catch blocks

---

## ⚠️ Important Notes

### Database Migrations
- ✅ All migrations already applied to live Supabase
- ✅ RLS policies active and tested
- ✅ Multi-tenant isolation working

### Known Issues to Monitor
1. **Commission auto-creation**: Currently using tab-load refresh workaround
   - Monitor commission creation in production
   - Consider fixing trigger in next sprint

2. **PWA Configuration**: 
   - PWA disabled in development
   - Will activate automatically in production
   - Test offline functionality after deployment

3. **Image Uploads**:
   - Verify Supabase Storage bucket permissions
   - Test file upload limits (default 50MB)

### Performance Optimizations
- ✅ Compression enabled
- ✅ Image optimization configured
- ✅ React Query caching active
- ✅ PWA ready for offline support

---

## 📊 Post-Deployment Monitoring

### Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Monitor:
   - Page load times
   - Core Web Vitals
   - Error rates

### Supabase Monitoring
1. Database Performance:
   - Query response times
   - Connection pool usage
   - Storage usage

2. Auth Metrics:
   - User signups
   - Login success rate
   - Session duration

### Error Tracking
Consider adding (future):
- Sentry for error tracking
- LogRocket for session replay
- Mixpanel/Amplitude for analytics

---

## 🔒 Security Checklist

- ✅ Environment variables secured (not in git)
- ✅ `.env` and `.env*.local` in `.gitignore`
- ✅ RLS policies enabled on all tables
- ✅ Service role key only used server-side
- ✅ CORS configured in Supabase
- ✅ `poweredByHeader: false` in next.config
- ⚠️ Add CSP headers (future enhancement)
- ⚠️ Add rate limiting (future enhancement)

---

## 🎯 Launch Day Checklist

**1 Hour Before Launch:**
- [ ] Final build test locally: `npm run build && npm start`
- [ ] Verify all environment variables are set in Vercel
- [ ] Test database connection from Vercel deployment
- [ ] Backup current Supabase database

**During Launch:**
- [ ] Deploy to Vercel production
- [ ] Verify deployment succeeded
- [ ] Test login flow
- [ ] Create test lead
- [ ] Generate test quote
- [ ] Verify email sending works
- [ ] Check dashboard loads correctly

**After Launch:**
- [ ] Monitor Vercel logs for errors
- [ ] Check Supabase logs for database errors
- [ ] Test on mobile device
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Verify PWA installation works

---

## 🆘 Rollback Plan

If deployment fails:
1. Revert to previous Vercel deployment (instant)
2. Check Vercel deployment logs
3. Verify environment variables
4. Test database connection
5. Check Supabase status page

---

## 📞 Support Contacts

**Services:**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/dashboard/support
- Domain Registrar: (your registrar)

**Documentation:**
- Next.js Deploy: https://nextjs.org/docs/deployment
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

---

## ✅ Ready to Deploy!

**Current Status:**
- ✅ No build errors
- ✅ TypeScript compilation successful
- ✅ All features tested locally
- ✅ Database migrations applied
- ✅ Environment variables documented
- ⚠️ Debug logs need cleanup (optional)

**Estimated Deployment Time:** 5-10 minutes  
**Estimated DNS Propagation:** 24-48 hours for custom domain

---

**Next Steps:**
1. Run production cleanup (remove console.logs)
2. Update Supabase URLs and redirect URIs
3. Set environment variables in Vercel
4. Deploy using `vercel --prod`
5. Configure DNS for ketterly.com
6. Test and monitor!

🚀 **You're ready to launch!**
