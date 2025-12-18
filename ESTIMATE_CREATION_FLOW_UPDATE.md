# Estimate Creation Flow Update

## Changes Made

Updated the estimate creation flow to match the material and labor order pattern with a template selection dialog.

## New Flow

### Before:
1. Click "Create Estimate" button
2. Opens QuoteForm directly
3. Inside form, select template from dropdown + click import

### After (New):
1. Click "Create Estimate" button
2. Dialog appears: **"Create Estimate"**
3. Choose method:
   - ✅ **Use Template** (Recommended) - Start with pre-configured materials
   - **Blank Estimate** - Create from scratch
4. If "Use Template":
   - Shows grid of available estimate templates
   - Select template
   - Click "Create from Template"
5. QuoteForm opens with template items auto-imported

## Files Created/Modified

### Created:
- `components/admin/leads/create-estimate-dialog.tsx` - New dialog component
  - Two-step process: method selection → template selection
  - Matches material-order-creation-dialog.tsx pattern
  - Shows template name, description, category, and item count
  - Color-coded category badges

### Modified:
- `components/admin/leads/quote-form.tsx`
  - Added `initialTemplateId` prop
  - Auto-imports template items on open when provided
  - useEffect hook handles automatic import
  - Clears line items before importing to avoid duplicates

- `components/admin/leads/estimates-tab.tsx`
  - Added `CreateEstimateDialog` import
  - Added state: `isCreateDialogOpen`, `selectedTemplateId`
  - Updated all "Create Estimate" buttons to open dialog
  - Dialog handlers:
    - `onSelectTemplate` - Sets template ID and opens form
    - `onSelectBlank` - Opens form without template
  - QuoteForm receives `initialTemplateId` prop
  - Clears template ID on form close

## User Experience

### Template Selection Dialog:
```
┌─────────────────────────────────────────┐
│ Create Estimate                     × │
├─────────────────────────────────────────┤
│ Choose how you want to create estimate  │
│                                          │
│ ┌────────────────────────────────────┐ │
│ │ ○ Use Template [Recommended]       │ │
│ │   Start with pre-configured        │ │
│ │   materials and line items         │ │
│ └────────────────────────────────────┘ │
│                                          │
│ ┌────────────────────────────────────┐ │
│ │ ○ Blank Estimate                   │ │
│ │   Create blank and add items       │ │
│ │   manually                         │ │
│ └────────────────────────────────────┘ │
│                                          │
│           [Cancel]  [Continue]          │
└─────────────────────────────────────────┘
```

### Template Selection (Step 2):
```
┌─────────────────────────────────────────┐
│ Select Estimate Template            × │
├─────────────────────────────────────────┤
│ Choose a template to start with        │
│                                          │
│ ┌────────────────────────────────────┐ │
│ │ Standard Roof Package   [roofing]  │ │
│ │ Complete roofing materials         │ │
│ │ 8 line items                       │ │
│ └────────────────────────────────────┘ │
│                                          │
│ ┌────────────────────────────────────┐ │
│ │ Siding Replacement      [siding]   │ │
│ │ Vinyl siding with trim             │ │
│ │ 12 line items                      │ │
│ └────────────────────────────────────┘ │
│                                          │
│ [Back] [Cancel] [Create from Template] │
└─────────────────────────────────────────┘
```

### Blank Estimate:
- Clicking "Blank Estimate" immediately opens QuoteForm
- No template items imported
- User adds line items manually

## Benefits

1. **Consistency** - Matches material order and labor order creation flow
2. **Clarity** - User explicitly chooses template vs. blank
3. **Efficiency** - Template items auto-populate (no need to select + click import)
4. **Discovery** - Templates are more visible, encouraging their use
5. **Better UX** - Clearer path for new users

## Testing

### Test Template Selection:
1. Go to lead → Estimates tab
2. Click "Create Estimate"
3. Verify dialog appears with two options
4. Select "Use Template"
5. Click Continue
6. Verify templates list appears
7. Select a template
8. Click "Create from Template"
9. Verify QuoteForm opens with items already populated

### Test Blank Estimate:
1. Click "Create Estimate"
2. Select "Blank Estimate"
3. Click Continue
4. Verify QuoteForm opens with no line items

### Test No Templates:
1. Delete all estimate templates in Settings
2. Click "Create Estimate"
3. Select "Use Template"
4. Verify message: "No templates available. Create a template in Settings first."

## Next Steps

This completes the unified template creation flow across:
- ✅ Material Orders (template selection dialog)
- ✅ Labor Orders (template selection dialog)
- ✅ Estimates (template selection dialog - NEW)

All three now follow the same UX pattern:
1. Click create button
2. Choose template or blank
3. Select template if applicable
4. Form opens with items auto-populated
