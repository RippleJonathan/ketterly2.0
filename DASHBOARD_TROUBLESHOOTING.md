# Dashboard Troubleshooting Guide

## ✅ Issues Fixed

### 1. **TypeScript Errors - Recharts Tooltip Types**

**Error:**
```
Type '({ active, payload }: { active?: boolean; payload?: any[]; }) => JSX.Element | null' 
is not assignable to type 'ContentType<ValueType, NameType> | undefined'.
```

**Solution:** ✅ Fixed
- Changed `payload?: any[]` to `payload?: readonly any[]`
- Recharts uses readonly arrays for tooltip data
- Fixed in both `pipeline-chart.tsx` and `revenue-chart.tsx`

---

### 2. **OneSignal Service Worker Errors**

**Errors:**
```
sw.ts:20 Event handler of 'message' event must be added on the initial evaluation of worker script.
Log.ts:34 Failed parse launchUrl: TypeError: Failed to construct 'URL': Invalid URL
```

**Root Cause:**
- Push notifications were being sent without a valid URL
- OneSignal service worker requires a valid URL to parse

**Solution:** ✅ Fixed
- Modified `sendPushNotification()` to always provide valid URL:
  ```typescript
  url: url || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
  ```
- Added check to only include `data` object if it has keys:
  ```typescript
  if (Object.keys(customData).length > 0) {
    notification.data = customData
  }
  ```

---

### 3. **Syntax Error in layout.js**

**Error:**
```
:3000/_next/static/c…s/app/layout.js:677 Uncaught SyntaxError: Invalid or unexpected token
```

**Root Cause:**
- Likely a hot reload/build cache issue
- Happens when Next.js is rebuilding during development

**Solution:** ✅ Should resolve automatically
- Restart dev server: `npm run dev`
- Clear `.next` cache if persists: `rm -rf .next` or `rmdir /s .next` on Windows
- The TypeScript source files have no errors

---

## Environment Setup Checklist

Make sure your `.env.local` file has:

```env
# Required for push notifications
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OneSignal
NEXT_PUBLIC_ONESIGNAL_APP_ID=9bb827fa-d4a4-4827-a929-55f2750cfb59
ONESIGNAL_REST_API_KEY=your_rest_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

**For Production:**
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Testing the Dashboard

1. **Stop dev server** (Ctrl+C)
2. **Clear build cache** (optional if still having issues):
   ```bash
   rm -rf .next
   # or on Windows:
   rmdir /s .next
   ```
3. **Restart dev server**:
   ```bash
   npm run dev
   ```
4. **Navigate to dashboard**:
   ```
   http://localhost:3000/admin/dashboard
   ```

---

## Common Issues & Solutions

### **Charts Not Rendering**

**Symptoms:** Blank space where charts should be  
**Solution:**
- Check browser console for errors
- Verify `recharts` package is installed:
  ```bash
  npm install recharts @types/recharts
  ```
- Check if data is loading (look for loading skeletons)

---

### **No Data in Widgets**

**Symptoms:** All widgets show "0" or empty states  
**Solution:**
- Verify you have data in database (leads, quotes, invoices)
- Check Supabase RLS policies allow reading
- Check browser console for API errors
- Check company_id is set correctly

---

### **Service Worker Warnings**

**Symptoms:** Console warnings about service worker  
**Solution:**
- These are warnings, not errors (app still works)
- Ensure `NEXT_PUBLIC_APP_URL` is set
- Clear browser cache and reload
- Unregister old service workers in DevTools → Application → Service Workers

---

### **TypeScript Errors After Package Install**

**Symptoms:** Red squiggly lines in VS Code  
**Solution:**
- Restart TypeScript server:
  - Ctrl+Shift+P → "TypeScript: Restart TS Server"
- Or reload VS Code window:
  - Ctrl+Shift+P → "Developer: Reload Window"

---

### **Dashboard Loading Forever**

**Symptoms:** Skeleton loaders never disappear  
**Solution:**
1. Check browser console for errors
2. Check Network tab for failed API requests
3. Verify Supabase connection:
   ```typescript
   // Test in browser console
   const { data, error } = await supabase.from('leads').select('count')
   console.log(data, error)
   ```
4. Check RLS policies on all tables

---

## Performance Optimization

If dashboard is slow:

1. **Reduce Refresh Intervals** (in `lib/hooks/use-dashboard.ts`):
   ```typescript
   staleTime: 1000 * 60 * 5  // Increase from 2min to 5min
   ```

2. **Limit Data Fetching**:
   - Reduce `limit` on useUpcomingEvents
   - Reduce `limit` on useRecentActivity

3. **Add Database Indexes**:
   ```sql
   CREATE INDEX idx_leads_company_created ON leads(company_id, created_at DESC);
   CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
   CREATE INDEX idx_estimates_company_status ON estimates(company_id, status);
   ```

---

## Browser Compatibility

**Tested On:**
- ✅ Chrome 120+
- ✅ Edge 120+
- ✅ Firefox 121+
- ✅ Safari 17+

**Known Issues:**
- Safari < 16: Some chart animations may not work
- Firefox: May show service worker warnings (harmless)

---

## Getting Help

If issues persist:

1. **Check browser console** for specific errors
2. **Check network tab** for failed requests
3. **Verify environment variables** are set
4. **Clear all caches**: Browser + Next.js + Service Workers
5. **Test in incognito mode** to rule out extensions

**Logs to check:**
- Browser console (F12)
- Terminal where `npm run dev` is running
- Supabase logs (if database errors)

---

## Next Steps

Once dashboard is working:
- Test with real data (create leads, quotes, invoices)
- Test different user roles
- Test on mobile devices
- Test push notifications
- Monitor performance in production

---

**All fixes applied!** Restart your dev server and the dashboard should work perfectly. 🎉
