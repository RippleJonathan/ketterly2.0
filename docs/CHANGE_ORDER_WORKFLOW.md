# Change Order Dual-Signature Workflow

## Overview

The change order system now supports **flexible dual-signature workflow** where either the company or customer can sign first. The workflow only completes when both parties have signed.

## Status Flow

### Status Progression

```
pending
  ↓
  ├─→ sent (after "Send to Customer" OR company signs first)
  │     ↓
  │     ├─→ pending_company_signature (customer signs via email)
  │     │     ↓
  │     │     └─→ approved (company signs via "Approve Change Order")
  │     │
  │     └─→ approved (customer signs after company signed)
  │
  └─→ approved (both signatures present)
```

### Status Definitions

- **pending**: Change order generated, no signatures
- **sent**: Either sent to customer OR company signed (waiting for customer signature)
- **pending_company_signature**: Customer signed, waiting for company approval
- **approved**: Both parties signed, contract updated

## Workflow Paths

### Path A: Company Signs First (In-Person Tablet)

1. **Generate change order** (status: `pending`)
   - User clicks "Generate Change Order"
   - Change order created with pricing breakdown
   - Shows: Original Contract Price, Current Estimate, Change Amount

2. **Company signs** (status: `pending` → `sent`)
   - User clicks "Sign Now" button
   - Signature dialog appears
   - Company rep signs on tablet
   - System saves `company_signature_data`, `company_signer_name`, `company_signer_title`
   - Status changes to `sent` (waiting for customer)
   - UI shows: ✅ Company Signed, ⏳ Customer Signature Pending

3. **Send to customer** (status: `sent`)
   - User clicks "Send to Customer"
   - Email sent with signature link
   - Customer receives "Change Order Requires Your Signature" email

4. **Customer signs via email** (status: `sent` → `approved`)
   - Customer clicks link in email
   - Signs change order
   - System detects company already signed
   - Status changes to `approved`
   - Creates contract revision (via `create_contract_for_quote` RPC)
   - Updates quote totals (subtotal, tax, total)
   - Sends "Change Order Fully Executed" email to both parties
   - UI shows: ✅ Company Signed, ✅ Customer Signed
   - 4th column appears: "New Contract Price"

### Path B: Customer Signs First (Traditional Email)

1. **Generate change order** (status: `pending`)
   - Same as Path A

2. **Send to customer** (status: `pending` → `sent`)
   - User clicks "Send to Customer"
   - Status changes to `sent`
   - Email sent with signature link
   - UI shows: ⏳ Customer Signature Pending, ⏳ Company Signature Pending

3. **Customer signs via email** (status: `sent` → `pending_company_signature`)
   - Customer clicks link in email
   - Signs change order
   - System saves `customer_signature_data`, `customer_signer_name`, `customer_signed_at`
   - System detects company hasn't signed yet
   - Status changes to `pending_company_signature`
   - Returns message: "Waiting for company signature"
   - UI shows: ✅ Customer Signed, ⏳ Company Signature Pending

4. **Company approves** (status: `pending_company_signature` → `approved`)
   - User clicks "Approve Change Order"
   - Signature dialog appears
   - Company rep signs
   - System detects customer already signed
   - Status changes to `approved`
   - Creates contract revision
   - Updates quote totals
   - Sends "Change Order Fully Executed" email
   - UI shows: ✅ Company Signed, ✅ Customer Signed
   - 4th column appears: "New Contract Price"

## UI Components

### Pricing Display (3 or 4 columns)

**Before Approval (3 columns):**
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ Original Contract   │ Current Estimate    │ Change Amount       │
│ $15,000.00          │ $18,500.00          │ +$3,500.00          │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

**After Approval (4 columns):**
```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Original Contract   │ Current Estimate    │ Change Amount       │ New Contract Price  │
│ $15,000.00          │ $18,500.00          │ +$3,500.00          │ $18,500.00          │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

### Signature Status Indicators

```tsx
<div className="flex items-center gap-3">
  {/* Customer Signature */}
  {changeOrder.customer_signature_data ? (
    <div className="flex items-center gap-1 text-green-600">
      <CheckCircle className="h-3 w-3" />
      <span className="text-xs">Customer Signed</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-gray-400">
      <AlertCircle className="h-3 w-3" />
      <span className="text-xs">Customer Signature Pending</span>
    </div>
  )}

  {/* Company Signature */}
  {changeOrder.company_signature_data ? (
    <div className="flex items-center gap-1 text-green-600">
      <CheckCircle className="h-3 w-3" />
      <span className="text-xs">Company Signed</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-gray-400">
      <AlertCircle className="h-3 w-3" />
      <span className="text-xs">Company Signature Pending</span>
    </div>
  )}
</div>
```

### Action Buttons

**Status: `pending`**
- ✅ Sign Now (company)
- ✅ Send to Customer
- ✅ Download PDF
- ❌ Approve Change Order (disabled)

**Status: `sent` (company signed, waiting for customer)**
- ✅ Sign Now (company can re-sign if needed)
- ✅ Send to Customer (resend email)
- ✅ Download PDF
- ❌ Approve Change Order (disabled - waiting for customer)

**Status: `pending_company_signature` (customer signed, waiting for company)**
- ✅ Approve Change Order (company signs to complete)
- ✅ Download PDF
- ❌ Send to Customer (already sent)

**Status: `approved`**
- ✅ Download PDF
- ❌ All other buttons hidden

## API Endpoints

### `POST /api/change-orders/[id]/approve`
**Purpose**: Company signature endpoint (internal, requires auth)

**Request Body**:
```json
{
  "signer_name": "John Smith",
  "signer_title": "Project Manager",
  "signature_data": "data:image/png;base64,..."
}
```

**Logic**:
1. Verify user is authenticated
2. Check change order status is `pending`, `sent`, or `pending_company_signature`
3. Check if customer has already signed (`customer_signature_data`)
4. Save company signature
5. If customer signed → set status to `approved`, create contract, send email
6. If customer not signed → set status to `sent`, return early

**Response** (waiting for customer):
```json
{
  "success": true,
  "message": "Company signature saved. Waiting for customer signature.",
  "status": "sent"
}
```

**Response** (approved):
```json
{
  "success": true,
  "message": "Change order approved successfully",
  "status": "approved"
}
```

### `POST /api/change-orders/sign`
**Purpose**: Customer signature endpoint (public, no auth required)

**Request Body**:
```json
{
  "share_token": "abc123...",
  "signer_name": "Jane Doe",
  "signature_data": "data:image/png;base64,..."
}
```

**Logic**:
1. Find change order by `share_token`
2. Verify link hasn't expired
3. Check status is `sent` or `pending`
4. Check if company has already signed (`company_signature_data`)
5. Save customer signature
6. If company signed → set status to `approved`, create contract, send email
7. If company not signed → set status to `pending_company_signature`, return early

**Response** (waiting for company):
```json
{
  "success": true,
  "message": "Change order signed successfully. Waiting for company signature.",
  "status": "pending_company_signature"
}
```

**Response** (approved):
```json
{
  "success": true,
  "message": "Change order signed successfully",
  "status": "approved"
}
```

## Database Schema

### `change_orders` Table

**Signature Columns**:
```sql
-- Customer signature
customer_signature_data TEXT
customer_signer_name TEXT
customer_signed_at TIMESTAMPTZ

-- Company signature
company_signature_data TEXT
company_signer_name TEXT
company_signer_title TEXT
company_signature_date TIMESTAMPTZ

-- Approval tracking
approved_at TIMESTAMPTZ
approved_by UUID REFERENCES users(id)
```

**Status Column**:
```sql
status TEXT CHECK (status IN (
  'pending',                    -- Generated, no signatures
  'sent',                        -- Sent to customer OR company signed
  'pending_company_signature',   -- Customer signed, waiting for company
  'approved'                     -- Both signatures present
))
```

### Contract Price Tracking (Migration Required)

**Migration**: `20241215000002_add_change_order_buttons_and_tracking.sql`

**Columns Added to `signed_contracts`**:
```sql
ALTER TABLE signed_contracts
ADD COLUMN original_contract_price NUMERIC(10,2) NOT NULL,
ADD COLUMN current_contract_price NUMERIC(10,2) NOT NULL;
```

**Trigger**: Automatically updates `current_contract_price` when change order approved

**Function**: `update_contract_price_on_change_order()`

## Email Templates

### 1. Change Order Requires Your Signature
**Sent**: When company clicks "Send to Customer" OR company signs first
**To**: Customer
**From**: Company rep or company name
**Content**:
- Change order number
- Amount change
- Description
- "Review & Sign" button → signature link
- Company branding (logo, colors)

### 2. Change Order Fully Executed
**Sent**: When BOTH signatures collected (status → `approved`)
**To**: Customer (with cc to company)
**From**: Company
**Content**:
- Change order approved confirmation
- New contract total
- Both signatures included
- Download link
- Company branding

## React Query Cache Management

**After any change order action**, invalidate these queries:

```typescript
queryClient.invalidateQueries({ queryKey: ['quote-change-orders', quote.id] })
queryClient.invalidateQueries({ queryKey: ['contract-comparison', quote.id] })
queryClient.invalidateQueries({ queryKey: ['lead-financials', lead.id] })
```

**Benefits**:
- ✅ Instant UI updates
- ✅ No page reloads
- ✅ Consistent data across tabs
- ✅ Signature status updates immediately

## Testing Checklist

### Test Path A (Company Signs First)

- [ ] Generate change order → status is `pending`
- [ ] Company signs → status changes to `sent`
- [ ] UI shows "Company Signed" ✅, "Customer Pending" ⏳
- [ ] Send to customer → email received
- [ ] Customer signs via email → status changes to `approved`
- [ ] UI shows both signed ✅ ✅
- [ ] 4th column "New Contract Price" appears
- [ ] Contract revision created
- [ ] Quote totals updated
- [ ] "Fully Executed" email sent
- [ ] No page reload required

### Test Path B (Customer Signs First)

- [ ] Generate change order → status is `pending`
- [ ] Send to customer → status changes to `sent`
- [ ] Customer signs via email → status changes to `pending_company_signature`
- [ ] UI shows "Customer Signed" ✅, "Company Pending" ⏳
- [ ] Company clicks "Approve Change Order" → signature dialog
- [ ] Company signs → status changes to `approved`
- [ ] UI shows both signed ✅ ✅
- [ ] 4th column "New Contract Price" appears
- [ ] Contract revision created
- [ ] Quote totals updated
- [ ] "Fully Executed" email sent
- [ ] No page reload required

### Edge Cases

- [ ] Company tries to sign again when already signed → should allow (can update)
- [ ] Customer tries to sign expired link → error message
- [ ] Customer tries to sign already approved change order → error message
- [ ] Email fails to send → change order still processes (doesn't block)
- [ ] Contract creation fails → change order still approved (logged error)
- [ ] Multiple browser tabs open → all update automatically (React Query)

## Known Issues & Future Enhancements

### Current Temporary Solutions

**PDF Download**:
- ✅ Currently redirects to `/admin/leads/[id]/financials` tab
- ⏳ Need to implement proper PDF generation utility
- Possible approaches:
  - Use existing PDF generation endpoint
  - Create new `generateChangeOrderPDF` utility
  - Copy from quote/contract PDF generation

### Future Enhancements

**Resend Functionality**:
- Add "Resend to Customer" button for change orders in `sent` status
- Updates `sent_at` timestamp
- Useful if customer didn't receive email

**Activity Log**:
- Track signature events in activity feed
- Show who signed when
- Email sent/received events

**Email Preview**:
- Show email preview before sending
- Edit message text
- Customize subject line

**Tooltips & Help**:
- Add tooltips explaining dual-signature workflow
- Help text: "Either party can sign first"
- Status explanations

**Manual Share Link**:
- "Copy Signature Link" button
- For manual sharing via text/phone

## Files Modified

### UI Components
- `components/admin/leads/estimates-tab.tsx` - Main change order display
- `components/admin/shared/document-signature-dialog.tsx` - Signature capture

### API Endpoints
- `app/api/change-orders/[id]/approve/route.ts` - Company signing
- `app/api/change-orders/sign/route.ts` - Customer signing (public)
- `app/api/change-orders/send/route.ts` - Email sending

### Email System
- `lib/email/notifications.ts` - Email templates

### Migrations
- `supabase/migrations/20241215000002_add_change_order_buttons_and_tracking.sql`

## Migration Instructions

**Status**: ⏳ Created, not yet run

**How to Run**:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20241215000002_add_change_order_buttons_and_tracking.sql`
4. Paste into editor
5. Click "Run"
6. Verify:
   - `signed_contracts` table has new columns
   - Trigger function created
   - Existing contracts backfilled

**What it Does**:
- Adds `original_contract_price` column (immutable snapshot)
- Adds `current_contract_price` column (updates with change orders)
- Creates trigger to auto-update on approval
- Backfills existing contracts with their original total

## Conclusion

The change order system now provides a seamless dual-signature workflow that:

✅ Supports flexible signing order (either party first)  
✅ Shows clear signature status indicators  
✅ Updates UI instantly without page reloads  
✅ Sends professional branded emails  
✅ Tracks contract price changes  
✅ Creates contract revisions automatically  
✅ Provides excellent UX on mobile and desktop  

**Next Steps**: Run migration, test both workflow paths, implement PDF download.
