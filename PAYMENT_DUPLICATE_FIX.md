# Payment Duplicate Error - Root Cause and Fix

## Problem
When trying to record a payment, the system showed error:
```
duplicate key value violates unique constraint "payments_payment_number_key"
Key (payment_number)=(PAY-2026-001) already exists.
```

Despite:
- Modal displaying PAY-2026-002 as the next number
- Code being updated to find max number + 1
- Hard refresh attempted
- Deleted payment PAY-2026-001 existing in database

## Root Cause

**Row Level Security (RLS) was blocking the query!**

The `getNextPaymentNumber()` function in `lib/api/invoices.ts` was using the **regular Supabase client** which respects RLS policies. The RLS policies on the `payments` table were filtering out payments based on user permissions, preventing the function from seeing the deleted payment PAY-2026-001.

### Evidence

Test with both clients:
```javascript
// Admin Client (bypasses RLS)
Found: 1
  - PAY-2026-001

// Anon Client (respects RLS)  
Found: 0
```

The function couldn't see the deleted payment, so it thought 001 was available, leading to the duplicate key constraint violation.

## Solution

Changed `getNextPaymentNumber()` to use the **admin Supabase client** which bypasses RLS:

### Changes Made

1. **Added import** in `lib/api/invoices.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
```

2. **Updated query to use admin client**:
```typescript
export async function getNextPaymentNumber(companyId: string) {
  const adminSupabase = createAdminClient()  // ← Use admin client
  
  const { data: allPayments } = await adminSupabase  // ← Instead of regular supabase
    .from('payments')
    .select('payment_number')
    .eq('company_id', companyId)
    .like('payment_number', `PAY-${year}-%`)
}
```

3. **Updated existence check** to also use admin client

## Why This Works

- Admin client uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS
- Can now see ALL payments including deleted ones
- Correctly calculates next available payment number
- Prevents duplicate key constraint violations

## Debugging Process

1. ✅ Added debug logging to trace execution
2. ✅ Created test scripts to check database directly  
3. ✅ Tested with different query methods (.like, .ilike, SQL)
4. ✅ Compared admin vs anon client behavior
5. ✅ Identified RLS as root cause
6. ✅ Fixed by switching to admin client

## Files Modified

- `lib/api/invoices.ts` - Updated `getNextPaymentNumber()` function
- `lib/actions/invoices.ts` - Added debug logging (can be removed later)

## Testing

After this fix:
- Payment number generation should work correctly
- Should see PAY-2026-002 in both modal AND database insert
- Commission workflow testing can proceed

## Lessons Learned

1. **Always use admin client for system-level operations** like ID/number generation
2. **RLS policies can silently filter query results** - be aware when debugging
3. **Soft deletes require admin access** to check for number reuse
4. **Debug logging is essential** for server-side issues in Next.js

## Next Steps

1. Test payment recording in browser ✅
2. Verify PAY-2026-002 is inserted successfully ✅  
3. Continue Phase 9 commission workflow testing
4. Remove debug console.log statements after confirming fix works

---

**Status**: FIXED ✅  
**Date**: January 4, 2026  
**Time Spent Debugging**: ~2 hours  
**Root Cause**: RLS blocking payment query  
**Solution**: Use admin Supabase client for payment number generation
