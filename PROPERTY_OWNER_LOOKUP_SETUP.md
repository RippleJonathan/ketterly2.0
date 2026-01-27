# Property Owner Lookup Setup Guide

## Overview

When door knocking, clicking on a house will now automatically populate the **homeowner's name** in the lead form, along with the address (which already works).

This uses a property data API to look up ownership information based on the address.

## How It Works

1. User clicks on a house pin during door knocking
2. Clicks "Convert to Lead" button
3. System:
   - Reverse geocodes coordinates → address ✅ (already working)
   - **NEW**: Calls property data API with address → homeowner name
   - Auto-fills lead form with both address AND homeowner name

## Setup Instructions

### Option 1: Melissa Data Property API (Recommended)

**Best for**: Getting started, lower volume (< 1000 lookups/month)

#### 1. Create Account
- Go to: https://www.melissa.com/
- Click "Free Trial" or "Sign Up"
- Select "Property Data" service

#### 2. Get API Key
- Log into Melissa Data dashboard
- Navigate to "API Keys" or "Credentials"
- Copy your API key (starts with your account ID)

#### 3. Add to Environment Variables
Add to `.env.local`:
```env
MELISSA_API_KEY=your_api_key_here
```

#### 4. Pricing
- **Free Trial**: Usually 100-500 free lookups
- **Pay-As-You-Go**: ~$0.02-0.05 per lookup
- **Monthly Plans**: Start at $50/month for 1000 lookups

---

### Option 2: Attom Data Solutions (Enterprise)

**Best for**: High volume, need comprehensive property data

#### 1. Create Account
- Go to: https://api.attomdata.com/
- Request API access (requires approval)
- Choose subscription plan

#### 2. Get API Key
- Log into Attom dashboard
- Navigate to "API Keys"
- Copy your API key

#### 3. Update Code
In `lib/utils/property-lookup.ts`, uncomment the Attom function and update the main lookup:

```typescript
// Replace the lookupPropertyOwner function call with:
export { lookupPropertyOwnerAttom as lookupPropertyOwner }
```

#### 4. Add to Environment Variables
Add to `.env.local`:
```env
ATTOM_API_KEY=your_api_key_here
```

#### 5. Pricing
- **Subscription-based**: $100-500/month depending on usage
- **More comprehensive data**: Property history, tax records, etc.

---

## Testing the Feature

### 1. Add API Key to Environment
```bash
# .env.local
MELISSA_API_KEY=your_actual_key_here
```

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Test Door Knocking
1. Go to Door Knocking page: `/admin/door-knocking`
2. Click on any house on the map
3. Fill out door knock form
4. Set status to "Appointment Set"
5. Click "Save"
6. Click "Convert to Lead" button
7. **Wait for loading**: "Looking up homeowner and address..."
8. **Verify**: Homeowner name should auto-populate in "Full Name" field

### 4. Expected Behavior

✅ **Success Toast**: "Found homeowner: John Smith"
✅ **Name Field**: Auto-filled with owner name
✅ **Address Fields**: Auto-filled (city, state, zip)

❌ **If no API key**: Warning in console, form opens without owner name (graceful fallback)
❌ **If lookup fails**: Form still opens with address, just no owner name

---

## Data Returned

The property lookup can return:

```typescript
{
  ownerName: "John Smith",           // ✅ Used for lead name
  ownerFirstName: "John",
  ownerLastName: "Smith",
  mailingAddress: "...",             // If different from property
  propertyType: "Single Family",
  yearBuilt: 1985,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 2000,
  lotSize: 7200,
  assessedValue: 250000,
  lastSaleDate: "2020-05-15",
  lastSalePrice: 230000,
}
```

**Currently**: Only `ownerName` is used to populate the lead's `full_name` field.

**Future Enhancement**: Could store additional property data in lead notes or custom fields.

---

## Cost Optimization

### Avoid Unnecessary Lookups

The code is designed to minimize API calls:
- Only runs when user clicks "Convert to Lead"
- Only runs if address is successfully geocoded
- Fails gracefully if API key not configured

### Monitor Usage

Most property data APIs have dashboards showing:
- Number of lookups per month
- Cost per lookup
- Usage trends

Set up billing alerts to avoid surprise charges.

---

## Alternative Solutions

### 1. Free Public Records APIs
Some counties offer free property lookup APIs, but:
- Limited to specific counties/states
- Inconsistent data formats
- May require individual integrations per county

### 2. Batch Upload
Some services offer:
- Upload a list of addresses (entire neighborhood)
- Get owner names for all properties at once
- Cheaper per lookup (~$0.01 each)

Good for:
- Canvassing specific neighborhoods
- Pre-planning door knocking routes

### 3. Manual Entry
If budget is tight:
- Skip property lookup API
- Sales reps enter homeowner name manually
- No additional cost, but slower workflow

---

## Troubleshooting

### Owner Name Not Populating

1. **Check API Key**:
   ```bash
   # In terminal
   echo $MELISSA_API_KEY
   ```

2. **Check Browser Console**:
   - Look for errors related to property lookup
   - Warning: "Property lookup API key not configured" means key not set

3. **Check Network Tab**:
   - Look for request to `property.melissadata.net`
   - Check response status (200 = success)

4. **Verify Address**:
   - Property lookup requires full address
   - Partial addresses may return no results

### API Rate Limits

If you hit rate limits:
- Melissa: Usually 10 requests/second
- Solution: Wait a few seconds between conversions

### Wrong Owner Name

Property data can be outdated:
- Tax assessor records update annually
- Recent sales may not reflect yet
- Solution: User can manually correct in lead form

---

## Production Deployment

### Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to "Settings" → "Environment Variables"
4. Add:
   ```
   Name: MELISSA_API_KEY
   Value: your_production_api_key
   Environment: Production
   ```

### Security Note

- API keys are server-side only (not exposed to browser)
- Code checks for `process.env.MELISSA_API_KEY` (private)
- Safe to deploy to production

---

## Future Enhancements

### 1. Store Property Data
Save additional property details in lead record:
```typescript
// Add to leads table
property_year_built: number
property_bedrooms: number
property_square_feet: number
estimated_value: number
```

### 2. Neighborhood Batch Lookup
Pre-load owner names for entire neighborhood:
- Before door knocking session
- Display on map pins
- No delay when converting to lead

### 3. Owner Match Confidence
Show confidence score:
- "High confidence: John Smith (98%)"
- "Low confidence: J. Smith (62%)"
- Let user verify before accepting

---

## Questions?

- Melissa Data Support: https://www.melissa.com/support
- Attom Support: https://api.attomdata.com/support
- Implementation questions: See code comments in `lib/utils/property-lookup.ts`
