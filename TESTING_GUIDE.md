# Quote Signature Testing Guide

## ✅ What's Working Now

- **PDF Display**: Quote PDFs load successfully in iframe
- **Server**: Running on port 3001 (port 3000 was in use)
- **Database Trigger**: Updated to use `status='production'`

## 🔍 Current Situation

### Quote Already Signed

The quote you're testing (`NE70JorKT8ktWz7RgRNJu3apog32WUhP`) **already has a signature**. The logs show:
```
hasSignature: 1
```

When you try to sign it again, the system should show: **"Quote already accepted"**

### One Signature Per Lead (By Design)

**Yes, you can only accept ONE quote per lead.** Here's what happens:

1. Customer signs Quote A for Lead X
2. Trigger runs and:
   - Sets Quote A status to 'accepted'
   - Sets Lead X status to 'production'
   - **Automatically declines ALL other quotes for Lead X**

This is intentional - a customer can't accept multiple quotes for the same job.

## 🧪 How to Test Fresh Signature

### Option 1: Create New Quote for Same Lead

1. Go to the lead in admin
2. Click "Add Quote" to create Quote Option B
3. Generate share link for new quote
4. Try signing that one
5. **Expected**: Should work, but will decline the first quote

### Option 2: Create Quote for Different Lead

1. Create a brand new lead (different customer)
2. Create a quote for that lead
3. Generate share link
4. Sign it
5. **Expected**: Should work cleanly

### Option 3: Reset Current Quote (Database)

Run this in Supabase SQL Editor:

```sql
-- Reset the quote (TESTING ONLY)
DELETE FROM quote_signatures WHERE quote_id = '2009c54f-be85-4a57-8061-89a8e4b3ef22';

UPDATE quotes 
SET status = 'draft', accepted_at = NULL 
WHERE id = '2009c54f-be85-4a57-8061-89a8e4b3ef22';

UPDATE leads
SET status = 'quote'
WHERE id = (SELECT lead_id FROM quotes WHERE id = '2009c54f-be85-4a57-8061-89a8e4b3ef22');
```

## 🐛 Debugging Current Error

You're seeing a **500 error** when trying to sign. Check the terminal output for:

```
Quote status check: { ... }
Signature insert error: { ... }
```

This will tell us exactly what's failing.

### Common Issues

1. **Port Mismatch**: Browser trying port 3000, server on 3001
   - Make sure you're accessing: `http://localhost:3001/quote/TOKEN`

2. **Quote Already Accepted**: System rejects re-signing
   - Expected behavior, need fresh quote

3. **Database Constraint**: Lead status still has issues
   - Check if trigger ran successfully
   - Verify lead status values

## 📝 Next Steps

1. **Try signing the quote again** - look at terminal output for detailed error
2. **Check browser console** - look for the exact error message in toast
3. **Try a fresh quote** - create new quote for different lead
4. **Report back** - let me know what the terminal logs show

## ⚙️ Server Status

- **Running**: Yes, on port 3001
- **PDF Route**: ✅ Working
- **Sign Route**: ⚠️ Working but needs testing with fresh quote

---

**Last Updated**: December 1, 2024 (just now)  
**Status**: PDF working, signature needs fresh quote to test
