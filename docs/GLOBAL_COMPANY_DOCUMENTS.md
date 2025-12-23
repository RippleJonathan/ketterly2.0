# Global & Company Documents Feature

**Status**: Architecture defined, not implemented  
**Priority**: Medium  
**Estimated Effort**: 2-3 days

## Overview

Create a CRM-wide document management system with two tiers:
1. **Global Documents** (Read-only) - Managed by platform admins, visible to all companies
2. **Company Documents** (Uploadable) - Per-company file storage, managed by company users

## Use Cases

### Global Documents
- Industry best practices guides
- Standard contract templates
- Compliance documentation
- Training materials
- Product catalogs from manufacturers

### Company Documents
- Company policies
- Insurance certificates
- License documentation
- Custom contract templates
- Branding assets (logos, letterhead)
- Marketing materials
- Safety manuals
- Employee handbooks

## Database Schema

### Table: `global_documents`

```sql
CREATE TABLE public.global_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'contracts', 'compliance', 'training', 'product_catalogs', 'best_practices'
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx', 'png', etc.
  
  -- Versioning
  version TEXT DEFAULT '1.0',
  supersedes_id UUID REFERENCES global_documents(id), -- Links to previous version
  
  -- Access control
  is_active BOOLEAN DEFAULT true NOT NULL,
  visibility TEXT DEFAULT 'all' NOT NULL, -- 'all', 'premium_only', 'admin_only'
  
  -- Metadata
  uploaded_by TEXT, -- Platform admin ID
  tags TEXT[], -- Searchable tags
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_global_documents_category ON global_documents(category);
CREATE INDEX idx_global_documents_active ON global_documents(is_active);
CREATE INDEX idx_global_documents_tags ON global_documents USING GIN(tags);

-- RLS: All authenticated users can read active global docs
ALTER TABLE global_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view active global documents"
  ON global_documents
  FOR SELECT
  USING (
    is_active = true 
    AND deleted_at IS NULL
    AND (
      visibility = 'all'
      OR (visibility = 'premium_only' AND EXISTS (
        SELECT 1 FROM users 
        JOIN companies ON users.company_id = companies.id
        WHERE users.id = auth.uid() 
        AND companies.subscription_tier IN ('pro', 'enterprise')
      ))
    )
  );

-- Only platform admins can manage global docs (managed via service role)
```

### Table: `company_documents`

```sql
CREATE TABLE public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Document details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'policies', 'insurance', 'licenses', 'contracts', 'branding', 'marketing', 'safety', 'other'
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  tags TEXT[],
  is_archived BOOLEAN DEFAULT false NOT NULL,
  
  -- eSign integration
  is_template BOOLEAN DEFAULT false NOT NULL, -- Can be used as eSign template
  template_variables JSONB, -- Placeholder variables for templates
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_company_documents_company_id ON company_documents(company_id);
CREATE INDEX idx_company_documents_category ON company_documents(category);
CREATE INDEX idx_company_documents_uploaded_by ON company_documents(uploaded_by);
CREATE INDEX idx_company_documents_tags ON company_documents USING GIN(tags);

-- RLS: Company users can only access their company's documents
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's documents"
  ON company_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can upload documents to their company"
  ON company_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's documents"
  ON company_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete their company's documents"
  ON company_documents
  FOR UPDATE -- Soft delete via deleted_at
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );
```

## Supabase Storage Buckets

### Bucket: `global-documents`
- **Access**: Read-only for all authenticated users
- **Upload**: Platform admins only (via service role)
- **Path structure**: `{category}/{filename}`

```typescript
// Storage policy (Supabase Dashboard)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::global-documents/*"],
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "authenticated-read"
        }
      }
    }
  ]
}
```

### Bucket: `company-documents`
- **Access**: Company-scoped (RLS enforced)
- **Upload**: Company users with upload permission
- **Path structure**: `{company_id}/{category}/{filename}`

```typescript
// Storage RLS policy
create policy "Company users can view their documents"
on storage.objects for select
using (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] in (
    select company_id::text from users where id = auth.uid()
  )
);

create policy "Company users can upload documents"
on storage.objects for insert
with check (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] in (
    select company_id::text from users where id = auth.uid()
  )
);
```

## TypeScript Types

```typescript
// lib/types/documents.ts

export type DocumentCategory = 
  | 'contracts'
  | 'compliance'
  | 'training'
  | 'product_catalogs'
  | 'best_practices'
  | 'policies'
  | 'insurance'
  | 'licenses'
  | 'branding'
  | 'marketing'
  | 'safety'
  | 'other'

export interface GlobalDocument {
  id: string
  title: string
  description: string | null
  category: DocumentCategory
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  version: string
  supersedes_id: string | null
  is_active: boolean
  visibility: 'all' | 'premium_only' | 'admin_only'
  uploaded_by: string | null
  tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CompanyDocument {
  id: string
  company_id: string
  title: string
  description: string | null
  category: DocumentCategory
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: string
  tags: string[]
  is_archived: boolean
  is_template: boolean
  template_variables: Record<string, any> | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CompanyDocumentWithUser extends CompanyDocument {
  uploader?: {
    full_name: string
  }
}
```

## API Functions

```typescript
// lib/api/documents.ts

import { supabase } from '@/lib/supabase/client'
import { GlobalDocument, CompanyDocument } from '@/lib/types/documents'

// ===== GLOBAL DOCUMENTS =====

export async function getGlobalDocuments(filters?: {
  category?: string
  tags?: string[]
}) {
  let query = supabase
    .from('global_documents')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  const { data, error } = await query
  if (error) throw error
  return data as GlobalDocument[]
}

// ===== COMPANY DOCUMENTS =====

export async function getCompanyDocuments(
  companyId: string,
  filters?: {
    category?: string
    is_archived?: boolean
    is_template?: boolean
  }
) {
  let query = supabase
    .from('company_documents')
    .select(`
      *,
      uploader:users!company_documents_uploaded_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.is_archived !== undefined) {
    query = query.eq('is_archived', filters.is_archived)
  }
  if (filters?.is_template !== undefined) {
    query = query.eq('is_template', filters.is_template)
  }

  const { data, error } = await query
  if (error) throw error
  return data as CompanyDocumentWithUser[]
}

export async function uploadCompanyDocument(
  companyId: string,
  file: File,
  metadata: {
    title: string
    description?: string
    category: string
    tags?: string[]
    is_template?: boolean
    template_variables?: Record<string, any>
  }
) {
  // 1. Upload file to Supabase Storage
  const fileName = `${companyId}/${metadata.category}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('company-documents')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('company-documents')
    .getPublicUrl(fileName)

  // 3. Create database record
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('company_documents')
    .insert({
      company_id: companyId,
      title: metadata.title,
      description: metadata.description || null,
      category: metadata.category,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: user.id,
      tags: metadata.tags || [],
      is_template: metadata.is_template || false,
      template_variables: metadata.template_variables || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CompanyDocument
}

export async function deleteCompanyDocument(documentId: string) {
  // Soft delete
  const { error } = await supabase
    .from('company_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId)

  if (error) throw error
}
```

## UI Components

### Documents Library Page
- **Location**: `/admin/documents`
- **Tabs**:
  - Global Library (read-only, browse/download)
  - Company Documents (upload, manage, archive)
  - Templates (eSign-ready documents)

### Component Structure

```
app/
└── (admin)/
    └── admin/
        └── documents/
            ├── page.tsx                      # Main documents page
            ├── global-documents-tab.tsx      # Browse global docs
            ├── company-documents-tab.tsx     # Manage company docs
            └── upload-document-dialog.tsx    # Upload UI

components/admin/documents/
├── document-card.tsx                         # Document preview card
├── document-list.tsx                         # List view
├── document-grid.tsx                         # Grid view
├── document-viewer.tsx                       # PDF/image viewer
├── category-filter.tsx                       # Category sidebar
└── document-search.tsx                       # Search/filter bar
```

## Implementation Checklist

### Phase 1: Database & Storage
- [ ] Create `global_documents` table with RLS
- [ ] Create `company_documents` table with RLS
- [ ] Set up Supabase storage buckets
- [ ] Configure storage policies
- [ ] Add sample global documents (optional)

### Phase 2: API Layer
- [ ] Create TypeScript types
- [ ] Implement API functions (`lib/api/documents.ts`)
- [ ] Create React Query hooks (`lib/hooks/use-documents.ts`)

### Phase 3: UI Components
- [ ] Build document card/list components
- [ ] Create upload dialog with drag-drop
- [ ] Add document viewer (PDF.js integration)
- [ ] Implement category filters and search

### Phase 4: Integration
- [ ] Add "Documents" to admin navigation
- [ ] Link documents to leads/projects (optional)
- [ ] Add document picker for eSign templates
- [ ] Permission checks (upload, delete, archive)

### Phase 5: Testing
- [ ] Test upload flow (various file types)
- [ ] Test RLS policies (company isolation)
- [ ] Test storage policies (access control)
- [ ] Test document viewer
- [ ] E2E: Upload → view → archive → delete

## Next Steps

1. Review and approve this architecture
2. Run database migration to create tables
3. Set up Supabase storage buckets
4. Implement API layer
5. Build UI components
6. Test and deploy

---

**Related Features:**
- eSign Template Builder (uses `is_template` flag)
- Smart Deck Presentations (can reference documents)
- Lead/Project attachments (different from company library)
