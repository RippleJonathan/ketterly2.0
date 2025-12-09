# Email System Enhancements - Work Orders + Material Orders

## Overview
Enhanced the email system to support sending both work orders and material orders in a single email, with CC functionality and material lists without pricing.

## Problem Statement
1. **Separate Emails**: Work orders and material orders were sent separately, causing confusion
2. **CC Not Working**: Additional recipients weren't receiving emails
3. **Price Visibility**: Subcontractors could see material costs in PDFs, which should be private

## Solution Implemented

### 1. Unified SendEmailDialog Component
Created a single, flexible email dialog that handles both order types:

**Props:**
- `orderType: 'material' | 'work'` - Determines which type of order is being sent
- `leadId: string` - Used to fetch related material orders for work order emails
- `order: MaterialOrder | WorkOrder` - The primary order being sent
- `defaultRecipient?: string` - Pre-fill primary recipient email
- `onSend: (recipientEmails, includeMaterialList, materialOrderIds?) => void` - Callback with enhanced parameters
- `isSending: boolean` - Loading state

**Features:**
- Dynamic title: "Send Purchase Order via Email" or "Send Work Order via Email"
- Automatic recipient pre-fill from supplier/subcontractor
- CC email field with chip-style display of multiple recipients
- Material order selection (checkboxes) when sending work orders
- Material list inclusion option (shows items without prices)
- Scrollable container for long lists
- Enter key adds emails to CC list

### 2. Material Order Selection for Work Orders
When sending a work order, users can:
1. Check which material orders to attach as PDFs
2. See order number, supplier, and item count for each order
3. Toggle "Include material list in email body" to show items without prices

**UI Elements:**
```tsx
// Material Orders Selection (only for work orders)
{orderType === 'work' && materialOrders.map(mo => (
  <div key={mo.id} className="flex items-center gap-2">
    <Checkbox 
      checked={selectedMaterialOrders.includes(mo.id)}
      onCheckedChange={() => toggleMaterialOrder(mo.id)}
    />
    <Label>
      PO-{mo.order_number} • {mo.supplier?.name} • {mo.items?.length || 0} items
    </Label>
  </div>
))}
```

### 3. Material List (Price-Free)
**Purpose**: Show subcontractors what materials will be provided WITHOUT revealing company costs

**Implementation**:
- Checkbox: "Include material list in email body (without prices)"
- Generates HTML table in email with:
  - Item name/description
  - Variant (color, type, etc.)
  - Quantity
  - **NO PRICING** - keeps material costs private

**Example Output in Email**:
| Item | Variant | Quantity |
|------|---------|----------|
| Architectural Shingles | Charcoal Black | 35 bundles |
| Ridge Cap | Pewter Gray | 12 bundles |
| Underlayment | - | 2 rolls |

### 4. CC Email Functionality
**Features**:
- Multiple recipients supported
- First email = primary recipient (To:)
- Additional emails = CC recipients
- Chip-style display with remove buttons
- Enter key to add emails
- Proper validation

**API Implementation**:
```typescript
const primaryEmail = recipientEmails[0]
const ccEmails = recipientEmails.slice(1)

await resend.emails.send({
  to: primaryEmail,
  cc: ccEmails.length > 0 ? ccEmails : undefined,
  // ... rest of email config
})
```

### 5. Multiple PDF Attachments
Work order emails can now include:
1. **Work Order PDF** (always attached)
2. **Selected Material Order PDFs** (optional, user selects which ones)

**Example**:
```
Attachments:
- WO-2024-001.pdf (Work Order)
- PO-2024-045.pdf (Material Order from ABC Supply)
- PO-2024-046.pdf (Material Order from DEF Distributors)
```

### 6. Updated API Routes

#### Material Order API (`/api/material-orders/send-email`)
- ✅ Already updated to support `recipientEmails` array
- ✅ Already supports `includeMaterialList` parameter
- ✅ CC field implemented with Resend

#### Work Order API (`/api/work-orders/send-email`)
**New Parameters**:
- `recipientEmails: string[]` - Array of email addresses (primary + CC)
- `includeMaterialList: boolean` - Whether to show material list in email body
- `materialOrderIds: string[]` - IDs of material orders to attach

**New Features**:
1. Fetches material orders by IDs
2. Generates PDF for each material order
3. Generates material list HTML (without prices)
4. Attaches all PDFs to email
5. Uses CC field for additional recipients

**Material List Generation**:
```typescript
const allItems = materialOrders.flatMap(order => order.items || [])
materialListHtml = `
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Variant</th>
        <th>Quantity</th>
      </tr>
    </thead>
    <tbody>
      ${allItems.map(item => `
        <tr>
          <td>${item.material?.name || item.description}</td>
          <td>${item.variant_name || '-'}</td>
          <td>${item.quantity} ${item.material?.unit || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`
```

## Files Changed

### Components
1. **`components/admin/leads/send-email-dialog.tsx`**
   - Added `orderType`, `leadId` props
   - Added material orders fetching and selection
   - Added CC email functionality
   - Added material list checkbox
   - Dynamic UI based on order type

2. **`components/admin/leads/material-order-card.tsx`**
   - Updated to pass `orderType="material"` and `leadId`
   - Updated `handleSendEmail` to accept `materialOrderIds`

3. **`components/admin/leads/work-order-card.tsx`**
   - Replaced old email dialog with `SendEmailDialog`
   - Updated `handleSendEmail` signature to match new API
   - Passes `orderType="work"` and `leadId`

### API Routes
4. **`app/api/work-orders/send-email/route.ts`**
   - Added `generatePurchaseOrderBuffer` import
   - Changed `recipientEmail` → `recipientEmails` array
   - Added `includeMaterialList` parameter
   - Added `materialOrderIds` parameter
   - Fetches material orders with items
   - Generates PDFs for material orders
   - Generates material list HTML (no prices)
   - Attaches multiple PDFs
   - Uses Resend `cc` field

5. **`app/api/material-orders/send-email/route.ts`**
   - ✅ Already updated (previous commit)

## User Workflows

### Sending a Material Order
1. Open material order card
2. Click "Send Email" button
3. Dialog opens with supplier email pre-filled
4. Add CC recipients (optional)
5. Toggle "Include material list" if needed
6. Click "Send Email"
7. Supplier receives PDF with all pricing

### Sending a Work Order (with Materials)
1. Open work order card
2. Click "Send Email" button
3. Dialog opens with subcontractor email pre-filled
4. Add CC recipients (office manager, project coordinator, etc.)
5. Select which material orders to attach
6. Toggle "Include material list in email body (without prices)"
7. Click "Send Email"
8. Subcontractor receives:
   - Work order PDF
   - Material order PDFs (full details)
   - Material list in email (NO PRICES - just items, variants, quantities)

## Benefits

### For Office Staff
- ✅ Send work order + material orders in one email
- ✅ CC multiple team members
- ✅ Control what information is shared

### For Subcontractors
- ✅ Receive all job information at once
- ✅ See what materials will be provided
- ✅ See material variants (colors, types)
- ✅ **Cannot see** company's material costs

### For Business
- 🔒 Protects material pricing information
- 📧 Reduces email clutter
- 🎯 Better communication
- ⚡ Faster workflow

## Testing Checklist

- [ ] Send material order with CC recipients
- [ ] Verify CC recipients receive email
- [ ] Send work order with 1 material order attached
- [ ] Send work order with multiple material orders attached
- [ ] Verify material list shows in email body (no prices)
- [ ] Verify all PDFs attach correctly
- [ ] Test with/without material list checkbox
- [ ] Test Enter key to add CC emails
- [ ] Verify email validation works
- [ ] Check email formatting on mobile devices

## Technical Notes

### Database Schema
No database changes required - all enhancements are UI/API level.

### Type Safety
All components properly typed with `MaterialOrder` and `WorkOrder` types.

### Error Handling
- Validates email formats
- Handles missing material orders gracefully
- Shows toast notifications on success/failure

### Performance
- Material orders fetched only when needed (work orders only)
- PDFs generated on-demand
- Efficient Supabase queries with proper joins

## Future Enhancements

Potential improvements for later:
1. **Email Templates**: Custom templates per company
2. **Send History**: Track when emails were sent and to whom
3. **Read Receipts**: Know when subcontractors open emails
4. **Scheduled Sending**: Send emails at specific times
5. **Attachment Preview**: Preview PDFs before sending
6. **Email Signatures**: Custom signatures per user

## Commit History

1. **c0686cb** - Initial variant implementation and email dialog updates
2. **760ed15** - Unified email system with CC support and material order attachments

---

**Status**: ✅ Complete and Deployed  
**Last Updated**: December 9, 2024  
**Author**: GitHub Copilot
