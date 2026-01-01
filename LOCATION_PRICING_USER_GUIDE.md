# Location Pricing Quick Start Guide

## 🎯 What Is Location Pricing?

The Location Pricing system allows you to customize material prices for each of your locations and track supplier-specific deals. This ensures accurate pricing when creating quotes and orders based on where the work will be done.

---

## 📊 Three-Tier Pricing Model

Your pricing works in three levels:

```
1. 🌍 Global Catalog (Base Price)
   └─ Company-wide reference pricing
   
2. 📍 Location Default Price
   └─ Custom pricing for each location
   
3. 🏢 Supplier-Specific Price
   └─ Special deals from suppliers at each location
```

**Example:**
- Material: "Premium Shingle Bundle"
- Base Price: $100/bundle (company catalog)
- Denver Office Price: $110/bundle (higher regional cost)
- Denver + Supplier ABC: $95/bundle (volume discount deal)

When creating a quote in Denver using Supplier ABC → **You pay $95**

---

## 🚀 Getting Started

### Step 1: Access Location Pricing

1. Navigate to **Settings → Locations**
2. Click **"View Details"** on any location
3. Click the **"Pricing"** tab

You'll see two sub-tabs:
- **Default Prices**: Set location-specific pricing
- **Supplier Prices**: Track supplier deals

---

### Step 2: Set Location Default Pricing

**Use Case:** Your Denver office pays more for materials due to regional costs.

1. Go to **Pricing → Default Prices** tab
2. Find the material (use search box)
3. Click **Edit (✏️)** button
4. Enter your location's cost (e.g., $110)
5. (Optional) Add a note: "Denver regional pricing"
6. Click **"Save Price"**

✅ **Result:** This material now costs $110 at this location (instead of $100 base price)

**Visual Indicator:** Materials with custom pricing show a **⭐ star icon**

---

### Step 3: Add Supplier-Specific Pricing

**Use Case:** Supplier ABC gives you a bulk discount on shingles at your Denver office.

1. Go to **Pricing → Supplier Prices** tab
2. Select **Supplier ABC** from dropdown
3. Click **"Add Material"** button
4. Select material: "Premium Shingle Bundle"
5. Enter supplier's cost: $95
6. (Optional) Add details:
   - Supplier SKU: "ABC-SHGL-001"
   - Lead Time: 3 days
   - Min Order: 50 bundles
   - Notes: "Volume discount - 50+ bundles"
7. Click **"Save Price"**

✅ **Result:** When using Supplier ABC, this material costs $95 at Denver office

**Savings Indicator:** Shows "Saves $15 vs location default"

---

## 🎓 Common Scenarios

### Scenario 1: Regional Pricing Differences

**Problem:** Materials cost more in California vs Texas.

**Solution:**
1. Set CA office default prices higher (+10%)
2. Set TX office default prices lower (-5%)
3. Each location maintains its own pricing

---

### Scenario 2: Preferred Supplier Deals

**Problem:** Supplier XYZ gives you 15% off at your main warehouse.

**Solution:**
1. Go to warehouse location → Supplier Prices
2. Select Supplier XYZ
3. Add each material they discount
4. Enter their discounted prices
5. System automatically uses best price

---

### Scenario 3: Seasonal Pricing

**Problem:** Winter pricing is higher due to demand.

**Solution:**
1. Update location default prices for winter
2. When spring arrives, reset to base (click "Reset to Base")
3. Or create seasonal notes: "Winter 2024 pricing"

---

### Scenario 4: New Location Setup

**Problem:** Opening a new branch office.

**Solution:**
1. Admin creates new location
2. Office manager reviews all materials
3. Adjust prices for local market (if needed)
4. Add any local supplier deals
5. Ready to generate quotes!

---

## 🔐 Permissions & Access

### Admin Users
- ✅ Edit pricing for **all locations**
- ✅ See base price vs location price comparison
- ✅ Full access to supplier pricing

### Office Users
- ✅ Edit pricing for **their assigned location(s) only**
- ✅ See base price vs location price comparison
- ✅ Manage supplier deals for their location

### Sales/Other Users
- ❌ Read-only access (if any)
- ❌ Cannot edit pricing
- ✅ See effective prices in quotes/orders

---

## 💡 Best Practices

### ✅ DO:
- Review pricing quarterly for accuracy
- Document why prices differ (use Notes field)
- Keep supplier SKUs up to date
- Track lead times for planning
- Reset to base when no longer needed

### ❌ DON'T:
- Set random prices without reason
- Forget to update when supplier changes pricing
- Mix up location default vs supplier pricing
- Leave old supplier deals active

---

## 📋 Quick Actions Guide

### Search for a Material
1. Type material name or type in search box
2. Table filters instantly
3. Clear search to see all

### Edit a Price
1. Click ✏️ Edit button
2. Change price
3. Add note (optional but recommended)
4. Save

### Reset to Base Price
1. Click ✏️ on material with ⭐ (custom pricing)
2. Click "Reset to Base" button
3. Confirm
4. Price reverts to catalog base price

### Add Supplier Deal
1. Go to Supplier Prices tab
2. Select supplier
3. Click "Add Material"
4. Fill in details
5. Save

### Remove Supplier Deal
1. Find supplier price in table
2. Click 🗑️ Delete button
3. Confirm
4. Reverts to location default pricing

---

## 🆘 Troubleshooting

### "I can't see the Pricing tab"
- **Check:** Are you Admin or Office user?
- **Solution:** Sales users may not have access - contact admin

### "Pricing isn't updating in my quote"
- **Check:** Did you refresh after changing pricing?
- **Solution:** The system caches data - wait 5 seconds or refresh page

### "I can't edit another location's pricing"
- **Check:** Are you an Office user?
- **Solution:** Office users only edit their assigned locations - this is by design

### "Search isn't finding my material"
- **Check:** Is the material active?
- **Solution:** Search only shows active materials - check catalog

### "Supplier pricing not showing"
- **Check:** Did you select a supplier from dropdown?
- **Solution:** Supplier pricing is organized by supplier - select one first

---

## 📊 Understanding Pricing Display

### Default Prices Tab

| Column | Meaning |
|--------|---------|
| Material Name | From global catalog |
| Type | Material category (shingles, underlayment, etc.) |
| Unit | Bundle, roll, square, etc. |
| **Base Price** | Company catalog price (reference) |
| **Location Price** | This location's price (may differ from base) |
| ⭐ | Indicates custom pricing (differs from base) |

### Supplier Prices Tab

| Column | Meaning |
|--------|---------|
| Material Name | From global catalog |
| Supplier SKU | Supplier's part number |
| Cost | Supplier's price at this location |
| Lead Time | Days to delivery |
| Min Order | Minimum quantity to order |
| Notes | Special terms, discounts, etc. |

---

## 🎯 Pricing Resolution (How It Works)

When the system needs to price a material:

```
1. Check: Does this location + supplier have a price?
   ├─ YES → Use supplier price ✅
   └─ NO → Continue to step 2

2. Check: Does this location have a default price?
   ├─ YES → Use location price ✅
   └─ NO → Continue to step 3

3. Use base catalog price ✅
```

**You don't need to do anything - it's automatic!**

---

## 📞 Getting Help

- **Questions about pricing:** Contact your admin
- **Technical issues:** Check browser console or contact support
- **Permission requests:** Ask your company admin
- **Training needed:** Request demo from your manager

---

## 🎉 You're Ready!

You now know how to:
- ✅ Set location-specific pricing
- ✅ Track supplier deals
- ✅ Search and filter materials
- ✅ Understand the pricing waterfall
- ✅ Use best practices

**Start with one location and a few materials to get comfortable!**

---

*Last Updated: December 31, 2024*
