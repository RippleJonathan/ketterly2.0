# Ketterly CRM - Presentation System Implementation Guide

**Created:** December 25, 2024  
**Status:** In Progress  
**Feature:** Sales Presentation Overlay with Interactive Pricing

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Data Flow](#data-flow)
5. [Component Checklist](#component-checklist)
6. [Testing Strategy](#testing-strategy)

---

## 🎯 Overview

The Presentation System allows sales reps to deliver professional, branded presentations directly from the CRM. It features:

- **Dynamic Slide Generation:** Pulls customer data, estimates, and measurements in real-time
- **Interactive Pricing:** Good/Better/Best selection with live price updates
- **Conditional Flows:** Different slide sequences for Retail vs Insurance presentations
- **Seamless Signing:** Transitions directly from presentation to contract signing
- **Full-Screen Overlay:** Professional presentation mode with Swiper.js navigation

### User Journey

```
Rep clicks "Present" button
  ↓
Modal appears: Select template + flow type + estimates
  ↓
System compiles presentation deck (JSON)
  ↓
Full-screen overlay opens with slides
  ↓
Customer reviews slides, rep navigates
  ↓
Customer selects pricing option (if retail)
  ↓
Rep clicks "Sign Agreement" button
  ↓
Signature modal opens on top of presentation
  ↓
Customer signs → Presentation marks as completed
```

---

## 🏗️ System Architecture

### Database Schema

```
presentation_templates (templates for retail/insurance)
  ↓ has many
presentation_slides (individual slides with content)
  ↓ references
presentation_media (uploaded images/videos)

When presenting:
  ↓ creates
presentation_sessions (tracks active presentation)
  ↓ compiles
PresentationDeck (JSON sent to frontend)
```

### Frontend Architecture

```
Admin Settings Page
  ├── Template Builder
  ├── Slide Editor (drag-and-drop)
  └── Media Library

Lead Detail Page → Estimates Tab
  └── "Present" Button
      ↓ opens
  PresentModal (configure presentation)
      ↓ starts
  PresentationOverlay (full-screen viewer)
      ├── SlideRenderer (dynamic based on type)
      │   ├── StaticSlide
      │   ├── PricingGridSlide ⭐
      │   ├── CustomerInfoSlide
      │   ├── PhotoGallerySlide
      │   └── ClosingSlide
      └── ActionButton (triggers contract/contingency)
```

---

## 🔄 Implementation Phases

### ✅ Phase 0: Foundation (COMPLETED)

- [x] Database migration created
- [x] TypeScript types defined
- [x] Present modal UI created
- [x] Swiper.js installed

---

### 📍 Phase 1: Core Presentation Engine (NEXT - Build Order)

**Goal:** Get the basic presentation overlay working with static slides

#### 1.1 Database Setup

- [ ] **Run Migration** (`20241225000001_create_presentation_system.sql`)
  ```bash
  # Copy SQL to Supabase Dashboard → SQL Editor
  # Or use run-migration.js if available
  ```

- [ ] **Seed Basic Template** (Create via SQL or admin UI)
  ```sql
  INSERT INTO presentation_templates (company_id, name, description, flow_type, is_active)
  VALUES (
    '<your-company-id>',
    'Default Retail Presentation',
    'Standard retail flow with Good/Better/Best options',
    'retail',
    true
  );
  
  -- Add sample slides (company info, pricing grid, closing)
  ```

#### 1.2 API Layer

**File:** `lib/api/presentations.ts`

Functions needed:
- [ ] `getPresentationTemplates(companyId)` - List available templates
- [ ] `getPresentationDeck(templateId, leadId, flowType, estimateIds)` - Compile deck
- [ ] `createPresentationSession(data)` - Start presentation
- [ ] `updatePresentationSession(sessionId, updates)` - Track selections
- [ ] `completePresentationSession(sessionId)` - Mark as done

**Dependencies:** None  
**Estimated Time:** 2-3 hours

---

#### 1.3 React Query Hooks

**File:** `lib/hooks/use-presentations.ts`

Hooks needed:
- [ ] `usePresentationTemplates(companyId)` - Fetch templates
- [ ] `useCreatePresentationSession()` - Start presentation mutation
- [ ] `useUpdatePresentationSession()` - Update selection mutation

**Dependencies:** API layer  
**Estimated Time:** 1 hour

---

#### 1.4 Presentation Overlay Component

**File:** `components/admin/presentations/presentation-overlay.tsx`

Features:
- [ ] Full-screen container (z-index: 9999)
- [ ] Swiper.js integration (horizontal navigation)
- [ ] Exit button (top-right corner)
- [ ] Progress indicator (slide X of Y)
- [ ] State management for current slide
- [ ] Keyboard navigation (arrow keys)

**Dependencies:** React Query hooks  
**Estimated Time:** 3-4 hours

**Key Code Structure:**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

interface PresentationOverlayProps {
  deck: PresentationDeck
  sessionId: string
  onClose: () => void
  onComplete: () => void
}

export function PresentationOverlay({ deck, sessionId, onClose, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null)
  
  // Swiper config, slide rendering, action handlers
}
```

---

#### 1.5 Basic Slide Renderers

**Files:**
- `components/admin/presentations/slides/static-slide.tsx`
- `components/admin/presentations/slides/customer-info-slide.tsx`
- `components/admin/presentations/slides/company-info-slide.tsx`

Each renderer receives:
```tsx
interface SlideProps {
  slide: CompiledSlide
  customerData: CustomerData
  deck: PresentationDeck
}
```

**Dependencies:** Presentation overlay  
**Estimated Time:** 2-3 hours (for 3 basic types)

---

#### 1.6 Integrate Present Button in Estimates Tab

**File:** `app/(admin)/admin/leads/[id]/page.tsx` or estimates tab component

Add:
- [ ] "Present" button in estimates section
- [ ] Click handler to open modal
- [ ] Load available templates on mount
- [ ] Pass estimates to modal

**Dependencies:** Present modal, API hooks  
**Estimated Time:** 1 hour

---

### Phase 2: Interactive Pricing Grid ⭐ (CRITICAL)

**Goal:** Build the Good/Better/Best selection system

#### 2.1 Pricing Grid Slide Component

**File:** `components/admin/presentations/slides/pricing-grid-slide.tsx`

Features:
- [ ] 3-column layout (Good | Better | Best)
- [ ] Map estimates to columns
- [ ] Highlight selected option
- [ ] Click to select
- [ ] Show price breakdown
- [ ] Visual feedback (border, shadow, checkmark)

**State Management:**
```tsx
interface PricingGridState {
  options: {
    good?: EstimateData
    better?: EstimateData
    best?: EstimateData
  }
  selected: PricingOption
  highlighted: PricingOption | null
}
```

**Dependencies:** Presentation overlay  
**Estimated Time:** 4-5 hours

---

#### 2.2 Selection Persistence

Connect pricing grid selection to session:
- [ ] `updatePresentationSession()` called on selection change
- [ ] `selected_estimate_id` and `selected_option` updated in DB
- [ ] State synced with backend

**Dependencies:** Pricing grid, API hooks  
**Estimated Time:** 1-2 hours

---

#### 2.3 Dynamic Action Button

Update action button to use selected option:
- [ ] Button label updates: "Sign Agreement for Best Package ($19,000)"
- [ ] Button disabled until selection made
- [ ] Passes `selected_estimate_id` to contract flow

**Dependencies:** Pricing grid  
**Estimated Time:** 1 hour

---

### Phase 3: Contract Integration

**Goal:** Connect presentation to existing signature system

#### 3.1 Action Button Types

**File:** `components/admin/presentations/action-button.tsx`

Handle different button types:
- [ ] `trigger_contract` - Open contract modal with selected estimate
- [ ] `trigger_contingency` - Open contingency authorization (insurance)
- [ ] `next_slide` - Just navigate forward
- [ ] `link_external` - Open external URL

**Dependencies:** Pricing grid  
**Estimated Time:** 2-3 hours

---

#### 3.2 Contract Modal Integration

Reuse existing contract/quote signing:
- [ ] Import existing signature modal
- [ ] Pass `selected_estimate_id` to contract generation
- [ ] Keep presentation open while signing
- [ ] Mark session as completed on signature success

**Dependencies:** Action button, existing signature system  
**Estimated Time:** 2-3 hours

---

### Phase 4: Admin Builder UI

**Goal:** Let admins create and edit presentation templates

#### 4.1 Settings Page Route

**File:** `app/(admin)/admin/settings/presentations/page.tsx`

Features:
- [ ] List all templates
- [ ] Create new template button
- [ ] Edit/delete templates
- [ ] Activate/deactivate toggle

**Dependencies:** API hooks  
**Estimated Time:** 2-3 hours

---

#### 4.2 Template Editor

**File:** `components/admin/settings/presentations/template-editor.tsx`

Features:
- [ ] Template name/description
- [ ] Flow type selector (retail/insurance/both)
- [ ] Slide list with drag-and-drop reordering
- [ ] Add slide button
- [ ] Delete slide button

**Dependencies:** Settings page  
**Estimated Time:** 4-5 hours

---

#### 4.3 Slide Editor Dialog

**File:** `components/admin/settings/presentations/slide-editor-dialog.tsx`

Features:
- [ ] Slide type selector
- [ ] Content editor (varies by type)
  - Static: Rich text editor
  - Pricing: Column mapping
  - Customer Info: Field selector
  - Photo Gallery: Image uploader
- [ ] Conditional display toggles (retail/insurance)
- [ ] Action button configuration

**Dependencies:** Template editor  
**Estimated Time:** 6-8 hours (most complex component)

---

#### 4.4 Media Library

**File:** `components/admin/settings/presentations/media-library.tsx`

Features:
- [ ] Upload images/videos
- [ ] Browse uploaded media
- [ ] Delete media
- [ ] Insert into slides

**Dependencies:** Supabase Storage  
**Estimated Time:** 3-4 hours

---

### Phase 5: Advanced Slide Types

**Goal:** Complete remaining slide renderers

#### 5.1 Photo Gallery Slide

**File:** `components/admin/presentations/slides/photo-gallery-slide.tsx`

Features:
- [ ] Slideshow of uploaded images
- [ ] Auto-advance or manual navigation
- [ ] Captions

**Dependencies:** Presentation overlay  
**Estimated Time:** 2-3 hours

---

#### 5.2 Video Slide

**File:** `components/admin/presentations/slides/video-slide.tsx`

Features:
- [ ] Embed YouTube/Vimeo
- [ ] Direct video playback
- [ ] Auto-play option

**Dependencies:** Presentation overlay  
**Estimated Time:** 2 hours

---

#### 5.3 Measurement Data Slide

**File:** `components/admin/presentations/slides/measurement-slide.tsx`

Features:
- [ ] Display roof measurements
- [ ] Show square footage breakdown
- [ ] Visual diagrams (if available)

**Dependencies:** Presentation overlay, measurement data structure  
**Estimated Time:** 3-4 hours

---

### Phase 6: Polish & Production

#### 6.1 Transitions & Animations

- [ ] Slide transitions (fade, slide)
- [ ] Button hover effects
- [ ] Selection animations
- [ ] Loading states

**Estimated Time:** 2-3 hours

---

#### 6.2 Mobile Responsiveness

- [ ] Touch navigation
- [ ] Responsive layouts for all slides
- [ ] Mobile-friendly pricing grid

**Estimated Time:** 3-4 hours

---

#### 6.3 Analytics & Tracking

- [ ] Track slides viewed
- [ ] Time spent per slide
- [ ] Selection changes (A/B testing)
- [ ] Completion rate

**Estimated Time:** 2-3 hours

---

## 📊 Data Flow

### Starting a Presentation

```
1. User clicks "Present" button
   ↓
2. Load available templates and estimates
   ↓
3. User selects template, flow type, estimates
   ↓
4. Call API: createPresentationSession()
   ↓
5. Backend calls: get_presentation_deck()
   ↓
6. Returns compiled JSON deck
   ↓
7. Frontend opens PresentationOverlay with deck
```

### During Presentation

```
1. User navigates slides (Swiper.js)
   ↓
2. Slides render dynamically based on type
   ↓
3. On pricing slide: customer selects option
   ↓
4. Call API: updatePresentationSession()
   ↓
5. Update selected_estimate_id in session
   ↓
6. Action button label updates
```

### Completing Presentation

```
1. User clicks action button (e.g., "Sign Agreement")
   ↓
2. If trigger_contract:
   - Open contract modal
   - Pre-fill with selected_estimate_id
   - Customer signs
   ↓
3. On signature success:
   - Call API: completePresentationSession()
   - Mark status = 'completed'
   - Set contract_signed = true
   ↓
4. Close presentation overlay
   ↓
5. Redirect to signed contract/quote
```

---

## ✅ Component Checklist

### Database & Backend

- [ ] Run migration (20241225000001)
- [ ] Seed basic template
- [ ] API routes for presentations
- [ ] React Query hooks

### Core Presentation

- [ ] Presentation overlay component
- [ ] Swiper.js integration
- [ ] Static slide renderer
- [ ] Customer info slide renderer
- [ ] Company info slide renderer

### Interactive Pricing

- [ ] Pricing grid slide component
- [ ] Selection state management
- [ ] Session update on selection
- [ ] Dynamic action button

### Contract Integration

- [ ] Action button component
- [ ] Contract modal integration
- [ ] Contingency flow (insurance)
- [ ] Session completion

### Admin UI

- [ ] Settings page route
- [ ] Template list/CRUD
- [ ] Template editor
- [ ] Slide editor dialog
- [ ] Media library

### Advanced Slides

- [ ] Photo gallery slide
- [ ] Video slide
- [ ] Measurement data slide

### Polish

- [ ] Transitions/animations
- [ ] Mobile responsive
- [ ] Analytics tracking

---

## 🧪 Testing Strategy

### Unit Tests

- API functions (mock Supabase)
- Slide renderers (mock data)
- State management (pricing selection)

### Integration Tests

- Full presentation flow (template → session → completion)
- Contract signing from presentation
- Session persistence

### E2E Tests (Playwright)

1. **Retail Flow:**
   - Create 3 estimates
   - Click "Present"
   - Select retail template
   - Navigate slides
   - Select "Better" option
   - Sign contract
   - Verify session marked as completed

2. **Insurance Flow:**
   - Click "Present"
   - Select insurance template
   - Navigate slides
   - Sign contingency
   - Verify session completed

3. **Admin Builder:**
   - Create new template
   - Add slides
   - Upload media
   - Activate template
   - Use in presentation

---

## 🎯 Recommended Build Order

Based on dependencies and user value:

1. **Phase 1.1-1.3:** Database + API + Hooks (2-4 hours)
2. **Phase 1.4:** Presentation Overlay skeleton (3-4 hours)
3. **Phase 1.5:** Basic slide renderers (2-3 hours)
4. **Phase 1.6:** Integrate Present button (1 hour)
   - **CHECKPOINT:** Can start basic presentation ✅
5. **Phase 2.1-2.2:** Pricing grid + selection (5-7 hours)
6. **Phase 2.3:** Dynamic action button (1 hour)
   - **CHECKPOINT:** Interactive pricing works ✅
7. **Phase 3.1-3.2:** Contract integration (4-6 hours)
   - **CHECKPOINT:** End-to-end flow complete ✅
8. **Phase 4.1-4.4:** Admin builder UI (15-20 hours)
   - **CHECKPOINT:** Admins can build templates ✅
9. **Phase 5:** Advanced slides (7-9 hours)
10. **Phase 6:** Polish (7-10 hours)

**Total Estimated Time:** 47-66 hours (~1-2 weeks)

---

## 📝 Notes

### Variable Replacement

Customer data can be injected into slides using these variables:

```
{{customer.name}}
{{customer.email}}
{{customer.phone}}
{{customer.address}}
{{customer.city}}, {{customer.state}} {{customer.zip}}
```

Implementation in slide renderer:

```tsx
function replaceVariables(content: string, customerData: CustomerData): string {
  return content
    .replace(/\{\{customer\.name\}\}/g, customerData.name)
    .replace(/\{\{customer\.email\}\}/g, customerData.email || '')
    // ... etc
}
```

### Swiper.js Configuration

```tsx
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Keyboard } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

<Swiper
  modules={[Navigation, Pagination, Keyboard]}
  navigation
  pagination={{ clickable: true }}
  keyboard={{ enabled: true }}
  onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
>
  {deck.slides.map((slide, index) => (
    <SwiperSlide key={slide.id}>
      <SlideRenderer slide={slide} deck={deck} />
    </SwiperSlide>
  ))}
</Swiper>
```

### Good/Better/Best Mapping

When user selects 3 estimates:

```tsx
const mapEstimatesToOptions = (estimates: EstimateData[]) => {
  // Sort by total price
  const sorted = [...estimates].sort((a, b) => a.total - b.total)
  
  return {
    good: sorted[0],    // Lowest price
    better: sorted[1],  // Middle price
    best: sorted[2]     // Highest price
  }
}
```

If only 1 or 2 estimates, show only those options.

---

## 🚀 Getting Started

**Next Step:** Run the database migration, then build Phase 1.1-1.3 (Database + API layer)

```bash
# 1. Copy migration SQL to Supabase Dashboard
# 2. Create API functions in lib/api/presentations.ts
# 3. Create React Query hooks in lib/hooks/use-presentations.ts
# 4. Test with basic queries
```

**Questions Before Starting:**
- Should we create seed data for a default template?
- Do you want analytics tracking from the start?
- Any specific brand colors/styling for the overlay?
