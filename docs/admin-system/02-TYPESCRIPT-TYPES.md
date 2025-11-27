# TypeScript Types & Interfaces

This document describes the expected TypeScript types for the admin system. Files should live under `src/lib/types/` and include `database.ts` (auto-generated), `enums.ts`, `admin.ts`, `leads.ts`, `quotes.ts`, `projects.ts`, `activities.ts`, and `api.ts`.

Core Enums: UserRole, LeadStatus, LeadSource, ProjectStatus, QuoteStatus, InvoiceStatus, PaymentMethod.

Database Types: Auto-generate with `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts`

Application Types: User, UserProfile, Lead, QuoteWithRelations, ProjectWithRelations, ActivityWithRelations.

Form Validation Schemas: use Zod in `src/lib/validation/schemas.ts`.

Last Updated: November 14, 2025
Version: 1.0
Status: Complete type definitions
