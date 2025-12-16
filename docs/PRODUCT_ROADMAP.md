# Ketterly CRM - Product Roadmap

**Last Updated:** December 16, 2024  
**Status:** Pre-Launch Development

---

## 🚀 PRE-LAUNCH PRIORITIES

These features must be completed before production launch:

### 1. **Push Notifications (OneSignal)**
- [ ] Integrate OneSignal SDK
- [ ] Set up notification triggers for key events
- [ ] Test notification delivery across devices

### 2. **Notification Preferences UI**
- [ ] Add notification settings to user profile
- [ ] Opt-in toggles for push notifications
- [ ] Opt-in toggles for email notifications
- [ ] Save preferences to user settings

### 3. **Quick Add Lead Button**
- [ ] Add "+ Add Lead" button to main navigation/top bar
- [ ] Modal-based form (doesn't navigate away from current page)
- [ ] Accessible from any page in the app
- [ ] Quick capture: name, phone, address, source

### 4. **Global Search Functionality**
- [ ] Search bar in header/navigation
- [ ] Search across:
  - Customer names
  - Addresses
  - Phone numbers
  - Email addresses
- [ ] Real-time search results
- [ ] Navigate directly to customer/lead page from results

### 5. **Calendar System**
- [ ] Basic calendar view (day/week/month)
- [ ] Event types:
  - Inspections
  - Appointments
  - Production schedules
- [ ] Real-time updates (all reps see same schedule)
- [ ] Drag-and-drop rescheduling
- [ ] Color-coded by event type or user
- [ ] Filter by user, team, or location

### 6. **Locations/Teams Management**
- [ ] Create locations/teams in settings
- [ ] Assign users to locations/teams
- [ ] Filter leads/jobs by location
- [ ] Location-specific permissions
- [ ] "All locations" vs "specific location" views

### 7. **Multi-User Job Assignment**
- [ ] Assign multiple users to a single job:
  - Sales Rep
  - Marketing Rep
  - Sales Manager
  - Project Manager
- [ ] Role-specific commission splits per job
- [ ] Per-job permissions (who can edit/view)
- [ ] Activity log shows which user performed which action

### 8. **Automated Job Status Updates**
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

### 9. **Navigation Cleanup**
- [ ] Remove unused navigation links
- [ ] Role-based navigation (show/hide based on permissions)
- [ ] Organize by user workflow:
  - Sales: Leads, Estimates, Quotes, Follow-ups
  - Production: Schedule, Work Orders, Projects
  - Office: Invoicing, Payments, Reports
  - Admin: Settings, Users, Permissions, Analytics

### 10. **Estimate Templates**
- [ ] Create estimate templates (similar to material/work order templates)
- [ ] Pre-configured line items by service type
- [ ] Template categories (repair, replacement, new construction)
- [ ] Clone and customize templates
- [ ] Admin-only template management

### 11. **Dashboard Upgrade**
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

### 12. **Authentication & Middleware**
- [ ] Protect all admin routes with middleware
- [ ] Session management (auto-logout on inactivity)
- [ ] Role-based route access
- [ ] Redirect unauthorized users
- [ ] Password reset flow
- [ ] Email verification on signup

---

## 💡 NICE-TO-HAVE FEATURES

Features to implement after launch (ordered by priority):

### **Phase 1: Customer Communication**

#### Email Drip Campaigns
- [ ] Create campaign templates
- [ ] Trigger-based campaigns (new lead, post-inspection, etc.)
- [ ] Schedule delays between emails
- [ ] Track open rates, click rates
- [ ] Unsubscribe management

#### Customizable Customer Emails
- [ ] Email template editor
- [ ] Variable placeholders (customer name, address, etc.)
- [ ] Company branding (logo, colors)
- [ ] Preview before sending
- [ ] Save custom templates

#### Two-Way Communication
- [ ] Add notes to activities
- [ ] Respond to customer messages within CRM
- [ ] Notifications when customer responds
- [ ] SMS integration (Twilio)
- [ ] Email thread history

### **Phase 2: Field Operations**

#### Door Knocking Feature
- [ ] Map view of neighborhoods
- [ ] Mark houses as knocked/not home/interested
- [ ] Route optimization
- [ ] Territory assignment
- [ ] Daily activity tracking
- [ ] Lead capture from field

#### Subcontractor Dashboard
- [ ] Sub-specific login
- [ ] View assigned jobs on calendar
- [ ] Access work orders
- [ ] Upload progress photos
- [ ] Mark tasks complete
- [ ] Submit time/materials used
- [ ] View payment history

#### Lead Form Address Autocomplete
- [ ] Google Maps API integration
- [ ] Autocomplete as user types
- [ ] Validate and format addresses
- [ ] Extract city/state/zip automatically
- [ ] Geocode for map display

### **Phase 3: Reporting & Analytics**

#### Management Reports
- [ ] Sales pipeline report
- [ ] Conversion rate by source
- [ ] Revenue by service type
- [ ] Commission summary by user
- [ ] Outstanding invoices report
- [ ] Production efficiency metrics
- [ ] Custom date ranges
- [ ] Export to PDF/Excel

#### Lead Detail Page Redesign
- [ ] Reorganize sections for clarity
- [ ] Collapsible sections
- [ ] Quick actions at top
- [ ] Timeline view of all activities
- [ ] Related documents/photos gallery

### **Phase 4: Multi-Tenant & Monetization**

#### Marketing Pages
- [ ] Public landing page
- [ ] Features page
- [ ] Pricing page
- [ ] Demo request form
- [ ] Customer testimonials
- [ ] Blog/resources section

#### Pricing & Billing System
- [ ] Stripe integration (already in place)
- [ ] Subscription tiers (Basic/Pro/Enterprise)
- [ ] Company signup flow
- [ ] Company admin onboarding wizard
- [ ] Credit card capture
- [ ] Invoice generation for subscriptions
- [ ] Usage-based billing (optional)

### **Phase 5: Workflow Automation**

#### Employee Onboarding Workflow
- [ ] New user welcome screen
- [ ] Required document review
- [ ] E-signature on 1099 agreements
- [ ] Mandatory training videos
- [ ] Quiz/acknowledgment
- [ ] Lock CRM access until complete
- [ ] Admin approval step

#### Subcontractor Onboarding
- [ ] Sub-specific signup flow
- [ ] Master sub agreement signature
- [ ] W-2 upload
- [ ] Bank draft info collection
- [ ] Insurance certificate upload
- [ ] Verification workflow
- [ ] Admin approval before job access

### **Phase 6: Progressive Web App (PWA)**

#### Mobile Optimization
- [ ] PWA manifest configuration
- [ ] Offline capability
- [ ] Install prompt
- [ ] Push notification support
- [ ] Sticky action buttons (bottom navigation)
- [ ] Touch-optimized UI
- [ ] Camera access for photos
- [ ] Geolocation for check-ins

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
