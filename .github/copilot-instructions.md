# Ketterly CRM - GitHub Copilot Instructions

## Project Overview

**Ketterly** is a multi-tenant SaaS CRM platform designed for roofing and construction companies. The first tenant is **Ripple Roofing & Construction**. Each company that signs up gets isolated access to their own leads, quotes, projects, and customer data within a shared database architecture.

### Core Identity
- **Platform Name**: Ketterly (the SaaS product)
- **First Tenant**: Ripple Roofing & Construction
- **Architecture**: Multi-tenant SaaS with row-level security (RLS)
- **Business Model**: Subscription-based CRM for roofing companies

### Key Architectural Principles

1. **Multi-Tenant by Design**: Every data table includes `company_id` for tenant isolation
2. **Database-First**: Complete schema defined upfront, RLS policies enforce data boundaries
3. **Modular Architecture**: Features are self-contained modules that extend without breaking existing code
4. **Type Safety**: TypeScript everywhere, auto-generated types from database schema
5. **API-First**: All database operations go through consistent API layer
6. **No Breaking Changes**: New features extend existing structure, never modify core tables
7. **Company Branding Configurable**: No hardcoded company names - everything comes from `companies` table

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15.x (App Router, React Server Components)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: TanStack Query v5 (React Query) for server state
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table v8
- **Charts**: Recharts
- **Date/Time**: date-fns

### Backend
- **Database**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Storage**: Supabase Storage (for PDFs, photos)
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Supabase Edge Functions (Deno)

### Integrations (Phase 2+)
- **Email**: Resend
- **SMS**: Twilio
- **PDF Generation**: react-pdf
- **Maps**: Google Maps API
- **Payments**: Stripe (future)

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Vercel

---

## File Structure

```
ketterly/
├── .github/
│   └── copilot-instructions.md          # This file
├── docs/
│   └── admin-system/                     # Implementation docs
│       ├── README.md
│       ├── 00-PROJECT-OVERVIEW.md
│       ├── 01A-DATABASE-SCHEMA.md
│       └── ...
├── src/
│   ├── app/
│   │   ├── (public)/                     # Public marketing pages
│   │   │   ├── page.tsx                  # Landing page
│   │   │   ├── pricing/
│   │   │   ├── features/
│   │   │   └── login/
│   │   ├── (auth)/                       # Auth flows
│   │   │   ├── signup/                   # Company signup
│   │   │   └── onboarding/               # New company setup wizard
│   │   └── (admin)/                      # Protected admin dashboard
│   │       └── admin/
│   │           ├── layout.tsx            # Admin layout wrapper
│   │           ├── dashboard/            # Overview dashboard
│   │           ├── leads/                # Lead management
│   │           ├── quotes/               # Quote generation
│   │           ├── projects/             # Project tracking
│   │           ├── customers/            # Customer database
│   │           ├── schedule/             # Calendar & scheduling
│   │           ├── invoices/             # Invoicing & payments
│   │           ├── analytics/            # Reports & analytics
│   │           └── settings/             # Company settings
│   ├── components/
│   │   ├── admin/                        # Admin-specific components
│   │   │   ├── layouts/
│   │   │   │   ├── admin-layout.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── header.tsx
│   │   │   ├── leads/
│   │   │   ├── quotes/
│   │   │   ├── projects/
│   │   │   └── shared/                   # Reusable admin components
│   │   └── ui/                           # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server client
│   │   │   ├── admin.ts                  # Admin service account
│   │   │   └── middleware.ts             # Auth middleware
│   │   ├── api/                          # API client functions
│   │   │   ├── companies.ts
│   │   │   ├── leads.ts
│   │   │   ├── quotes.ts
│   │   │   ├── projects.ts
│   │   │   └── customers.ts
│   │   ├── types/                        # TypeScript types
│   │   │   ├── database.ts               # Auto-generated from Supabase
│   │   │   ├── enums.ts                  # Shared enums
│   │   │   ├── admin.ts
│   │   │   ├── leads.ts
│   │   │   ├── quotes.ts
│   │   │   └── api.ts                    # API response types
│   │   ├── constants/                    # App constants
│   │   │   ├── routes.ts
│   │   │   ├── leads.ts
│   │   │   ├── quotes.ts
│   │   │   └── ui.ts
│   │   ├── utils/                        # Utility functions
│   │   │   ├── calculations.ts
│   │   │   ├── formatting.ts
│   │   │   └── validation.ts
│   │   ├── hooks/                        # Custom React hooks
│   │   │   ├── use-current-company.ts
│   │   │   ├── use-leads.ts
│   │   │   ├── use-quotes.ts
│   │   │   └── use-projects.ts
│   │   └── validation/                   # Zod schemas
│   │       └── schemas.ts
│   └── providers/
│       ├── react-query-provider.tsx
│       └── theme-provider.tsx
├── supabase/
│   ├── config.toml                       # Supabase CLI config
│   ├── migrations/                       # Database migrations
│   │   └── 20241127000001_init_schema.sql
│   ├── seed.sql                          # Seed data
│   └── functions/                        # Edge Functions
├── public/
│   └── images/
├── .env.local                            # Environment variables (gitignored)
├── .env.example                          # Environment template
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Multi-Tenant Architecture

### Database Schema Additions

**CRITICAL**: Every table must include `company_id` for tenant isolation.

```sql
-- Master companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  subscription_tier TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Example: users table with company_id
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) NOT NULL, -- ADDED
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  -- ... rest of fields
);

-- Example: leads table with company_id
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL, -- ADDED
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  -- ... rest of fields
);
```

### Row Level Security (RLS) Pattern

**EVERY table must have RLS policies that filter by company_id**:

```sql
-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's data
CREATE POLICY "Users can only access their company's leads"
  ON leads
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );
```

### User Context Hook

Always use `useCurrentCompany()` hook to get the logged-in user's company:

```typescript
// src/lib/hooks/use-current-company.ts
export function useCurrentCompany() {
  return useQuery({
    queryKey: ['current-company'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, companies(*)')
        .eq('id', user.id)
        .single()
      
      return userData?.companies
    }
  })
}
```

---

## Naming Conventions

### Database (PostgreSQL)
- **Tables**: `snake_case`, plural (e.g., `companies`, `leads`, `quote_line_items`)
- **Columns**: `snake_case` (e.g., `company_id`, `created_at`)
- **Constraints**: descriptive (e.g., `status_check`, `unique_company_slug`)
- **Indexes**: `idx_<table>_<column>` (e.g., `idx_leads_company_id`)

### TypeScript
- **Types/Interfaces**: `PascalCase` (e.g., `Lead`, `QuoteWithRelations`, `ApiResponse<T>`)
- **Enums**: `PascalCase` with UPPER_CASE values (e.g., `UserRole.ADMIN`)
- **Functions/Variables**: `camelCase` (e.g., `getLeads`, `currentCompany`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TAX_RATE`, `ADMIN_ROUTES`)
- **Files**: `kebab-case` (e.g., `use-leads.ts`, `admin-layout.tsx`)
- **Components**: `PascalCase` (e.g., `LeadForm`, `AdminSidebar`)

### Routes
- **Public**: `/`, `/pricing`, `/features`, `/login`
- **Auth**: `/signup`, `/onboarding`
- **Admin**: `/admin/dashboard`, `/admin/leads`, `/admin/quotes/[id]`

---

## Code Patterns

### 1. API Client Functions

All database operations use consistent API pattern:

```typescript
// src/lib/api/leads.ts
import { supabase } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/api'
import { Lead, LeadInsert } from '@/lib/types/leads'

export async function getLeads(
  companyId: string,
  filters?: LeadFilters
): Promise<ApiResponse<Lead[]>> {
  try {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)  // ALWAYS filter by company
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply additional filters...
    
    const { data, error, count } = await query

    if (error) throw error
    return { data, error: null, count: count || undefined }
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function createLead(
  companyId: string,
  lead: LeadInsert
): Promise<ApiResponse<Lead>> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...lead, company_id: companyId })  // ALWAYS set company_id
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

### 2. React Query Hooks

Use TanStack Query for all server state:

```typescript
// src/lib/hooks/use-leads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, createLead } from '@/lib/api/leads'
import { useCurrentCompany } from './use-current-company'

export function useLeads(filters?: LeadFilters) {
  const { data: company } = useCurrentCompany()
  
  return useQuery({
    queryKey: ['leads', company?.id, filters],
    queryFn: () => getLeads(company!.id, filters),
    enabled: !!company?.id,
  })
}

export function useCreateLead() {
  const { data: company } = useCurrentCompany()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lead: LeadInsert) => createLead(company!.id, lead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', company?.id] })
      toast.success('Lead created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lead: ${error.message}`)
    },
  })
}
```

### 3. Form Validation with Zod

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod'

export const leadFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  source: z.nativeEnum(LeadSource),
  service_type: z.nativeEnum(ServiceType),
  // ...
})

export type LeadFormData = z.infer<typeof leadFormSchema>
```

### 4. Component Pattern (Server Component)

```typescript
// src/app/(admin)/admin/leads/page.tsx
import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/admin/leads/leads-table'

export default async function LeadsPage() {
  const supabase = createClient()
  
  // Get current user's company
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user!.id)
    .single()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', userData!.company_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>Leads</h1>
      <LeadsTable initialData={leads || []} />
    </div>
  )
}
```

### 5. Component Pattern (Client Component)

```typescript
// src/components/admin/leads/lead-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { leadFormSchema } from '@/lib/validation/schemas'
import { useCreateLead } from '@/lib/hooks/use-leads'

export function LeadForm({ onSuccess }: { onSuccess?: () => void }) {
  const createLead = useCreateLead()
  
  const form = useForm({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      source: 'website',
      service_type: 'repair',
    },
  })

  const onSubmit = async (data: LeadFormData) => {
    await createLead.mutateAsync(data)
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

---

## Development Workflow

### Phase 0: Foundation (Week 1-2)
**Current Phase** - Setting up multi-tenant infrastructure

1. **Database Setup**
   - Create Supabase project
   - Run initial migrations (companies, users, core tables)
   - Set up RLS policies for all tables
   - Create first test company (Ripple Roofing & Construction)

2. **Next.js Setup**
   - Initialize Next.js 15 project
   - Install dependencies (shadcn/ui, TanStack Query, etc.)
   - Configure Tailwind CSS
   - Set up environment variables

3. **Type Definitions**
   - Generate database types from Supabase: `npx supabase gen types typescript`
   - Create custom types and enums
   - Set up Zod validation schemas

4. **API Layer**
   - Create Supabase client utilities (browser, server, admin)
   - Build API functions for core entities (companies, leads, quotes)
   - Set up React Query hooks

5. **Authentication**
   - Implement login/logout flows
   - Create company signup wizard
   - Set up protected routes middleware
   - Create role-based access control

6. **Admin Layout**
   - Build sidebar navigation
   - Create header with company branding
   - Set up route groups and layouts
   - Add responsive design

### Phase 1: Lead Management (Week 3-4)
- Lead list view with filters
- Lead detail page
- Lead creation/edit forms
- Lead pipeline kanban view
- Activity tracking

### Phase 2: Quotes & Projects (Week 5-8)
- Quote generation with line items
- PDF generation
- Project management
- Crew assignment
- Progress tracking

### Phase 3+: See docs/admin-system/ for detailed roadmap

---

## Critical Rules

### 🚨 Always Include company_id

```typescript
// ❌ WRONG - Missing company_id
const { data } = await supabase.from('leads').select('*')

// ✅ CORRECT - Filter by company
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('company_id', currentCompanyId)
```

### 🚨 Never Hardcode Company Names

```typescript
// ❌ WRONG
const companyName = "Ripple Roofs"

// ✅ CORRECT
const { data: company } = useCurrentCompany()
const companyName = company?.name
```

### 🚨 Always Use Soft Deletes

```typescript
// ❌ WRONG
await supabase.from('leads').delete().eq('id', leadId)

// ✅ CORRECT
await supabase
  .from('leads')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', leadId)
```

### 🚨 Always Filter Out Deleted Records

```typescript
// ❌ WRONG
.select('*').eq('company_id', companyId)

// ✅ CORRECT
.select('*')
.eq('company_id', companyId)
.is('deleted_at', null)
```

### 🚨 Always Handle Errors

```typescript
// ❌ WRONG
const { data } = await supabase.from('leads').select('*')
return data

// ✅ CORRECT
const { data, error } = await supabase.from('leads').select('*')
if (error) {
  console.error('Failed to fetch leads:', error)
  return { data: null, error }
}
return { data, error: null }
```

---

## Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...

# SMS (Twilio) - Optional
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps - Optional
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

---

## Testing Strategy

### Unit Tests (Vitest)
- API functions with mocked Supabase client
- Utility functions
- Validation schemas

### Integration Tests
- React Query hooks with MSW
- Component integration with user interactions

### E2E Tests (Playwright)
- Critical user flows (signup, create lead, generate quote)
- Multi-tenant isolation (create 2 companies, verify no data leakage)

---

## Common Gotchas & Solutions

### 1. RLS Policy Not Working
**Symptom**: Can't fetch data, getting empty results
**Solution**: Check RLS policies, ensure `company_id` is being set correctly

```sql
-- Debug: Check if user has company
SELECT id, company_id FROM users WHERE id = auth.uid();

-- Debug: Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'leads';
```

### 2. Type Errors After Schema Changes
**Solution**: Regenerate types after any migration
```bash
npx supabase gen types typescript --project-id YOUR_ID > src/lib/types/database.ts
```

### 3. Company Context Lost
**Symptom**: `company_id` is undefined in hooks
**Solution**: Ensure `useCurrentCompany()` is called at component level, not in API functions

### 4. Infinite Query Loops
**Solution**: Properly structure React Query keys
```typescript
// ✅ CORRECT - Include all dependencies in queryKey
queryKey: ['leads', company?.id, filters]
```

---

## Documentation Standards

Every feature module should include:

1. **Inline Comments**: Explain complex business logic
2. **JSDoc**: Document all exported functions
3. **Type Annotations**: Never use `any`, always define proper types
4. **README Updates**: Update relevant docs when adding features

Example:

```typescript
/**
 * Calculates the total price for a quote including tax and discounts
 * 
 * @param lineItems - Array of quote line items
 * @param taxRate - Tax rate as decimal (e.g., 0.0825 for 8.25%)
 * @param discountAmount - Fixed discount amount in dollars
 * @returns Object with subtotal, tax, discount, and total
 */
export function calculateQuoteTotal(
  lineItems: QuoteLineItem[],
  taxRate: number,
  discountAmount: number = 0
): QuoteTotals {
  // Implementation...
}
```

---

## Quick Reference

### Generate DB Types
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts
```

### Run Development Server
```bash
npm run dev
```

### Create Migration
```bash
npx supabase migration new add_feature_name
```

### Apply Migrations Locally
```bash
npx supabase db push
```

### Deploy to Vercel
```bash
vercel --prod
```

---

## Additional Resources

- **Project Docs**: `/docs/admin-system/` - Comprehensive implementation guides
- **Supabase Docs**: https://supabase.com/docs
- **Next.js 15 Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest

---

**Last Updated**: November 27, 2024  
**Version**: 1.0.0  
**Status**: Phase 0 - Foundation Setup
