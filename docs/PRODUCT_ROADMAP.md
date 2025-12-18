
# Ketterly CRM - Product Roadmap

**Last Updated:** December 16, 2024  
**Status:** Pre-Launch Development

---

## 🚀 PRE-LAUNCH PRIORITIES

**Ordered by development complexity (easiest → hardest)**

### 1. **Navigation Cleanup** ⚡ QUICK WIN (2-4 hours) ✅ COMPLETED
**Difficulty:** ⭐ Easy | **Impact:** High

- [x] Remove unused navigation links
- [x] Role-based navigation (show/hide based on permissions)
- [x] Organize by user workflow:
  - Sales: Dashboard, Leads
  - Production: Calendar (coming soon)
  - Office: Estimates, Invoices, Reports (coming soon)
  - Admin: Users, Commission Plans
  - Settings: Profile, Settings, Role Permissions

**Completed:** December 16, 2024
**Implementation:** Permission-based navigation with `useCheckPermission` hook, organized sections, "Coming Soon" badges for future features.

---

### 2. **Quick Add Lead Button** ⚡ QUICK WIN (3-5 hours) ✅ COMPLETED
**Difficulty:** ⭐ Easy | **Impact:** High

- [x] Add "+ Add Lead" button to main navigation/top bar
- [x] Modal-based form (doesn't navigate away from current page)
- [x] Accessible from any page in the app
- [x] Quick capture: name, phone, address, source
- [x] Auto-navigate to lead detail page after creation

**Completed:** December 16, 2024
**Implementation:** Floating action button (FAB) in bottom-right, reuses existing server actions, permission-based visibility.

---

### 3. **Notification Preferences UI** ⚡ QUICK WIN (4-6 hours) ✅ COMPLETED
**Difficulty:** ⭐ Easy | **Impact:** Medium

- [x] Add notification settings to user profile
- [x] Opt-in toggles for push notifications
- [x] Opt-in toggles for email notifications
- [x] Opt-in toggles for SMS notifications
- [x] Granular preferences per notification type
- [x] Grouped preferences (Leads, Sales, Payments, etc.)
- [x] Save preferences to user_preferences

**Completed:** Previously implemented
**Location:** Profile → Notifications tab
**Implementation:** Full UI with master toggles and 17 granular notification types grouped into 7 categories.

---

### 4. **Estimate Templates** (6-8 hours)
**Difficulty:** ⭐⭐ Medium | **Impact:** High

- [ ] Create estimate templates (similar to material/work order templates)
- [ ] Pre-configured line items by service type
- [ ] Template categories (repair, replacement, new construction)
- [ ] Clone and customize templates
- [ ] Admin-only template management

**Why Medium:** Copy existing material template pattern, database schema already familiar.

---

### 5. **Automated Job Status Updates** (8-12 hours)
**Difficulty:** ⭐⭐ Medium | **Impact:** High

- [ ] Auto-triggers for status changes:
  - Lead → Estimate Sent (when estimate sent)
  - Estimate Sent → Approved (when signed)
  - Approved → Contract Signed (when contract signed)
  - Contract Signed → Production Scheduled (when calendar event created)
  - Production Scheduled → In Progress (on production date)
  - In Progress → Complete (when marked complete)
- [ ] Manual override capability (admin/office)
- [ ] Status change notifications to assigned users
- [ ] Audit log of all status changes

**Why Medium:** Logic already exists in various places, just needs consolidation and triggers.

---

### 6. **Authentication & Middleware** (8-12 hours)
**Difficulty:** ⭐⭐ Medium | **Impact:** Critical

- [ ] Protect all admin routes with middleware
- [ ] Session management (auto-logout on inactivity)
- [ ] Role-based route access
- [ ] Redirect unauthorized users
- [ ] Password reset flow
- [ ] Email verification on signup

**Why Medium:** Next.js middleware is straightforward, Supabase Auth already configured.

---

### 7. **Global Search Functionality** ⚡ (12-16 hours) ✅ COMPLETED
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** High

- [x] Search bar in header/navigation
- [x] Search across:
  - Customer names
  - Addresses
  - Phone numbers
  - Email addresses
- [x] Real-time search results
- [x] Navigate directly to customer/lead page from results
- [x] Command palette UI with keyboard shortcuts (Ctrl+K)
- [x] Mobile-friendly modal interface
- [x] Debounced search queries
- [x] Result ranking and formatting

**Completed:** December 17, 2024
**Implementation:** Command palette modal using cmdk library, PostgreSQL full-text search, keyboard shortcuts (Ctrl+K), mobile tap support, rich result cards with icons.

**Why Medium-Hard:** Needs full-text search (Postgres), debouncing, result ranking, UI polish.

---

### 8. **Locations/Teams Management** (12-20 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** Medium

- [ ] Create locations/teams in settings
- [ ] Assign users to locations/teams
- [ ] Filter leads/jobs by location
- [ ] Location-specific permissions
- [ ] "All locations" vs "specific location" views

**Why Medium-Hard:** New database tables, RLS policies, filter logic across entire app.

---

### 9. **Multi-User Job Assignment** (16-24 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** High

- [ ] Assign multiple users to a single job:
  - Sales Rep
  - Marketing Rep
  - Sales Manager
  - Project Manager
- [ ] Role-specific commission splits per job
- [ ] Per-job permissions (who can edit/view)
- [ ] Activity log shows which user performed which action

**Why Medium-Hard:** Junction table, complex commission calculations, permission checks everywhere.

---

### 10. **Dashboard Upgrade** (20-30 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** High

- [ ] User-specific widgets:
  - My leads (sales reps)
  - My schedule (all users)
  - My commissions (sales/marketing)
  - My open tasks
- [ ] Role-specific dashboards:
  - Sales: Pipeline, conversion rates, upcoming follow-ups
  - Production: Today's jobs, materials needed, crew assignments
  - Office: Outstanding invoices, payments due, overdue accounts
  - Admin: Company metrics, user activity, system health
- [ ] Customizable widget layout (drag-and-drop)
- [ ] Real-time data updates

**Why Hard:** Many complex queries, chart components, real-time subscriptions, drag-drop library.

---

### 11. **Calendar System** (30-40 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** Critical

- [ ] Basic calendar view (day/week/month)
- [ ] Event types:
  - Inspections
  - Appointments
  - Production schedules
- [ ] Real-time updates (all reps see same schedule)
- [ ] Drag-and-drop rescheduling
- [ ] Color-coded by event type or user
- [ ] Filter by user, team, or location

**Why Hard:** Complex UI library (FullCalendar/react-big-calendar), real-time sync, drag-drop, conflicts.

---

### 12. **Push Notifications (OneSignal)** (16-24 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** Medium

- [ ] Integrate OneSignal SDK
- [ ] Set up notification triggers for key events
- [ ] Test notification delivery across devices
- [ ] Handle notification permissions
- [ ] Deep linking from notifications

**Why Medium-Hard:** Third-party SDK, device testing, notification strategy, edge cases.

---

## 💡 NICE-TO-HAVE FEATURES

**Ordered by development complexity (easiest → hardest)**

---

### **1. Lead Form Address Autocomplete** ⚡ QUICK WIN (2-3 hours) ✅ COMPLETED
**Difficulty:** ⭐ Easy | **Impact:** Medium

- [x] Google Maps API integration (using existing API key)
- [x] Autocomplete as user types
- [x] Validate and format addresses
- [x] Extract city/state/zip automatically
- [x] Geocode for map display (component ready)
- [x] Added to main lead form
- [x] Added to quick add lead modal
- [x] Graceful fallback if API fails

**Completed:** December 16, 2024
**Location:** Lead forms, Quick Add Lead modal
**Implementation:** AddressAutocomplete component with Google Places API, auto-populates city/state/zip fields.

---

### **2. Customizable Customer Emails** ⚡ QUICK WIN (4-6 hours)
**Difficulty:** ⭐ Easy | **Impact:** Medium

- [ ] Email template editor
- [ ] Variable placeholders (customer name, address, etc.)
- [ ] Company branding (logo, colors)
- [ ] Preview before sending
- [ ] Save custom templates

**Why Easy:** Rich text editor component (TipTap/Quill), variable replacement, store in DB.

---

### **3. Lead Detail Page Redesign** (6-10 hours)
**Difficulty:** ⭐⭐ Medium | **Impact:** Medium

- [ ] Reorganize sections for clarity
- [ ] Collapsible sections
- [ ] Quick actions at top
- [ ] Timeline view of all activities
- [ ] Related documents/photos gallery

**Why Medium:** UI/UX work, existing components just need rearranging.

---

### **4. Two-Way Communication** (12-16 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** High

- [ ] Add notes to activities
- [ ] Respond to customer messages within CRM
- [ ] Notifications when customer responds
- [ ] SMS integration (Twilio already configured)
- [ ] Email thread history

**Why Medium-Hard:** Twilio integration, webhook handling, real-time notifications.

---

### **5. Email Drip Campaigns** (16-20 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** High

- [ ] Create campaign templates
- [ ] Trigger-based campaigns (new lead, post-inspection, etc.)
- [ ] Schedule delays between emails
- [ ] Track open rates, click rates
- [ ] Unsubscribe management

**Why Medium-Hard:** Scheduled jobs (cron/edge functions), email tracking pixels, campaign builder UI.

---

### **6. Management Reports** (16-24 hours)
**Difficulty:** ⭐⭐⭐ Medium-Hard | **Impact:** High

- [ ] Sales pipeline report
- [ ] Conversion rate by source
- [ ] Revenue by service type
- [ ] Commission summary by user
- [ ] Outstanding invoices report
- [ ] Production efficiency metrics
- [ ] Custom date ranges
- [ ] Export to PDF/Excel

**Why Medium-Hard:** Complex SQL queries, chart libraries, PDF generation, Excel export.

---

### **7. Door Knocking Feature** (20-30 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** Medium

- [ ] Map view of neighborhoods (Google Maps)
- [ ] Mark houses as knocked/not home/interested
- [ ] Route optimization
- [ ] Territory assignment
- [ ] Daily activity tracking
- [ ] Lead capture from field

**Why Hard:** Google Maps integration, geofencing, route algorithms, mobile-optimized UI.

---

### **8. Progressive Web App (PWA)** (20-30 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** High

- [ ] PWA manifest configuration
- [ ] Offline capability (service worker)
- [ ] Install prompt
- [ ] Push notification support
- [ ] Sticky action buttons (bottom navigation)
- [ ] Touch-optimized UI
- [ ] Camera access for photos
- [ ] Geolocation for check-ins

**Why Hard:** Service workers, offline data sync, cache strategies, extensive testing.

---

### **9. Subcontractor Dashboard** (30-40 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** Medium

- [ ] Sub-specific login
- [ ] View assigned jobs on calendar
- [ ] Access work orders
- [ ] Upload progress photos
- [ ] Mark tasks complete
- [ ] Submit time/materials used
- [ ] View payment history

**Why Hard:** Separate user type, different permission model, new workflows, photo uploads.

---

### **10. Employee Onboarding Workflow** (30-40 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** Medium

- [ ] New user welcome screen
- [ ] Required document review
- [ ] E-signature on 1099 agreements
- [ ] Mandatory training videos
- [ ] Quiz/acknowledgment
- [ ] Lock CRM access until complete
- [ ] Admin approval step

**Why Hard:** Workflow engine, document storage, e-signature integration, video hosting.

---

### **11. Subcontractor Onboarding** (30-40 hours)
**Difficulty:** ⭐⭐⭐⭐ Hard | **Impact:** Low

- [ ] Sub-specific signup flow
- [ ] Master sub agreement signature
- [ ] W-2 upload
- [ ] Bank draft info collection
- [ ] Insurance certificate upload
- [ ] Verification workflow
- [ ] Admin approval before job access

**Why Hard:** Similar to employee onboarding, compliance requirements, document verification.

---

### **12. Marketing Pages** (40+ hours)
**Difficulty:** ⭐⭐⭐⭐⭐ Very Hard | **Impact:** Critical (for SaaS growth)

- [ ] Public landing page
- [ ] Features page
- [ ] Pricing page
- [ ] Demo request form
- [ ] Customer testimonials
- [ ] Blog/resources section
- [ ] SEO optimization
- [ ] Analytics tracking

**Why Very Hard:** Full marketing site, copywriting, design, SEO, separate from main app.

---

### **13. Pricing & Billing System** (40+ hours)
**Difficulty:** ⭐⭐⭐⭐⭐ Very Hard | **Impact:** Critical (for SaaS monetization)

- [ ] Stripe integration (enhance existing)
- [ ] Subscription tiers (Basic/Pro/Enterprise)
- [ ] Company signup flow
- [ ] Company admin onboarding wizard
- [ ] Credit card capture
- [ ] Invoice generation for subscriptions
- [ ] Usage-based billing (optional)
- [ ] Dunning management (failed payments)
- [ ] Upgrade/downgrade flows

**Why Very Hard:** Payment processing, subscription logic, compliance, testing, edge cases.

---

## 🔮 FUTURE FUNCTIONALITY

Long-term vision features (post-launch, 6-12+ months):

### **Gamification System (Playfab)**
- Leaderboards for sales reps
- Achievement badges
- Points for completed activities
- Rewards/incentives
- Team competitions
- Progress tracking

### **Training Hub**
- Video training library
- Quizzes and certifications
- Role-specific training paths
- Track completion by user
- Monetize training for external users
- CPE credits (if applicable)

### **Leads Hub**
- Generate/purchase leads for contractors
- Lead marketplace
- Quality scoring
- Exclusive territories
- Pay-per-lead model
- Lead distribution algorithm

### **Third-Party Integrations**
- **CompanyCam:** Photo/video management
- **EagleView:** Roof measurements
- **QuickBooks:** Accounting sync
- **Zapier:** Connect to 1000+ apps
- **DocuSign:** Enhanced e-signatures
- **Angi/HomeAdvisor:** Lead import

### **Native Mobile Apps**
- iOS app (Swift/SwiftUI)
- Android app (Kotlin/Jetpack Compose)
- App Store & Google Play listings
- Deep linking
- Biometric authentication
- Offline-first architecture

### **Social Media Management**
- Connect multiple social accounts (Facebook, Instagram, LinkedIn)
- Create posts from CRM
- Schedule posts
- Analytics dashboard
- Unified inbox (DMs/comments)
- Role-based social media permissions
- Company branding library

### **Multi-Trade Support**
- Trade selection at company onboarding (Roofing, Solar, HVAC, etc.)
- Trade-specific features
- Trade-specific templates
- Custom fields per trade
- Industry-specific workflows
- Cross-sell opportunities

### **Subcontractor Marketplace**
- Directory of vetted subs
- Reviews and ratings
- Availability calendar
- Skill/certification listings
- Insurance verification
- Direct booking
- Payment integration

---

## ✅ COMPLETED FEATURES

### **Global Search Functionality** ✅
- Command palette modal (Ctrl+K keyboard shortcut)
- Real-time search across leads
- Multi-field search: full_name, email, phone, address, city
- Debounced queries (300ms) for performance
- Mobile-friendly tap/touch interface
- Rich result cards with status badges and icons
- Navigation to lead detail pages
- PostgreSQL full-text search (ilike pattern matching)
- Empty states and loading indicators
- Multi-tenant company filtering

### **Email Notification System** ✅
- Multi-channel notification infrastructure
- 6/17 notification types fully integrated:
  * New leads assigned
  * Lead reassignment
  * Quote sent to customer
  * Quote approved by customer
  * Contract fully signed
  * Payment recorded
- Notification preferences UI (17 types grouped into 7 categories)
- Resend email integration
- Server action pattern with automatic notifications

### **Core CRM** ✅
- Multi-tenant architecture with RLS
- User authentication (Supabase Auth)
- Company management
- User roles & permissions (44 granular permissions)

### **Lead Management** ✅
- Lead capture and tracking
- Lead sources
- Lead status pipeline
- Activities (calls, emails, inspections)
- Lead assignment
- Lead financials overview

### **Estimating & Quoting** ✅
- Create estimates/quotes
- Line item management
- Material catalog integration
- Material variants system
- PDF generation
- Email quotes to customers
- Contract terms & conditions
- E-signature capability
- Quote approval workflow

### **Project Management** ✅
- Project creation from approved quotes
- Work order generation
- Crew assignment
- Project status tracking
- Production scheduling

### **Invoicing & Payments** ✅ **(JUST COMPLETED!)**
- Create invoices from projects
- **Full invoice editing (add/remove/modify line items)**
- **Support for negative line items (discounts)**
- Invoice status tracking (draft, sent, paid, overdue)
- **Record payments with auto-numbering (PAY-2025-XXX)**
- **Edit payment details**
- **Delete invoices/payments (admin/office only)**
- Payment method tracking
- **Real-time balance calculations**
- **Scrollable dialogs**
- **Permission-based actions**
- PDF invoice generation
- Email invoices

### **Change Order System** ✅
- Create change orders during production
- Approval workflow
- Contract comparison view
- Financial impact tracking
- Contract snapshot preservation

### **Materials Management** ✅
- Material catalog
- Material categories
- Material variants (colors, styles)
- Material templates (by service type)
- Material pricing

### **Commission System** ✅
- Commission plans
- Role-based commission rates
- Commission tracking per lead
- Commission reports

### **Document Management** ✅
- Document upload
- Document scanning (mobile camera)
- PDF storage (Supabase Storage)
- Document categorization
- Document viewer

---

## 📊 DEPLOYMENT CHECKLIST

Before going live:

- [ ] Complete all pre-launch priority features
- [ ] Run database migration: `20241216000003_fix_invoice_status_trigger.sql` ✅ (DONE)
- [ ] Set up production environment variables
- [ ] Configure Supabase production project
- [ ] Set up custom domain
- [ ] Configure SSL certificate
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics (PostHog/Mixpanel)
- [ ] Create backup strategy
- [ ] Load test critical workflows
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Set up support system (email/chat)
- [ ] Define SLA for bug fixes
- [ ] Create incident response plan

---

## 🎯 SUCCESS METRICS

**Key Performance Indicators (KPIs) to track post-launch:**

### User Adoption
- Daily active users (DAU)
- Weekly active users (WAU)
- User retention (30/60/90 day)
- Feature adoption rates

### Business Impact
- Leads created per day
- Lead → Customer conversion rate
- Average deal size
- Time to close (lead → paid invoice)
- Revenue per user

### System Health
- Page load times
- API response times
- Error rates
- Uptime (target: 99.9%)

### Customer Satisfaction
- User satisfaction score (CSAT)
- Net Promoter Score (NPS)
- Support ticket volume
- Feature request frequency

---

**Questions or need to reprioritize?** Update this document as the product evolves!
