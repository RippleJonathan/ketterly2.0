# Run Presentation Financing Migration

This migration updates the `get_presentation_deck()` function to include license number and financing options in presentation slides.

## Quick Run (Using run-migration.js)

```bash
node run-migration.js supabase/migrations/20241227000002_add_license_financing_to_presentation_deck.sql
```

## Manual Run (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20241227000002_add_license_financing_to_presentation_deck.sql`
5. Paste into the SQL editor
6. Click **Run**

## What This Does

Updates the `get_presentation_deck()` PostgreSQL function to return:

### License Field
- `company_license_number` - Company license number for regulatory compliance display

### Financing Option 1 Fields
- `company_financing_option_1_name` - e.g., "Standard Financing"
- `company_financing_option_1_months` - e.g., 60
- `company_financing_option_1_apr` - e.g., 7.99
- `company_financing_option_1_enabled` - true/false

### Financing Option 2 Fields
- `company_financing_option_2_name` - e.g., "Premium Financing"
- `company_financing_option_2_months` - e.g., 120
- `company_financing_option_2_apr` - e.g., 6.99
- `company_financing_option_2_enabled` - true/false

### Financing Option 3 Fields
- `company_financing_option_3_name` - e.g., "No Interest (Promo)"
- `company_financing_option_3_months` - e.g., 12
- `company_financing_option_3_apr` - e.g., 0.00
- `company_financing_option_3_enabled` - true/false

## After Running

The presentation slides will now have access to:
- **Company Info Slide**: Displays license number with Globe icon
- **Pricing Slide**: Displays enabled financing options with calculated monthly payments

No code changes needed - the presentation slide components are already updated to use these fields.

## Testing

1. Configure financing options in **Settings** → **Company Settings** → **Financing Options** tab
2. Enable at least one financing option
3. Open a lead and click **Present** button
4. Navigate through slides:
   - Company info slide should show license number
   - Pricing slide should show financing options grid below quote total
5. Verify monthly payments calculate correctly based on quote total

## Verification Query

After running, verify the function returns the new fields:

```sql
SELECT get_presentation_deck(
  'your-template-id',
  'your-lead-id',
  'retail',
  ARRAY['your-quote-id']::uuid[]
);
```

Check the JSON response includes:
- `company_license_number`
- `company_financing_option_1_name`, `company_financing_option_1_months`, etc.
