# Phase 1: Suppliers Location Filtering - COMPLETE ✅

## Overview
Successfully implemented location-based filtering for suppliers and subcontractors. Suppliers can now be assigned to specific locations or made available company-wide.

## What Was Implemented

### 1. Database Changes
- **Migration**: `supabase/migrations/20260127000003_add_supplier_location.sql`
  - Added `location_id` column to `suppliers` table (UUID, nullable)
  - Foreign key to `locations(id)` with `ON DELETE SET NULL`
  - Index `idx_suppliers_location_id` for performance
  - NULL `location_id` = supplier available to all locations (company-wide)

### 2. TypeScript Types Updated
- **lib/types/suppliers.ts**
  - Added `location_id: string | null` to `Supplier` interface
  - Added optional `location_id` to `SupplierInsert`, `SupplierUpdate`, `SupplierFilters`
  - Added `locations` relationship to `Supplier` for displaying location name

### 3. API Functions Updated
- **lib/api/suppliers.ts**
  - `getSuppliers()`: Added location join `.select('*, locations(id, name)')`
  - `getSuppliers()`: Added location filtering with `.or()` query for location-specific OR company-wide
  - `getSupplier()`: Added location join for single supplier queries

### 4. UI Components Updated
- **components/admin/settings/supplier-dialog.tsx**
  - Added location dropdown to create/edit supplier form
  - Uses `useLocations()` hook to fetch active locations
  - Default value is "All Locations (Company-Wide)"
  - Help text explains location restriction behavior
  - Converts empty string to null on submit

- **components/admin/settings/suppliers-settings.tsx**
  - Added location filter dropdown in table header
  - Shows supplier's assigned location or "All Locations"
  - Filter integrates with existing search and type filters

## How It Works

### Creating a Supplier
1. User opens "Add Supplier" dialog
2. Location dropdown shows: "All Locations" (default) + list of active locations
3. If left as "All Locations", `location_id` is set to NULL → available everywhere
4. If specific location selected, `location_id` is set → only visible for that location's jobs

### Filtering Suppliers
- When a location filter is applied, query returns:
  - Suppliers specifically assigned to that location (`location_id = X`)
  - Company-wide suppliers (`location_id IS NULL`)
- This ensures company-wide suppliers are always available regardless of location

### Material/Work Order Integration (Next Phase)
When creating material/work orders:
- System will get the job's location
- Supplier dropdown will automatically filter to show:
  - Suppliers assigned to that location
  - Company-wide suppliers

## Migration Instructions

### Option 1: Manual via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260127000003_add_supplier_location.sql`
3. Paste and run

### Option 2: Via exec_sql RPC (if available)
```javascript
node run-migration.js supabase/migrations/20260127000003_add_supplier_location.sql
```

## Testing Checklist

- [ ] Run migration in Supabase
- [ ] Create a company-wide supplier (leave location as "All Locations")
- [ ] Create a location-specific supplier (select a location)
- [ ] Verify table shows correct location assignments
- [ ] Filter by location - verify both location-specific and company-wide suppliers appear
- [ ] Edit supplier to change location assignment
- [ ] Create material order (future) - verify suppliers filter by job location

## Files Modified

### Created
- `supabase/migrations/20260127000003_add_supplier_location.sql`
- `PHASE_1_COMPLETE.md` (this file)

### Modified
- `lib/types/suppliers.ts` (4 edits)
- `lib/api/suppliers.ts` (2 edits)
- `components/admin/settings/supplier-dialog.tsx` (6 edits)
- `components/admin/settings/suppliers-settings.tsx` (4 edits)

## Next Steps

### Phase 2: Supplier Documents
- Create `supplier_documents` table
- Set up Supabase Storage bucket
- Build upload/download/delete UI
- Document types: W-9, insurance, contracts, agreements

### Phase 3: Invoice PDF Location-Specific
- Update invoice PDF generation to use location data
- Show location address instead of company address
- Show location contact info

### Phase 4: Material/Work Order PDFs Location-Specific
- Update material order PDFs to use location data
- Update work order PDFs to use location data
- Test across multiple locations

## Estimated Time
- **Planned**: 30 minutes
- **Actual**: ~25 minutes
- **Status**: ✅ COMPLETE

---

**Completed**: January 27, 2026  
**Developer**: GitHub Copilot  
**Next Phase**: Supplier Documents
