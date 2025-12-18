# Global Search Implementation Guide

## Overview
Global search functionality using command palette pattern - professional, keyboard-driven search across all leads and customers.

## Features Implemented

### 🔍 Search Capabilities
- **Real-time search** across leads table
- **Multi-field search**: full_name, email, phone, address, city
- **Debounced queries** (300ms delay) to reduce server load
- **PostgreSQL full-text search** using `ilike` pattern matching
- **Result limit**: Top 10 most recent matches

### ⌨️ Keyboard Shortcuts
- **Ctrl+K** (Windows/Linux) or **Cmd+K** (Mac) to open
- **Up/Down arrows** to navigate results
- **Enter** to select and navigate to lead
- **Escape** to close

### 📱 Mobile Support
- **Touch-friendly**: Tap search button in header
- **Full-screen modal** on mobile for better UX
- **No keyboard required** - works with tap/touch

### 🎨 UI/UX
- **Command palette modal** (centered, full-width on mobile)
- **Rich result cards** with:
  - Lead name and status badge
  - Email, phone, address with icons
  - Color-coded status indicators
- **Empty states**:
  - "Start typing to search..."
  - "Type at least 2 characters"
  - "No results found"
- **Loading spinner** during search

## Files Created

### 1. Server Action (`src/app/actions/search.ts`)
```typescript
export async function globalSearch(query: string): Promise<SearchResponse>
```
- Validates user authentication
- Filters by company_id (multi-tenant)
- Excludes soft-deleted records
- Returns standardized SearchResult[] array

### 2. Command Palette Component (`components/admin/command-palette.tsx`)
```typescript
<CommandPalette open={boolean} onOpenChange={(open) => void} />
```
- Uses `cmdk` library for command palette UI
- Debounced search (300ms)
- Keyboard shortcut listener
- Auto-resets on close

### 3. Header Integration (`components/admin/header.tsx`)
- Desktop: Clickable search bar with "Ctrl+K" hint
- Mobile: Search icon button
- Opens command palette on click

### 4. Styles (`app/globals.css`)
- Custom cmdk component styles
- Consistent with Tailwind theme
- Responsive design

## How to Use

### Desktop
1. Press **Ctrl+K** or click search bar
2. Type 2+ characters
3. Use arrow keys to navigate results
4. Press Enter to visit lead page

### Mobile
1. Tap search icon in header
2. Tap search input to bring up keyboard
3. Type to search
4. Tap result to navigate

## Search Logic

### Pattern Matching
```sql
WHERE full_name ILIKE '%query%'
   OR email ILIKE '%query%'
   OR phone ILIKE '%query%'
   OR address ILIKE '%query%'
   OR city ILIKE '%query%'
```

### Performance
- **Debouncing**: Waits 300ms after user stops typing
- **Limit 10 results**: Prevents overwhelming UI
- **Case-insensitive**: `ilike` operator
- **Indexed fields**: Ensure indexes on searched columns

## Future Enhancements

### Phase 2 (Optional)
- [ ] Search customers table (separate from leads)
- [ ] Search quotes by quote number
- [ ] Search invoices by invoice number
- [ ] Recent searches history
- [ ] Search suggestions/autocomplete
- [ ] Fuzzy matching for typos
- [ ] Advanced filters (status, date range, assigned user)

### Phase 3 (Advanced)
- [ ] PostgreSQL full-text search (tsvector/tsquery)
- [ ] Search result highlighting
- [ ] Search analytics (popular queries)
- [ ] AI-powered semantic search
- [ ] Voice search

## Testing Checklist

### Desktop Testing
- [x] Ctrl+K opens command palette
- [x] Typing triggers search
- [x] Results display correctly
- [x] Arrow keys navigate results
- [x] Enter navigates to lead page
- [x] Escape closes modal
- [x] Clicking backdrop closes modal

### Mobile Testing
- [ ] Search icon visible in header
- [ ] Tap opens command palette
- [ ] Modal is full-screen
- [ ] Touch keyboard appears
- [ ] Tap result navigates to lead
- [ ] Swipe/tap outside closes modal

### Search Testing
- [ ] Search by full name
- [ ] Search by email
- [ ] Search by phone number
- [ ] Search by address
- [ ] Search by city
- [ ] Partial matches work
- [ ] Case-insensitive search
- [ ] Special characters handled
- [ ] No results shows empty state
- [ ] Loading state appears briefly

### Multi-Tenant Testing
- [ ] Only sees own company's leads
- [ ] Cannot search other companies' data
- [ ] Soft-deleted leads excluded

## Troubleshooting

### Issue: "Not authenticated" error
**Solution**: User must be logged in. Check auth middleware.

### Issue: "User not found" error
**Solution**: User record missing in users table. Check user creation flow.

### Issue: No results appearing
**Solution**: 
1. Check database has leads with matching data
2. Verify company_id is correct
3. Check RLS policies on leads table
4. Check browser console for errors

### Issue: Ctrl+K not working
**Solution**: 
1. Check if other extensions/apps are capturing shortcut
2. Try clicking search bar instead
3. Refresh page to reload event listeners

### Issue: Search too slow
**Solution**:
1. Add database indexes: `CREATE INDEX idx_leads_search ON leads (full_name, email, phone, address, city);`
2. Reduce debounce time (may increase server load)
3. Consider implementing PostgreSQL full-text search

## Performance Optimization

### Database Indexes
```sql
-- Recommended indexes for fast search
CREATE INDEX idx_leads_company_id ON leads(company_id);
CREATE INDEX idx_leads_full_name ON leads(full_name);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_address ON leads(address);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at);
```

### Full-Text Search (Advanced)
```sql
-- For even faster search with large datasets
ALTER TABLE leads ADD COLUMN search_vector tsvector;

CREATE INDEX idx_leads_search_vector ON leads USING gin(search_vector);

CREATE TRIGGER leads_search_vector_update 
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', full_name, email, phone, address, city);
```

## Dependencies
- `cmdk`: ^1.0.0 (command palette library)
- Next.js 15+ (server actions)
- Supabase (database, auth)
- Tailwind CSS (styling)

## Related Documentation
- [Product Roadmap - Global Search](../PRODUCT_ROADMAP.md#7-global-search-functionality)
- [Supabase Server Actions Pattern](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [cmdk Library Docs](https://cmdk.paco.me/)

---

**Status**: ✅ Implemented  
**Completed**: December 17, 2024  
**Time Spent**: ~3 hours  
**Difficulty**: ⭐⭐⭐ Medium-Hard
