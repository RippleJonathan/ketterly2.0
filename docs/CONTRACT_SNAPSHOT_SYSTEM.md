# Contract Snapshot System

**Date**: December 13, 2024  
**Status**: ✅ Implemented

## Overview

The contract snapshot system allows estimates to remain editable "living documents" while preserving the original signed contract as an immutable snapshot. This enables flexible change management while maintaining a clear audit trail.

---

## Philosophy

### The Problem with Locking

**Old Approach** (Removed):
- When a quote was signed, it became "locked"
- Edits were blocked or required complex unlocking
- Change tracking was difficult
- Users couldn't update estimates as work progressed

**New Approach** (Current):
- Quotes/estimates are always editable
- When signed, a contract snapshot is created
- Original contract preserved for reference
- Changes calculated by comparing current quote to contract snapshot

---

## Architecture

### Database Tables

#### `signed_contracts`
Point-in-time snapshot of the quote when signed.

```sql
- id (UUID)
- company_id (UUID) - Multi-tenant isolation
- quote_id (UUID) - Reference to original quote
- contract_number (TEXT) - Auto-generated: C-YYYYMMDD-NNN
- contract_date (TIMESTAMP)
- quote_snapshot (JSONB) - Full quote data at signing
- original_total (DECIMAL) - Total amount at signing
- customer_signature_date (TIMESTAMP)
- customer_signature_data (TEXT) - Base64 signature image
- customer_signed_by (TEXT)
- customer_ip_address (TEXT)
- company_signature_date (TIMESTAMP)
- company_signature_data (TEXT)
- company_signed_by (TEXT)
- status (TEXT) - active, voided, superseded
- voided_at (TIMESTAMP)
- voided_reason (TEXT)
```

#### `contract_line_items`
Snapshot of all line items at time of contract signing.

```sql
- id (UUID)
- contract_id (UUID) - References signed_contracts
- category (TEXT)
- description (TEXT)
- quantity (DECIMAL)
- unit (TEXT)
- unit_price (DECIMAL)
- line_total (DECIMAL)
- cost_per_unit (DECIMAL)
- supplier (TEXT)
- notes (TEXT)
- sort_order (INTEGER)
```

---

## Workflow

### 1. Quote Creation & Editing
- User creates quote with line items
- Quote can be edited freely at any time
- Quote status: `draft` → `sent` → `viewed`

### 2. Signing & Contract Creation
- Customer signs quote (digital signature)
- **Trigger**: `create_contract_from_quote()` RPC function is called
- System creates:
  - New `signed_contracts` record with snapshot
  - Multiple `contract_line_items` records (one per line item)
  - Contract number generated: `C-20241213-001`
- Quote status: `accepted`

### 3. Post-Signing Edits
- User can still edit the accepted quote
- Changes are tracked by comparing:
  - Current `quote_line_items` 
  - vs. `contract_line_items` (snapshot)
- System detects:
  - **Added items**: In quote but not in contract
  - **Removed items**: In contract but not in quote
  - **Modified items**: Quantity or price changed

### 4. Change Orders & Invoicing
- **Change Order**: Shows delta between contract and current quote
- **Invoice**: Generated from current quote state (includes all changes)
- Original contract preserved for legal/audit purposes

---

## API Functions

### `lib/api/contracts.ts`

#### `getContractByQuoteId(quoteId: string)`
Fetches the active contract for a quote.

```typescript
const { data: contract } = await getContractByQuoteId(quoteId)
```

#### `getContractWithLineItems(contractId: string)`
Fetches contract with all line items included.

```typescript
const { data: fullContract } = await getContractWithLineItems(contractId)
```

#### `createContractFromQuote(quoteId, signatureData)`
Creates a contract snapshot when quote is accepted.

```typescript
const { data: contract } = await createContractFromQuote(quoteId, {
  customer_signature_date: new Date().toISOString(),
  customer_signature_data: signatureBase64,
  customer_signed_by: "John Doe",
  customer_ip_address: "192.168.1.1"
})
```

#### `compareQuoteToContract(quoteId: string)`
Compares current quote to signed contract, returns changes.

```typescript
const { data: comparison } = await compareQuoteToContract(quoteId)

// Returns:
{
  contract: ContractWithLineItems,
  current_quote: QuoteWithLineItems,
  has_changes: boolean,
  total_change: number, // Dollar difference
  added_items: LineItem[], // New items
  removed_items: ContractLineItem[], // Deleted items
  modified_items: ModifiedItem[] // Changed qty/price
}
```

#### `voidContract(contractId, reason)`
Voids a contract (marks as invalid).

```typescript
await voidContract(contractId, "Customer requested cancellation")
```

---

## UI Components

### Contract Comparison Card

**Location**: Estimates tab, appears when quote is accepted and contract exists

**Features**:
- Shows contract number and signing date
- Three-column display:
  - Original Contract: `$12,500.00`
  - Current Estimate: `$13,750.00`
  - Change: `+$1,250.00` (green if increase, orange if decrease)
- Change summary:
  - ✓ 2 item(s) added
  - - 1 item(s) removed
  - ✎ 3 item(s) modified
- "Generate Change Order" button (when changes exist)

### Action Buttons

**For Accepted Quotes**:
1. **Edit Estimate** - Opens quote form for editing
2. **Generate Change Order** - Creates PDF of changes (when `has_changes = true`)
3. **Generate Invoice** - Creates final invoice from current state
4. **Download PDF** - Downloads current estimate as PDF
5. **Duplicate** - Creates copy of quote

---

## Change Detection Logic

### Added Items
Items in current quote that don't exist in contract:

```typescript
added_items = quote_line_items.filter(quoteItem => 
  !contract_line_items.some(contractItem => 
    contractItem.description === quoteItem.description
  )
)
```

### Removed Items
Items in contract that no longer exist in quote:

```typescript
removed_items = contract_line_items.filter(contractItem =>
  !quote_line_items.some(quoteItem =>
    quoteItem.description === contractItem.description
  )
)
```

### Modified Items
Items that exist in both but with different quantity or price:

```typescript
modified_items = contract_line_items
  .filter(contractItem => {
    const matchingQuote = quote_line_items.find(q => 
      q.description === contractItem.description
    )
    return matchingQuote && (
      matchingQuote.quantity !== contractItem.quantity ||
      matchingQuote.unit_price !== contractItem.unit_price
    )
  })
```

---

## Benefits

### ✅ Flexibility
- Estimates can be updated as work progresses
- No need to unlock or create new versions
- Natural workflow for construction projects

### ✅ Audit Trail
- Original contract preserved forever
- Clear history of what was originally agreed upon
- Changes are tracked automatically

### ✅ Legal Protection
- Signed contract is immutable snapshot
- Digital signatures preserved
- Timestamp and IP address recorded

### ✅ Change Management
- Easy to see what changed from original contract
- Change orders auto-calculated
- No manual tracking needed

### ✅ Client Communication
- Show customers original agreement
- Highlight changes clearly
- Build trust with transparency

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Contract snapshot creation
- ✅ Change detection
- ✅ UI indicators
- ⏳ Change order PDF generation
- ⏳ Invoice PDF generation

### Phase 2 (Future)
- Email change orders to customers
- Customer approval workflow for changes
- Change order versioning
- Material substitution tracking
- Cost variance reporting

### Phase 3 (Future)
- Multiple contract versions (amendments)
- Contract comparison view (side-by-side)
- Change order analytics
- Profit margin impact from changes

---

## Migration History

### Applied Migrations

1. `20241213000006_rollback_estimate_locking.sql`
   - Removed `is_locked` column
   - Removed `needs_new_signature` column
   - Removed `invoice_generated_at` column
   - Removed `invoice_pdf_url` column
   - Dropped auto-lock trigger and function

2. `20241213000007_create_signed_contracts.sql`
   - Created `signed_contracts` table
   - Created `contract_line_items` table
   - Created `generate_contract_number()` function
   - Created `create_contract_from_quote()` RPC function
   - Added RLS policies
   - Added indexes

---

## Testing Checklist

- [ ] Create quote and sign it
- [ ] Verify contract snapshot created in database
- [ ] Edit accepted quote (add item)
- [ ] Verify contract comparison shows "1 item added"
- [ ] Edit accepted quote (remove item)
- [ ] Verify contract comparison shows "1 item removed"
- [ ] Edit accepted quote (change quantity)
- [ ] Verify contract comparison shows "1 item modified"
- [ ] Verify total_change calculation is correct
- [ ] Test change order generation
- [ ] Test invoice generation from modified quote
- [ ] Verify original contract unchanged

---

## Support

For questions or issues with the contract snapshot system, refer to:
- API documentation: `lib/api/contracts.ts`
- UI components: `components/admin/leads/estimates-tab.tsx`
- Database schema: `supabase/migrations/20241213000007_create_signed_contracts.sql`
