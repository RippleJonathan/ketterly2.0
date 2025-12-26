# Presentation System - Quick Testing Guide

## Prerequisites
✅ Database migration run: `20241225000001_create_presentation_system.sql`  
✅ Sample template created: `sample_presentation_template.sql`  
✅ At least one lead with estimates in your system

## Step-by-Step Testing

### 1. Create Sample Template
Run this in Supabase SQL Editor:
```bash
# Copy the contents of: supabase/migrations/sample_presentation_template.sql
# Paste into Supabase SQL Editor and run
```

This creates a template with 5 slides:
1. Company Introduction
2. Customer Information  
3. Why Choose Us (static content)
4. Interactive Pricing Grid
5. Closing/CTA

### 2. Prepare a Lead with Estimates
1. Go to a lead in your CRM
2. Ensure the lead has at least one estimate/quote created
3. Estimates should have Good/Better/Best pricing set

### 3. Launch Presentation
1. Navigate to the lead's Estimates tab
2. Click the **"Present"** button (next to "New Estimate")
3. Modal opens with presentation options

### 4. Configure Presentation
In the Present Modal:
- **Template**: Select "Standard Sales Presentation"
- **Flow Type**: Choose "Retail" (shows pricing grid) or "Insurance" (skips pricing)
- **Estimates**: Check the estimates to include (retail only)
- Click **"Start Presentation"**

### 5. Navigate Presentation
The full-screen presentation overlay opens:

**Keyboard Controls:**
- `→` or `Click Right Arrow` - Next slide
- `←` or `Click Left Arrow` - Previous slide
- `Esc` - Exit presentation
- Swipe gestures work on touch devices

**Features to Test:**
- Progress bar at top shows slide position
- Company logo displays in header
- Slide counter shows "Slide X of Y"

### 6. Test Interactive Pricing (Slide 4)
On the pricing grid slide:
- Click any of the three pricing options (Good/Better/Best)
- Selected option highlights with yellow border
- Checkmark appears on selected card
- Selection is automatically saved to database

### 7. Complete Presentation
- Navigate to final slide (Closing)
- Click **"Proceed to Contract Signing"** button
- Toast notification shows selected option
- Presentation closes
- Session marked as completed in database

## What Gets Tracked
Every presentation session records:
- Template used
- Lead presented to
- Flow type (retail/insurance)
- Which estimate was selected
- Which pricing option was chosen (good/better/best)
- Duration of presentation
- Who presented it
- Completion status

Query to see session data:
```sql
SELECT 
  s.*,
  t.name as template_name,
  l.full_name as customer_name
FROM presentation_sessions s
JOIN presentation_templates t ON t.id = s.template_id
JOIN leads l ON l.id = s.lead_id
ORDER BY s.created_at DESC
LIMIT 10;
```

## Troubleshooting

### "No templates available"
- Run the sample template SQL script
- Ensure template `is_active = true`
- Check `company_id` matches your user's company

### "No estimates available"
- Create at least one quote for the lead
- Ensure quote has Good/Better/Best pricing set
- Quote status should be 'draft' or 'sent'

### Presentation won't start
- Check browser console for errors
- Verify all migrations have run
- Ensure user is authenticated

### Pricing grid shows "No pricing information"
- The estimate must have `price_good`, `price_better`, `price_best` columns populated
- These come from quote creation

### TypeScript errors in IDE
- These may be caching issues
- Restart VS Code TypeScript server: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
- Errors don't affect runtime functionality

## Next Steps

Once basic presentation works:

### Phase 2: Enhanced Pricing
- Side-by-side estimate comparison
- Price difference calculator
- Mobile swipe optimizations

### Phase 3: Contract Integration
- Seamless transition to signing after selection
- Pre-fill contract with selected option
- Auto-calculate totals based on selection

### Phase 4: Admin Builder
- Drag-and-drop slide reordering
- Visual slide editor
- Template duplication
- Media library integration

### Phase 5: Advanced Slides
- Photo galleries with before/after comparisons
- Video embeds (YouTube, Vimeo)
- Roof measurement visualizations
- Google Maps integration

### Phase 6: Polish
- Slide transitions/animations
- Mobile responsive improvements
- Analytics dashboard
- A/B testing for templates

## Database Cleanup

To reset presentations for testing:
```sql
-- Clear all test sessions
DELETE FROM presentation_sessions WHERE id IN (
  SELECT id FROM presentation_sessions 
  WHERE created_at > NOW() - INTERVAL '1 day'
);

-- Reset template
UPDATE presentation_templates 
SET is_active = true 
WHERE name = 'Standard Sales Presentation';
```
