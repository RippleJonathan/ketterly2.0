# Material Order Enhancements - Testing Guide

## ✅ Workflow Improvements Complete

### What Was Added

**1. Database Migration** (`20241205000010_add_payment_tracking.sql`)
   - `is_pickup` - Boolean flag for pickup vs delivery
   - `is_paid` - Boolean flag for payment status
   - `payment_date` - Date payment was received
   - `payment_amount` - Amount paid (may differ from total)
   - `payment_method` - Cash, check, credit card, etc.
   - `payment_notes` - Transaction ID, check number, etc.

**2. Status Management**
   - **Smart progression buttons** that appear based on current status:
     * Draft → "Mark as Ordered"
     * Ordered → "Mark as Confirmed"
     * Confirmed → "Mark In Transit" (delivery) or "Mark as Delivered" (pickup)
     * In Transit → "Mark as Delivered"
   - One-click status updates with toast notifications

**3. Pickup/Delivery Toggle**
   - "Change to Pickup" / "Change to Delivery" button
   - Automatically adjusts status flow (pickup skips "in_transit")
   - Shows blue "Pickup" badge when enabled

**4. Payment Tracking**
   - "Mark as Paid" button opens payment dialog
   - Dialog captures:
     * Payment date (defaults to today)
     * Payment amount (defaults to order total)
     * Payment method dropdown
     * Payment notes (check #, transaction ID, etc.)
   - Shows green "Paid" badge when recorded
   - Cannot mark paid multiple times (button disappears)

**5. Visual Badges**
   - **Status badge**: Shows current order status with icon
   - **Pickup badge**: Blue badge when order is pickup
   - **Paid badge**: Green badge when payment recorded

### Testing Steps

**1. Run Migration:**
```sql
-- Copy SQL from: supabase/migrations/20241205000010_add_payment_tracking.sql
-- Paste into Supabase Dashboard → SQL Editor
-- Click "Run"
```

**2. Test Status Progression:**
- Create a new order (starts as "Draft")
- Click "Mark as Ordered" → badge changes to "Ordered"
- Click "Mark as Confirmed" → badge changes to "Confirmed"
- Click "Mark In Transit" → badge changes to "In Transit"
- Click "Mark as Delivered" → badge changes to "Delivered"

**3. Test Pickup Flow:**
- Create an order
- Click "Mark as Ordered"
- Click "Change to Pickup" → see blue "Pickup" badge
- Click "Mark as Confirmed"
- Notice "Mark In Transit" is skipped
- Click "Mark as Delivered" (goes straight from confirmed)

**4. Test Payment Recording:**
- Find an unpaid order
- Click "Mark as Paid"
- Dialog opens with:
  * Payment date (pre-filled with today)
  * Amount (pre-filled with order total)
  * Payment method dropdown
  * Notes field
- Fill in details and click "Record Payment"
- See green "Paid" badge appear
- Notice "Mark as Paid" button disappears

**5. Test Combined Workflow:**
- Create order → Mark Ordered → Change to Pickup → Mark Paid
- Verify all badges show correctly
- Refresh page to ensure data persists

### Features

**Smart Status Flow:**
- ✅ Shows only relevant next-step buttons
- ✅ Pickup orders skip "In Transit" status
- ✅ Can't progress from cancelled status
- ✅ Visual feedback with badges

**Payment Tracking:**
- ✅ Record payment date, amount, method
- ✅ Support for partial payments (different amount)
- ✅ Track payment method (cash, check, card, etc.)
- ✅ Add notes (check numbers, transaction IDs)
- ✅ One-time action (can't duplicate)

**Delivery Method:**
- ✅ Toggle between pickup/delivery anytime
- ✅ Affects available status transitions
- ✅ Visual indicator with badge
- ✅ Can change until delivered

### Payment Methods Supported

- Cash
- Check
- Credit Card
- Wire Transfer
- Company Account
- Other

### UI Improvements

**Order Card Shows:**
- Status badge with icon and color
- Pickup badge (blue) if pickup order
- Paid badge (green) if payment recorded
- Smart action buttons based on current state
- All existing features (PDF, Email, etc.)

**Payment Dialog:**
- Clean, simple form
- Pre-filled with sensible defaults
- Required fields: date, amount, method
- Optional notes field
- Cancel/Submit buttons

### Next Steps

After testing these workflow improvements, we move to:

**Step 4: Calendar/Scheduling System**
- Delivery date calendar view
- Crew scheduling
- Project timeline
- Resource allocation

### Troubleshooting

**If buttons don't appear:**
1. Refresh the page after running migration
2. Check browser console for errors
3. Verify migration ran successfully in Supabase

**If payment dialog doesn't open:**
1. Check for TypeScript errors
2. Verify Dialog component imports
3. Check browser console

**If badges don't show:**
1. Hard refresh (Ctrl+Shift+R)
2. Check order data has new fields
3. Verify types are updated

### Database Schema Updates

```typescript
interface MaterialOrder {
  // ...existing fields...
  
  // New fields
  is_pickup: boolean
  is_paid: boolean
  payment_date: string | null
  payment_amount: number | null
  payment_method: string | null
  payment_notes: string | null
}
```

### API Functions

All updates use standard Supabase client:
- `update({ status: newStatus })` - Status changes
- `update({ is_pickup: !order.is_pickup })` - Toggle pickup
- `update({ is_paid: true, payment_* })` - Record payment

No new API routes needed - uses direct client updates!
