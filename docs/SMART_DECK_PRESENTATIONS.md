# Smart Deck Presentation Module

**Status**: Architecture defined, not implemented  
**Priority**: Medium-High  
**Estimated Effort**: 4-5 days

## Overview

A dynamic presentation builder that allows companies to create customizable slide decks for customer presentations. Think "Notion meets PowerPoint" — block-based editor with templates, dynamic data injection, and professional presentation viewer.

## Use Cases

### For Roofing Companies
- Project proposals with photos and pricing
- Before/after showcases
- Material comparison slides
- Warranty and service packages
- Company credentials and past projects
- Financing options presentation

### Key Features
- **Template Library**: Pre-built slide templates (title, content, comparison, gallery, pricing)
- **Dynamic Data**: Auto-populate from leads, quotes, projects
- **Media Library**: Upload photos, logos, diagrams
- **Presenter View**: Customer-facing full-screen mode
- **Share Links**: Send presentations to customers via unique link
- **Analytics**: Track views and engagement (optional)

## Database Schema

### Table: `presentation_templates`

```sql
CREATE TABLE public.presentation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'proposal', 'credentials', 'product_showcase', 'pricing', 'custom'
  
  -- Slides structure (JSONB array of slide configs)
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_global BOOLEAN DEFAULT false NOT NULL, -- Global templates visible to all companies
  is_active BOOLEAN DEFAULT true NOT NULL,
  usage_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_presentation_templates_company_id ON presentation_templates(company_id);
CREATE INDEX idx_presentation_templates_category ON presentation_templates(category);
CREATE INDEX idx_presentation_templates_global ON presentation_templates(is_global, is_active);

-- RLS
ALTER TABLE presentation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's templates and global templates"
  ON presentation_templates
  FOR SELECT
  USING (
    (is_global = true AND is_active = true AND deleted_at IS NULL)
    OR (company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    ) AND deleted_at IS NULL)
  );

CREATE POLICY "Users can create templates for their company"
  ON presentation_templates
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

### Table: `presentations`

```sql
CREATE TABLE public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES presentation_templates(id),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Optional: link to lead
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL, -- Optional: link to quote
  
  -- Presentation details
  title TEXT NOT NULL,
  description TEXT,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb, -- Actual slide content
  
  -- Sharing
  share_token TEXT UNIQUE,
  share_token_created_at TIMESTAMPTZ,
  share_link_expires_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false NOT NULL,
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'ready', 'sent', 'archived'
  
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_presentations_company_id ON presentations(company_id);
CREATE INDEX idx_presentations_lead_id ON presentations(lead_id);
CREATE INDEX idx_presentations_quote_id ON presentations(quote_id);
CREATE INDEX idx_presentations_share_token ON presentations(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_presentations_status ON presentations(status);

-- RLS
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's presentations"
  ON presentations
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR (is_public = true AND share_token IS NOT NULL AND deleted_at IS NULL)
  );

CREATE POLICY "Users can create presentations for their company"
  ON presentations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's presentations"
  ON presentations
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

### Table: `presentation_media`

```sql
CREATE TABLE public.presentation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Media details
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'icon'
  file_size INTEGER NOT NULL,
  
  -- Organization
  category TEXT, -- 'logo', 'before_after', 'product', 'diagram', 'team', 'other'
  tags TEXT[],
  
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_presentation_media_company_id ON presentation_media(company_id);
CREATE INDEX idx_presentation_media_category ON presentation_media(category);

-- RLS
ALTER TABLE presentation_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's media"
  ON presentation_media
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );
```

## Slide Structure (JSONB)

Each slide is stored as JSONB with a flexible schema:

```typescript
interface Slide {
  id: string
  type: SlideType
  layout: LayoutType
  content: SlideContent
  styling?: SlideStyling
  animation?: SlideAnimation
}

type SlideType = 
  | 'title'
  | 'content'
  | 'two_column'
  | 'comparison'
  | 'gallery'
  | 'pricing'
  | 'quote_summary'
  | 'before_after'
  | 'team'
  | 'contact'
  | 'custom'

type LayoutType = 
  | 'centered'
  | 'left_align'
  | 'two_column_split'
  | 'image_left'
  | 'image_right'
  | 'full_image'

interface SlideContent {
  title?: string
  subtitle?: string
  body?: string | string[] // Text or bullet points
  image?: string // URL
  images?: string[] // For galleries
  video?: string
  cta?: {
    text: string
    action: 'next_slide' | 'external_link' | 'schedule_call'
    url?: string
  }
  
  // Dynamic data bindings
  data_source?: {
    type: 'lead' | 'quote' | 'company' | 'static'
    field: string // e.g., 'lead.full_name', 'quote.total', 'company.name'
  }[]
}

interface SlideStyling {
  background?: {
    type: 'color' | 'gradient' | 'image'
    value: string
  }
  text_color?: string
  font_family?: string
  font_size?: string
}

interface SlideAnimation {
  entrance?: 'fade' | 'slide' | 'zoom' | 'none'
  duration?: number
}
```

### Example Slide JSON

```json
{
  "id": "slide-1",
  "type": "title",
  "layout": "centered",
  "content": {
    "title": "{{company.name}} Roofing Proposal",
    "subtitle": "Custom Solution for {{lead.full_name}}",
    "image": "https://storage.supabase.co/company-logos/abc123.png"
  },
  "styling": {
    "background": {
      "type": "gradient",
      "value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    "text_color": "#ffffff"
  }
}
```

## TypeScript Types

```typescript
// lib/types/presentations.ts

export type SlideType = 
  | 'title'
  | 'content'
  | 'two_column'
  | 'comparison'
  | 'gallery'
  | 'pricing'
  | 'quote_summary'
  | 'before_after'
  | 'team'
  | 'contact'
  | 'custom'

export type PresentationStatus = 'draft' | 'ready' | 'sent' | 'archived'

export interface Slide {
  id: string
  type: SlideType
  layout: string
  content: Record<string, any>
  styling?: Record<string, any>
  animation?: Record<string, any>
}

export interface PresentationTemplate {
  id: string
  company_id: string | null
  name: string
  description: string | null
  category: string | null
  slides: Slide[]
  is_global: boolean
  is_active: boolean
  usage_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Presentation {
  id: string
  company_id: string
  template_id: string | null
  lead_id: string | null
  quote_id: string | null
  title: string
  description: string | null
  slides: Slide[]
  share_token: string | null
  share_token_created_at: string | null
  share_link_expires_at: string | null
  is_public: boolean
  view_count: number
  last_viewed_at: string | null
  status: PresentationStatus
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PresentationWithRelations extends Presentation {
  lead?: { full_name: string; email: string }
  quote?: { quote_number: string; total: number }
  creator?: { full_name: string }
}

export interface PresentationMedia {
  id: string
  company_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  category: string | null
  tags: string[]
  uploaded_by: string
  created_at: string
  deleted_at: string | null
}
```

## Template Library (Pre-built Slides)

### 1. Title Slide
- Company logo
- Presentation title
- Customer name (dynamic)
- Date

### 2. About Us
- Company overview
- Years in business
- Certifications
- Service area map

### 3. Project Proposal
- Scope of work
- Timeline
- Materials list
- Total cost (from quote)

### 4. Before/After Gallery
- Image carousel
- Project descriptions
- Customer testimonials

### 5. Pricing Comparison
- Side-by-side options
- Feature breakdown
- Recommended choice highlight

### 6. Warranty & Service
- Warranty details
- Maintenance packages
- Emergency contact info

### 7. Financing Options
- Monthly payment calculator
- Financing partners
- Application process

### 8. Contact/Next Steps
- CTA button (Schedule Call)
- Contact information
- Social media links

## Presentation Viewer

### Customer-Facing View
- **Route**: `/present/[token]`
- Full-screen mode (F key)
- Navigation: Arrow keys, swipe (mobile)
- Progress indicator
- Auto-advance option (timer)
- Exit button

### Features
- Responsive design (desktop, tablet, mobile)
- Touch gestures (swipe left/right)
- Keyboard shortcuts
- Print-friendly CSS
- Download as PDF option

### Viewer Controls
```
← → : Navigate slides
F   : Fullscreen toggle
ESC : Exit fullscreen
P   : Print mode
```

## API Functions

```typescript
// lib/api/presentations.ts

import { supabase } from '@/lib/supabase/client'

export async function getPresentations(companyId: string) {
  const { data, error } = await supabase
    .from('presentations')
    .select(`
      *,
      lead:leads(full_name, email),
      quote:quotes(quote_number, total),
      creator:users!presentations_created_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPresentation(data: {
  companyId: string
  templateId?: string
  title: string
  leadId?: string
  quoteId?: string
  userId: string
}) {
  // 1. If template provided, load template slides
  let slides: Slide[] = []
  if (data.templateId) {
    const { data: template } = await supabase
      .from('presentation_templates')
      .select('slides')
      .eq('id', data.templateId)
      .single()
    
    slides = template?.slides || []
  }

  // 2. Create presentation
  const { data: presentation, error } = await supabase
    .from('presentations')
    .insert({
      company_id: data.companyId,
      template_id: data.templateId || null,
      lead_id: data.leadId || null,
      quote_id: data.quoteId || null,
      title: data.title,
      slides,
      status: 'draft',
      created_by: data.userId,
    })
    .select()
    .single()

  if (error) throw error
  return presentation
}

export async function updatePresentationSlides(
  presentationId: string,
  slides: Slide[]
) {
  const { data, error } = await supabase
    .from('presentations')
    .update({ slides })
    .eq('id', presentationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function generateShareLink(presentationId: string) {
  const shareToken = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  const { data, error } = await supabase
    .from('presentations')
    .update({
      share_token: shareToken,
      share_token_created_at: new Date().toISOString(),
      share_link_expires_at: expiresAt.toISOString(),
      is_public: true,
      status: 'sent',
    })
    .eq('id', presentationId)
    .select()
    .single()

  if (error) throw error
  return {
    ...data,
    share_url: `${process.env.NEXT_PUBLIC_APP_URL}/present/${shareToken}`
  }
}

// Increment view count when presentation is viewed
export async function incrementPresentationViews(presentationId: string) {
  const { error } = await supabase.rpc('increment_presentation_views', {
    p_presentation_id: presentationId
  })
  if (error) throw error
}
```

### Database Function for View Tracking

```sql
CREATE OR REPLACE FUNCTION increment_presentation_views(p_presentation_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE presentations
  SET 
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE id = p_presentation_id;
END;
$$;
```

## UI Components

### Component Structure

```
app/
├── (admin)/
│   └── admin/
│       └── presentations/
│           ├── page.tsx                     # Presentations list
│           ├── new/
│           │   └── page.tsx                 # Create new (select template)
│           ├── [id]/
│           │   ├── page.tsx                 # Presentation details
│           │   └── edit/
│           │       └── page.tsx             # Slide editor
│           └── templates/
│               └── page.tsx                 # Browse templates
│
└── (public)/
    └── present/
        └── [token]/
            └── page.tsx                     # Customer-facing viewer

components/admin/presentations/
├── presentation-card.tsx                    # List view card
├── slide-editor/
│   ├── slide-editor.tsx                     # Main editor
│   ├── slide-preview.tsx                    # Live preview
│   ├── slide-blocks/                        # Block components
│   │   ├── title-block.tsx
│   │   ├── text-block.tsx
│   │   ├── image-block.tsx
│   │   ├── gallery-block.tsx
│   │   └── pricing-block.tsx
│   ├── block-toolbar.tsx                    # Add/edit blocks
│   └── styling-panel.tsx                    # Background, colors, fonts
├── template-picker.tsx                      # Select template modal
├── media-library-dialog.tsx                 # Upload/select images
└── share-link-dialog.tsx                    # Generate share link

components/public/
└── presentation-viewer/
    ├── presentation-viewer.tsx              # Main viewer
    ├── slide-renderer.tsx                   # Render slide content
    ├── navigation-controls.tsx              # Arrow buttons, progress
    └── fullscreen-controls.tsx              # Fullscreen UI
```

## Implementation Phases

### Phase 1: Database & Types (1 day)
- [ ] Create tables (`presentation_templates`, `presentations`, `presentation_media`)
- [ ] Set up RLS policies
- [ ] Create TypeScript types
- [ ] Create database functions (view tracking)

### Phase 2: Template Library (1 day)
- [ ] Design 5-8 pre-built templates
- [ ] Create seed data for global templates
- [ ] Build template picker UI
- [ ] Implement template loading

### Phase 3: Slide Editor (2 days)
- [ ] Build block-based editor
- [ ] Implement drag-and-drop reordering
- [ ] Add styling panel (backgrounds, colors)
- [ ] Create media library integration
- [ ] Add data binding ({{lead.name}}, etc.)

### Phase 4: Presentation Viewer (1 day)
- [ ] Build public viewer route
- [ ] Implement slide navigation
- [ ] Add fullscreen mode
- [ ] Create responsive design
- [ ] Add view tracking

### Phase 5: Polish & Features
- [ ] Add keyboard shortcuts
- [ ] Implement print/PDF export
- [ ] Add share link management
- [ ] Create analytics dashboard (views, engagement)
- [ ] Mobile optimizations

## Tech Stack

### Editor Libraries
- **Slate.js** or **Lexical** - Rich text editing
- **react-beautiful-dnd** - Drag and drop
- **react-colorful** - Color picker
- **react-dropzone** - Media uploads

### Viewer Libraries
- **Swiper.js** - Touch-enabled slide navigation
- **Reveal.js** (optional) - Advanced presentation features
- **react-pdf** - PDF export
- **html2canvas** - Slide screenshots

## Integration Points

### Link to Leads
- Create presentation from lead detail page
- Auto-populate lead data (name, address, etc.)

### Link to Quotes
- Pull quote line items, totals
- Display pricing in dedicated slide

### eSign Integration
- Convert presentation to signable contract
- Attach signed PDF to presentation record

## Analytics Dashboard (Optional)

Track presentation performance:
- Total views
- Average time spent
- Completion rate (% who reached last slide)
- Most viewed slides
- Conversion rate (presentation → signed contract)

---

**Status**: Ready for implementation  
**Next Steps**: Review architecture → build database → create templates → implement editor → build viewer
