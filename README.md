# Ketterly CRM

**Multi-tenant SaaS CRM for Roofing Companies**

Ketterly is a modern, cloud-based CRM platform designed specifically for roofing and construction companies. Built with Next.js 15 and Supabase, it provides a complete solution for managing leads, quotes, projects, and customer relationships.

## 🏗️ Architecture

- **Multi-Tenant SaaS**: Shared database with company-level isolation via Row Level Security (RLS)
- **Tech Stack**: Next.js 15, TypeScript, Supabase, TanStack Query, Tailwind CSS, shadcn/ui
- **Security**: Row-level security policies ensure complete data isolation between tenants
- **Branding**: Fully customizable branding per company (logo, colors, contact info)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RippleJonathan/ketterly2.0.git
   cd ketterly2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Link to Supabase project**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

5. **Push database schema**
   ```bash
   npx supabase db push
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
ketterly2.0/
├── app/                          # Next.js 15 App Router
│   ├── (public)/                 # Public pages (landing, pricing)
│   ├── (auth)/                   # Auth flows (signup, login)
│   └── (admin)/                  # Protected admin dashboard
│       └── admin/
│           ├── dashboard/        # Overview
│           ├── leads/            # Lead management
│           ├── quotes/           # Quote generation
│           ├── projects/         # Project tracking
│           └── settings/         # Company settings
├── components/
│   ├── admin/                    # Admin-specific components
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── supabase/                 # Supabase clients
│   ├── api/                      # API functions
│   ├── types/                    # TypeScript types
│   ├── hooks/                    # React Query hooks
│   └── utils/                    # Utilities
├── supabase/
│   ├── migrations/               # Database migrations
│   ├── seed.sql                  # Seed data
│   └── config.toml               # Supabase config
└── docs/
    └── admin-system/             # Implementation docs
```

## 🗄️ Database Schema

The database follows a multi-tenant architecture with these core tables:

- **`companies`** - Tenant master table
- **`users`** - Application users (linked to companies)
- **`customers`** - Customer database
- **`leads`** - Sales leads
- **`quotes`** + `quote_line_items` - Quote management
- **`projects`** + `project_tasks` - Project tracking
- **`activities`** - Universal activity log

All tables include `company_id` for tenant isolation and are protected by Row Level Security (RLS) policies.

## 🔐 Security

- **Row Level Security (RLS)**: All tables have RLS policies that filter by user's company
- **Role-Based Access Control**: super_admin, admin, manager, user roles
- **Soft Deletes**: Records are marked as deleted rather than permanently removed
- **API Layer**: All database operations go through validated API functions

## 🎨 Features

### Phase 0: Foundation ✅
- [x] Multi-tenant database schema
- [x] Authentication & authorization
- [x] Company management
- [x] User management

### Phase 1: Lead Management (In Progress)
- [ ] Lead capture & tracking
- [ ] Lead pipeline (kanban)
- [ ] Activity logging
- [ ] Lead assignment

### Phase 2: Quotes & Projects (Planned)
- [ ] Quote generation with line items
- [ ] PDF export
- [ ] Project management
- [ ] Crew assignment
- [ ] Progress tracking

### Future Phases
- Customer portal
- Invoicing & payments
- Schedule management
- Analytics & reporting
- Mobile app

## 🧪 Development

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start
```

### Database Migrations

```bash
# Create new migration
npx supabase migration new migration_name

# Apply migrations to remote database
npx supabase db push

# Generate TypeScript types from database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Type check
npx tsc --noEmit
```

## 📚 Documentation

Comprehensive implementation documentation is available in the `/docs/admin-system/` directory:

- [00-PROJECT-OVERVIEW.md](./docs/admin-system/00-PROJECT-OVERVIEW.md) - Architecture overview
- [01A-DATABASE-SCHEMA.md](./docs/admin-system/01A-DATABASE-SCHEMA.md) - Complete database schema
- [02-TECH-STACK.md](./docs/admin-system/02-TECH-STACK.md) - Technology decisions
- And more...

See [.github/copilot-instructions.md](./.github/copilot-instructions.md) for GitHub Copilot integration.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables from `.env.local`
4. Deploy!

### Environment Variables

Required environment variables for deployment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🤝 Contributing

This is a private repository for Ketterly development. For questions or support, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 🏢 First Tenant

**Ripple Roofing & Construction** - The inaugural company on the Ketterly platform, serving as the reference implementation and primary tenant.

---

**Built with ❤️ by the Ketterly team**

**Status**: Phase 0 - Foundation Setup  
**Version**: 0.1.0  
**Last Updated**: November 27, 2024
