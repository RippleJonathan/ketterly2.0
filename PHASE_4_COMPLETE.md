# Phase 4 Complete: Work Order & Material Order PDFs Location-Specific

## Summary

Updated Work Order and Purchase Order (Material Order) PDF generation to use location-specific information instead of company-wide data. When a work order or material order is associated with a lead that has an assigned location, the PDF will display the location's contact information in the header, with fallback to company data.

## Changes Made

### 1. PDF Components Updated

#### Work Order PDF Component
**File**: `components/admin/pdf/work-order-pdf.tsx`

- Added `location` optional prop to `WorkOrderPDFProps` interface
- Added location-first fallback logic in component:
  ```typescript
  const businessName = location?.name || company?.name || 'Company Name'
  const businessLogo = company?.logo_url // Logo stays at company level
  const businessAddress = location?.address || company?.address || ''
  const businessCity = location?.city || company?.city || ''
  const businessState = location?.state || company?.state || ''
  const businessZip = location?.zip || company?.zip || ''
  const businessPhone = location?.phone || company?.contact_phone || ''
  const businessEmail = location?.email || company?.contact_email || ''
  ```
- Updated header to use `business*` variables instead of `company.*`

#### Purchase Order PDF Component
**File**: `components/admin/pdf/purchase-order-pdf.tsx`

- Added `location` optional prop to `PurchaseOrderPDFProps` interface
- Added same location-first fallback logic
- Updated header to use `business*` variables
- Updated footer to use `businessName` instead of `company.name`

### 2. PDF Generator Functions Updated

#### Client-Side Generator
**File**: `lib/utils/pdf-generator.ts`

- Updated `GeneratePurchaseOrderPDFOptions` interface to include optional `location` prop
- Updated `generatePurchaseOrderPDF()` to pass `location` to PDF component
- Updated `generatePurchaseOrderBlob()` to pass `location` to PDF component
- Updated `GenerateWorkOrderPDFOptions` interface to include optional `location` prop
- Updated `generateWorkOrderPDF()` to pass `location` to PDF component
- Updated `generateWorkOrderBlob()` to pass `location` to PDF component

#### Server-Side Generator
**File**: `lib/utils/pdf-generator-server.ts`

- Updated `GeneratePurchaseOrderPDFOptions` interface to include optional `location` prop
- Updated `generatePurchaseOrderBuffer()` to pass `location` to PDF component
- Updated `GenerateWorkOrderPDFOptions` interface to include optional `location` prop
- Updated `generateWorkOrderBuffer()` to pass `location` to PDF component

### 3. API Functions Updated

#### Work Orders API
**File**: `lib/api/work-orders.ts`

- Updated `getWorkOrders()` query to join `leads(location_id, locations(...))`
- Updated `getWorkOrder()` query to join `leads(location_id, locations(...))`
- Location data now available in work order objects

#### Material Orders API
**File**: `lib/api/material-orders.ts`

- Updated `getMaterialOrders()` query to join `lead:leads(..., location_id, locations(...))`
- Updated `getMaterialOrder()` query to join `lead:leads(..., location_id, locations(...))`
- Location data now available in material order objects through lead relationship

### 4. UI Components Updated

#### Work Order Card
**File**: `components/admin/leads/work-order-card.tsx`

- Updated `handleDownloadPDF()` to extract location from `workOrder.leads.locations`
- Passes `location` parameter to `generateWorkOrderPDF()`

#### Material Order Card
**File**: `components/admin/leads/material-order-card.tsx`

- Updated `handleDownloadPDF()` to extract location from `order.lead.locations`
- Passes `location` parameter to `generatePurchaseOrderPDF()`

### 5. Email API Route Updated

**File**: `app/api/work-orders/send-email/route.ts`

- Updated work order fetch query to join `leads(location_id, locations(...))`
- Extracts location from work order before generating PDF buffer
- Updated material orders fetch query to join `lead:leads(..., locations(...))`
- Extracts location from each material order before generating PDF buffer
- All emailed PDFs now use location-specific information

## Data Flow

```
1. User generates PDF from Work Order or Material Order
2. API fetches order with: order → lead → location
3. Card component extracts: location = order.leads?.locations || order.lead?.locations
4. Passes to generator: { order/workOrder, company, location }
5. Generator creates PDF component with location prop
6. PDF component creates business* variables: location-first fallback to company
7. PDF header renders using business* variables
8. Result: Location-specific contact info in PDF header
```

## Fallback Behavior

The system gracefully handles all scenarios:

1. **Lead has location assigned**: Uses location contact info
2. **Lead has no location**: Uses company contact info
3. **Order has no lead**: Uses company contact info
4. **Location missing specific fields**: Falls back field-by-field to company data

Example:
```typescript
// If location has name but no phone:
businessName = "North Office"        // from location
businessPhone = "(555) 123-4567"     // from company (fallback)
```

## Testing Checklist

- [ ] Generate work order PDF for lead with location → shows location info
- [ ] Generate work order PDF for lead without location → shows company info
- [ ] Generate material order PDF for lead with location → shows location info
- [ ] Generate material order PDF for lead without location → shows company info
- [ ] Email work order with material orders → all PDFs use correct location
- [ ] Verify logo still shows company logo (not location-specific)
- [ ] Verify address formatting with mixed location/company data

## Related Files

### Phase 3 (Invoice PDFs)
- `app/api/invoices/[id]/pdf/route.ts`
- `app/api/invoices/[id]/download-pdf/route.ts`
- `app/api/invoices/[id]/send-email/route.ts`
- `lib/utils/generate-invoice-pdf.ts`

### Phase 2 (Supplier Documents)
- `supabase/migrations/20260127000004_add_supplier_documents.sql`
- `lib/types/supplier-documents.ts`
- `lib/api/supplier-documents.ts`
- `components/admin/suppliers/supplier-documents.tsx`

### Phase 1 (Supplier Location Filtering)
- `supabase/migrations/20260127000003_add_supplier_location.sql`
- `lib/types/suppliers.ts`
- `lib/api/suppliers.ts`
- `components/admin/settings/supplier-dialog.tsx`

## Implementation Pattern (Reusable)

This pattern can be applied to any other PDF generation:

1. **Update PDF component** to accept `location` prop
2. **Add fallback logic** at component level:
   ```typescript
   const businessField = location?.field || company?.field || 'default'
   ```
3. **Update generator options** to accept `location`
4. **Update generator calls** to pass `location`
5. **Update API queries** to join location data
6. **Update UI components** to extract and pass location

## Status

✅ **COMPLETE**

All work order and material order PDFs now support location-specific information with graceful fallback to company data.

## Next Steps

No additional phases planned for location-specific features. All major PDF types now support location-based contact information:

- ✅ Invoices
- ✅ Work Orders
- ✅ Material Orders (Purchase Orders)

---

**Completed**: January 27, 2025
**Phase**: 4 of 4
**Impact**: All PDF generation now location-aware
