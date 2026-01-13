## 🎯 COMPLETE CONTRACT SIGNING + COMMISSION FLOW

### The New Streamlined Flow (Trigger-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CONTRACT SIGNING                                             │
│    Customer signs → Company signs → Both signatures complete    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. INVOICE AUTO-CREATION (Database Trigger)                     │
│    Trigger: auto_create_invoice_on_contract                     │
│    - Detects quote.status = 'accepted'                          │
│    - Generates invoice number: INV-2026-XXXX                    │
│    - Creates invoice with line items                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMMISSION AUTO-CREATION (Database Trigger)                  │
│    Trigger: auto_create_commissions_on_invoice                  │
│    - Detects new invoice inserted                               │
│    - Creates commissions for:                                   │
│      ✅ Sales Rep (10%)                                         │
│      ✅ Marketing Rep (5%)                                      │
│      ✅ Sales Manager (if assigned)                             │
│      ✅ Production Manager (if assigned)                        │
│      ✅ Office Manager (3% - location-based)                    │
│      ✅ Team Lead (if sales rep on team)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. LEAD STATUS UPDATE (API)                                     │
│    - Status: PRODUCTION / CONTRACT_SIGNED                       │
│    - Lead is now in production phase                            │
└─────────────────────────────────────────────────────────────────┘

```

---

### Manual Invoice Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES INVOICE MANUALLY (UI)                           │
│    - Click "Create Invoice" button                              │
│    - Select quote/line items                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. INVOICE CREATED (API: lib/api/invoices.ts)                   │
│    - Generates invoice number via RPC                           │
│    - Creates invoice record                                     │
│    - NO commission creation here (trigger handles it)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMMISSION AUTO-CREATION (Database Trigger)                  │
│    Trigger: auto_create_commissions_on_invoice                  │
│    - Same as contract flow above                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. LEAD STATUS UPDATE (API)                                     │
│    - Status: INVOICED / INVOICE_SENT                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Refresh Button Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "REFRESH" ON COMMISSIONS TAB                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CREATE/UPDATE USER COMMISSIONS (API)                         │
│    - Calls autoCreateCommission() for each assigned user        │
│    - skipCancelOthers=true (parallel safe)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CREATE OFFICE/TEAM COMMISSIONS (API)                         │
│    - Calls createOfficeAndTeamCommissions()                     │
│    - Creates office manager commission (3%)                     │
│    - Creates team lead commission (if applicable)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RECALCULATE ALL AMOUNTS (API)                                │
│    - Recalculates based on current invoice total                │
│    - Updates existing commissions if amounts changed            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Code Changes Made

### ✅ **1. Database Triggers**
- **Migration #2**: `20250113000002_fix_auto_invoice_number_generation.sql`
  - Fixed `auto_create_invoice_on_contract()` to use new `generate_invoice_number()` RPC
  - Generates: `INV-2026-0030` instead of `INV-02027`

- **Migration #3**: `20250113000003_auto_create_commissions_on_invoice.sql`
  - NEW trigger: `auto_create_commissions_on_invoice()`
  - Fires on `AFTER INSERT` on `customer_invoices`
  - Creates all 6 commission types automatically

### ✅ **2. Removed Duplicate Code**
- **File**: `lib/api/invoices.ts`
  - **REMOVED**: Commission creation logic (lines 149-181)
  - **KEPT**: Lead status update only
  - **Reason**: Database trigger now handles commission creation

### ✅ **3. Fixed Refresh Button**
- **File**: `components/admin/leads/commissions-tab.tsx`
  - **ADDED**: Call to `createOfficeAndTeamCommissions()`
  - **REASON**: Ensures office manager commission is created on refresh

### ✅ **4. Fixed Sign Contract Button**
- **File**: `components/admin/leads/estimates-tab.tsx`
  - **FIXED**: Checks `quote_signatures` table for both signatures
  - **REASON**: Hide button when contract fully signed

---

## 🧪 Testing Instructions

### Test 1: Contract Signing (Full Flow)
1. Create a quote for a lead with sales_rep and marketing_rep assigned
2. Send quote to customer
3. Customer signs contract
4. Company signs contract
5. **Expected Result**:
   - ✅ Invoice created: `INV-2026-XXXX`
   - ✅ 3+ commissions created automatically:
     - Sales rep (10%)
     - Marketing rep (5%)
     - Office manager (3%)
   - ✅ Lead status = PRODUCTION / CONTRACT_SIGNED
   - ✅ "Sign Contract" button hidden

### Test 2: Manual Invoice Creation
1. Create invoice manually from Invoices tab
2. **Expected Result**:
   - ✅ Invoice created: `INV-2026-XXXX`
   - ✅ Commissions created automatically (same as contract flow)
   - ✅ Lead status = INVOICED / INVOICE_SENT

### Test 3: Refresh Button
1. Go to lead's Commissions tab
2. Click "Refresh" button
3. **Expected Result**:
   - ✅ Creates missing commissions
   - ✅ Updates amounts if invoice changed
   - ✅ Office commission created if missing

---

## 📊 Verification Queries

Run the queries in `test-contract-signing.sql` to verify:

### Query #5: Commission Completeness Check
This query shows what commissions SHOULD exist vs what DOES exist for a lead.

**Expected output** for a lead with sales_rep + marketing_rep assigned:
```
| field            | expected_user       | status     | amount   |
|------------------|---------------------|------------|----------|
| sales_rep_id     | heritage office     | ✅ EXISTS  | 2258.85  |
| marketing_rep_id | heritage office     | ✅ EXISTS  | 1129.43  |
| office_override  | Jonathan Ketterman  | ✅ EXISTS  | 677.66   |
```

If you see `❌ MISSING`, click the Refresh button on Commissions tab.

---

## 🎯 Summary

**Old Flow** (Removed):
- Manual invoice creation → API creates commissions → API updates lead status
- Contract signing → Trigger creates invoice → API creates commissions → API updates lead status
- Refresh button → API creates/updates commissions

**New Flow** (Current):
- Manual invoice creation → **Trigger creates commissions** → API updates lead status
- Contract signing → Trigger creates invoice → **Trigger creates commissions** → API updates lead status
- Refresh button → API creates/updates commissions (fallback/manual fix)

**Benefits**:
- ✅ No duplicate commission logic
- ✅ Consistent commission creation (always via trigger)
- ✅ Refresh button as safety net
- ✅ Cleaner, more maintainable code

---

## 🚨 Known Issues Fixed

1. ✅ Invoice number format inconsistency
2. ✅ Duplicate commission creation
3. ✅ Office commission not created automatically
4. ✅ Sign Contract button showing when already signed
5. ✅ Missing commissions after contract signing

---

**Last Updated**: January 13, 2026
