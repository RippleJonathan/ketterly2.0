# Adding Contract Terms to Your Company

## Quick Setup Instructions

### Step 1: Run the Migration
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (ketterly)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/20241130000003_add_ripple_contract_terms.sql`
6. Click **Run** (or press Ctrl+Enter)

This will:
- Add the `contract_terms` column to your `companies` table
- Populate Ripple Roofing & Construction's terms automatically

### Step 2: Test the PDF
1. Go to http://localhost:3000
2. Navigate to any lead
3. Click the **Estimates** tab
4. Click **Download PDF** on a quote

The PDF will now have **2 pages**:
- **Page 1**: Quote with line items, totals, and signature boxes
- **Page 2**: Contract Terms and Conditions (if contract_terms is set for the company)

## Customizing Contract Terms

### Via Supabase Dashboard:
1. Go to **Table Editor** > **companies**
2. Find your company row
3. Edit the `contract_terms` field
4. Paste your custom contract text
5. Save

### What Shows on Page 2:
- Company logo (centered)
- "{Company Name} Contract & Payment Terms" header
- Your full contract text
- Customer Signature 2 and Date fields
- Page 2 of 2 footer

## Line Items Issue

I've updated the line items to use `Array.isArray()` check which should help with rendering. The line items should now display with:
- Category prefix (e.g., "ROOFING | ")
- Description
- Notes (if any) in smaller text below
- Quantity with unit
- Line total price

If line items still aren't showing, please check:
1. Do the quotes have `line_items` in the database?
2. Run this SQL in Supabase to check:
   ```sql
   SELECT id, quote_number, 
          (SELECT COUNT(*) FROM quote_line_items WHERE quote_id = quotes.id) as item_count
   FROM quotes 
   WHERE company_id = 'YOUR_COMPANY_ID';
   ```

## Example Contract Terms Format

The contract terms are stored as plain text with line breaks. You can format them with:
- Paragraph breaks (double newline)
- Section headers (bold in original, will render as regular text in PDF)
- Initial lines with underscores: `_____________`
- Signature lines: `Customer Signature_____________________________Date_______`

The PDF will render this as-is at 8pt font size with 1.5 line height for readability.
