# Production Deployment Guide

Complete checklist for deploying Ketterly CRM to production.

---

## Pre-Deployment Checklist

### Phase 0: Push Notifications (Before Going Live)

**IMPORTANT**: Implement OneSignal push notifications BEFORE deploying to production. This ensures users have notifications from day one.

**Time Required**: 1-2 hours

**Steps**:
1. Create OneSignal account and configure web push
2. Install `react-onesignal` package
3. Add OneSignal initialization code
4. Create notification settings UI
5. Deploy Supabase Edge Function for sending notifications
6. Test on iPhone, Android, Desktop

**Reference**: See `ONESIGNAL_SETUP.md` in project root for complete implementation guide.

**Why Before Deployment**:
- Users expect notifications in production CRM
- Easier to implement before users are onboarded
- No need to re-prompt users for permissions later
- Service worker setup is part of initial PWA installation

---

## Phase 1: Database Setup

### 1.1 Create Production Supabase Project

```bash
# Login to Supabase dashboard
# https://app.supabase.com

# Create new project:
# - Organization: Your company
# - Project name: ketterly-production
# - Database password: Strong password (save in 1Password/BitWarden)
# - Region: Closest to your users (e.g., US East)
```

### 1.2 Run Database Migrations

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to production project
npx supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF

# Run all migrations
npx supabase db push

# Verify migrations applied
npx supabase db diff --schema public
```

**Critical Migrations** (ensure these are applied):
- Initial schema with multi-tenant structure
- `20241204000001_add_flat_squares.sql` - Flat roof tracking
- `20241204000002_add_steep_slopes.sql` - Steep pitch tracking

### 1.3 Set Up Row Level Security (RLS)

Verify RLS policies are enabled on all tables:

```sql
-- Run in Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Should return 0 rows (all tables have RLS enabled)
```

### 1.4 Create First Company (Ripple Roofing)

```sql
-- Insert first company
INSERT INTO public.companies (
  name,
  slug,
  contact_email,
  contact_phone,
  address,
  city,
  state,
  zip,
  subscription_tier,
  subscription_status,
  onboarding_completed
) VALUES (
  'Ripple Roofing & Construction',
  'ripple-roofing',
  'info@rippleroofing.com',
  '555-123-4567',
  '123 Main St',
  'Your City',
  'TX',
  '12345',
  'professional',
  'active',
  true
) RETURNING id;
```

---

## Phase 2: Environment Variables

### 2.1 Set Up Production Environment

Create `.env.production` (DO NOT commit):

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # KEEP SECRET

# App
NEXT_PUBLIC_APP_URL=https://app.ketterly.com

# OneSignal (from Phase 0 setup)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key # KEEP SECRET, USE IN EDGE FUNCTIONS ONLY

# Email (Resend)
RESEND_API_KEY=re_... # KEEP SECRET

# Google Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Stripe (future)
# STRIPE_SECRET_KEY=sk_live_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 2.2 Configure Vercel Environment Variables

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_ONESIGNAL_APP_ID production
vercel env add ONESIGNAL_REST_API_KEY production
vercel env add RESEND_API_KEY production
# ... add all variables
```

---

## Phase 3: Supabase Storage Setup

### 3.1 Create Storage Buckets

```sql
-- Run in Supabase SQL Editor
-- Lead photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-photos', 'lead-photos', false);

-- Quote documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-documents', 'quote-documents', false);
```

### 3.2 Set Up Storage Policies

See `supabase/setup_lead_photos_storage.sql` for complete policies.

---

## Phase 4: Deploy Next.js Application

### 4.1 Deploy to Vercel

```bash
# From project root
vercel --prod

# Or connect GitHub repo in Vercel dashboard:
# 1. Go to vercel.com/new
# 2. Import your GitHub repository
# 3. Configure environment variables
# 4. Deploy
```

### 4.2 Configure Custom Domain

```bash
# In Vercel dashboard:
# Settings → Domains → Add Domain
# Example: app.ketterly.com

# Update DNS records:
# Type: CNAME
# Name: app
# Value: cname.vercel-dns.com
```

### 4.3 Update App URL

After custom domain is configured:

```bash
# Update environment variable
vercel env add NEXT_PUBLIC_APP_URL production
# Value: https://app.ketterly.com

# Redeploy
vercel --prod
```

---

## Phase 5: Supabase Edge Functions (OneSignal)

### 5.1 Deploy Send Notification Function

```bash
# Deploy the OneSignal notification function
npx supabase functions deploy send-notification

# Set secrets for the function
npx supabase secrets set ONESIGNAL_REST_API_KEY=your-rest-api-key
```

---

## Phase 6: Testing & Verification

### 6.1 Test Authentication
- [ ] Sign up with new company
- [ ] Login with existing user
- [ ] Password reset flow
- [ ] Logout

### 6.2 Test Multi-Tenancy
- [ ] Create 2 test companies
- [ ] Verify data isolation (Company A can't see Company B's data)
- [ ] Check RLS policies working

### 6.3 Test Core Workflows
- [ ] Create lead
- [ ] Upload photos (camera + file)
- [ ] Create measurements with steep slopes & flat squares
- [ ] Generate quote
- [ ] Convert to project
- [ ] Create invoice

### 6.4 Test PWA Features
- [ ] Install on iPhone (Safari → Share → Add to Home Screen)
- [ ] Install on Android (Chrome → Add to Home Screen)
- [ ] Install on Desktop (Chrome → Install button)
- [ ] Camera auto-upload on mobile
- [ ] Offline functionality

### 6.5 Test Push Notifications (Phase 0)
- [ ] Subscribe to notifications on iPhone
- [ ] Subscribe on Android
- [ ] Subscribe on Desktop
- [ ] Test notification when new lead created
- [ ] Test company-wide broadcast
- [ ] Verify notification settings toggle works

### 6.6 Test Email Notifications
- [ ] Lead notification email
- [ ] Quote sent email
- [ ] Welcome email on signup

---

## Phase 7: Monitoring & Analytics

### 7.1 Set Up Error Tracking

Consider adding Sentry or similar:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 7.2 Monitor OneSignal Dashboard
- Track subscription growth
- Monitor notification delivery rates
- Check click-through rates
- Review opt-out reasons

### 7.3 Monitor Supabase Dashboard
- Database size and growth
- Storage usage
- API request volume
- Slow queries

---

## Phase 8: Security Hardening

### 8.1 Review RLS Policies
- [ ] All tables have RLS enabled
- [ ] Policies filter by `company_id`
- [ ] Service role operations are safe

### 8.2 API Security
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] No sensitive data in client responses

### 8.3 Secrets Management
- [ ] No secrets in Git
- [ ] Service role key not exposed to client
- [ ] OneSignal REST API Key only in Edge Functions
- [ ] API keys rotated if needed

---

## Phase 9: Backup & Recovery

### 9.1 Enable Supabase Backups
- Daily automatic backups (included in paid tiers)
- Point-in-time recovery
- Export schemas regularly

### 9.2 Document Recovery Procedures
- How to restore from backup
- How to roll back migrations
- Emergency contacts

---

## Post-Deployment Checklist

- [ ] Update DNS records
- [ ] Configure custom domain
- [ ] SSL certificate active (auto via Vercel)
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] OneSignal push notifications working (Phase 0)
- [ ] PWA installable on all devices
- [ ] Email notifications working
- [ ] Error tracking configured
- [ ] Monitoring dashboards set up
- [ ] Backup strategy in place
- [ ] Team has admin access
- [ ] Documentation updated
- [ ] First company onboarded

---

## Rollback Plan

If issues arise:

1. **Application Issues**:
   ```bash
   # Revert to previous Vercel deployment
   vercel rollback
   ```

2. **Database Issues**:
   ```bash
   # Restore from Supabase backup (via dashboard)
   # Or roll back specific migration
   npx supabase db reset
   ```

3. **OneSignal Issues**:
   - Disable notifications in app settings
   - Users can still use app without push notifications
   - Fix and redeploy

---

## Support & Maintenance

### Regular Tasks
- Review error logs weekly
- Monitor database growth
- Check notification delivery rates
- Update dependencies monthly
- Review RLS policies quarterly

### Emergency Contacts
- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com
- OneSignal Support: support@onesignal.com

---

**Last Updated**: December 5, 2024  
**Version**: 1.0.0
