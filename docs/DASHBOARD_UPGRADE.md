# Dashboard System - Complete Upgrade

**Status:** ✅ Implemented  
**Date:** December 22, 2024

---

## Overview

The dashboard has been completely redesigned from a basic lead counter to a comprehensive, role-specific analytics platform for roofing businesses. The new system provides real-time insights, actionable alerts, and personalized views based on user roles.

---

## Architecture

### **API Layer** (`lib/api/dashboard.ts`)

Provides aggregated analytics and metrics:

```typescript
getDashboardStats(companyId, userId?)     // Comprehensive statistics
getPipelineMetrics(companyId)             // Sales pipeline by stage
getRevenueByMonth(companyId)              // 6-month revenue trend
getUpcomingEvents(companyId, userId?)     // Calendar schedule
getRecentActivity(companyId)              // Activity feed
```

### **React Query Hooks** (`lib/hooks/use-dashboard.ts`)

- `useDashboardStats()` - Auto-refreshes every 2 minutes
- `usePipelineMetrics()` - Auto-refreshes every 5 minutes
- `useRevenueByMonth()` - Auto-refreshes every 10 minutes
- `useUpcomingEvents(myEventsOnly?, limit?)` - Auto-refreshes every minute
- `useRecentActivity(limit?)` - Auto-refreshes every 2 minutes

### **Widget Components** (`components/admin/dashboard/`)

Reusable, self-contained dashboard widgets:

1. **StatCard** - Key metric cards with icons and trend indicators
2. **MetricCard** - Smaller metric cards for inline display
3. **PipelineChart** - Bar chart showing leads by stage
4. **RevenueChart** - Line chart showing 6-month revenue trend
5. **UpcomingSchedule** - Calendar events widget
6. **RecentActivity** - Activity feed timeline
7. **UrgencyAlerts** - Action-required notifications
8. **CommissionTracker** - Sales commission summary

---

## Key Metrics Tracked

### **Lead Metrics**
- Total leads (all time)
- New leads today
- New leads this week
- Active leads (not closed/lost)

### **Quote/Estimate Metrics**
- Total quotes
- Pending quotes (sent but not signed)
- Quotes sent this week
- Quote win rate (% approved)

### **Financial Metrics**
- Total revenue (all time)
- Revenue this month
- Outstanding invoices
- Overdue invoices
- Total amount outstanding
- 6-month revenue trend

### **Production Metrics**
- Active projects (in production)
- Jobs scheduled this week
- Jobs completed this month

### **Commission Metrics** (User-Specific)
- Commissions earned this month
- Total commissions (all time)
- Leads closed this month
- Average commission per lead

### **Urgency Indicators**
- Overdue follow-ups
- Unsigned quotes older than 7 days
- Invoices 30+ days overdue

---

## Role-Specific Views

### **Sales & Marketing Users**
**Top Metrics:**
- Total Leads
- Active Leads
- Pending Quotes (with win rate)

**Widgets:**
- Commission Tracker (personalized)
- My Schedule (their appointments only)
- Sales Pipeline Chart
- Recent Activity Feed

**Focus:** Lead generation, quote conversion, commission tracking

---

### **Production Managers & Installers**
**Top Metrics:**
- Active Projects
- Jobs Scheduled This Week

**Widgets:**
- My Schedule (their jobs only)
- Recent Activity Feed

**Focus:** Job scheduling, production workflow

---

### **Office Users**
**Top Metrics:**
- Outstanding Invoices
- Revenue This Month

**Widgets:**
- Revenue Chart (6-month trend)
- Recent Activity Feed
- Urgency Alerts

**Focus:** Financial health, invoice management

---

### **Admin Users**
**Top Metrics:**
- Total Leads
- Active Leads
- Pending Quotes
- Outstanding Invoices
- Revenue This Month

**Widgets:**
- Sales Pipeline Chart
- Revenue Chart
- All Team Schedule
- Recent Activity Feed
- Urgency Alerts

**Focus:** Complete business overview

---

## Widget Descriptions

### **1. StatCard**
**Purpose:** Display key metrics with visual indicators  
**Features:**
- Large number display
- Icon with color coding
- Trend indicator (positive/negative/neutral)
- Clickable to navigate to detail view
- Loading skeleton state

**Colors:**
- Blue: Lead metrics
- Green: Growth/revenue metrics
- Purple: Quote metrics
- Orange: Production metrics
- Red: Urgency metrics
- Yellow: Outstanding items

---

### **2. PipelineChart**
**Purpose:** Visualize sales pipeline by stage  
**Features:**
- Bar chart showing lead count per stage
- Color-coded by stage (NEW_LEAD, QUOTE, PRODUCTION, INVOICED)
- Hover tooltip with count + potential revenue
- Legend showing all stages with totals

**Data:**
- Groups leads by main status
- Sums estimate totals for potential revenue
- Auto-refreshes every 5 minutes

---

### **3. RevenueChart**
**Purpose:** Show revenue trend over last 6 months  
**Features:**
- Line chart with smooth curves
- Total revenue summary
- Average revenue per month
- Hover tooltip with month details

**Calculation:**
- Sums paid invoices by month
- Shows invoice count per month
- Excludes draft invoices

---

### **4. UpcomingSchedule**
**Purpose:** Display upcoming calendar events  
**Features:**
- Next 5 events (configurable)
- Event type color coding
- Time until event ("in 2 hours")
- Lead name and address
- Click to view in calendar

**Modes:**
- `myEventsOnly=false` - All team events (admin)
- `myEventsOnly=true` - User's assigned events (everyone else)

---

### **5. RecentActivity**
**Purpose:** Activity feed showing recent system events  
**Features:**
- Last 10 activities (configurable)
- Activity type icons and colors
- Timestamp ("3 minutes ago")
- Amount shown for payments
- Mixed feed of leads, quotes, payments

**Activity Types:**
- 🔵 Lead Created
- 🟣 Quote Sent
- 🟢 Quote Signed
- 🟢 Invoice Paid
- 💚 Payment Received

---

### **6. UrgencyAlerts**
**Purpose:** Highlight items requiring immediate attention  
**Features:**
- Only shows if alerts exist
- "All caught up!" message when clear
- Click to filter relevant list view
- Color-coded severity

**Alert Types:**
- 🟡 Unsigned Quotes (7+ days old)
- 🔴 Invoices 30+ Days Overdue
- 🟠 Overdue Follow-ups (future: requires activities table)

---

### **7. CommissionTracker**
**Purpose:** Show sales user's commission earnings  
**Features:**
- This month earnings
- Total all-time earnings
- Lead count this month
- Average commission per lead
- Gradient background for emphasis

**Visibility:** Sales and Marketing roles only

---

## Data Refresh Strategy

| Hook | Refresh Interval | Reason |
|------|-----------------|---------|
| `useDashboardStats` | 2 minutes | Frequently changing data |
| `usePipelineMetrics` | 5 minutes | Less volatile, heavier query |
| `useRevenueByMonth` | 10 minutes | Historical data, rarely changes |
| `useUpcomingEvents` | 1 minute | Time-sensitive, needs accuracy |
| `useRecentActivity` | 2 minutes | User expects recent updates |

All data automatically refetches on:
- Window focus
- Tab visibility change
- Network reconnection
- Manual invalidation (after mutations)

---

## Performance Optimizations

### **1. Selective Loading**
- Only fetch data needed for user's role
- Widgets lazy load when scrolled into view

### **2. Efficient Queries**
- Single `getDashboardStats()` call for all metrics
- Reuses data across multiple StatCards
- Minimal database queries (aggregated in API)

### **3. Smart Caching**
- React Query cache prevents duplicate requests
- Stale data shown while refetching in background
- Cache invalidation on related mutations

### **4. Loading States**
- Skeleton loaders prevent layout shift
- Graceful fallbacks for missing data
- Progressive enhancement

---

## Database Queries

### **Lead Metrics**
```sql
-- All queries filter by company_id and deleted_at IS NULL
SELECT COUNT(*) FROM leads WHERE company_id = ? AND deleted_at IS NULL
SELECT COUNT(*) FROM leads WHERE created_at >= ? -- today/week
```

### **Quote Metrics**
```sql
SELECT COUNT(*), status FROM estimates 
WHERE company_id = ? AND deleted_at IS NULL
GROUP BY status
```

### **Financial Metrics**
```sql
SELECT SUM(total), SUM(balance_due) FROM invoices
WHERE company_id = ? AND status IN ('sent', 'overdue')
AND deleted_at IS NULL
```

### **Revenue Trend**
```sql
SELECT SUM(total), COUNT(*) FROM invoices
WHERE company_id = ? AND status = 'paid'
AND created_at BETWEEN ? AND ?
GROUP BY EXTRACT(MONTH FROM created_at)
```

---

## Future Enhancements

### **Phase 2 Features**
- [ ] Customizable dashboard layouts (drag-and-drop widgets)
- [ ] Dashboard templates by role
- [ ] Export dashboard as PDF report
- [ ] Email daily/weekly dashboard summaries
- [ ] Custom date range filters
- [ ] Comparison vs previous period
- [ ] Goal setting and tracking

### **Additional Widgets**
- [ ] Top performing sales reps leaderboard
- [ ] Lead source performance chart
- [ ] Service type breakdown (pie chart)
- [ ] Weather forecast for production planning
- [ ] Material inventory alerts
- [ ] Customer satisfaction scores
- [ ] Conversion funnel visualization

### **Advanced Analytics**
- [ ] Predictive revenue forecasting
- [ ] Lead scoring and prioritization
- [ ] Churn risk indicators
- [ ] Seasonal trend analysis
- [ ] ROI by marketing channel

---

## Testing Checklist

### **Functional Tests**
- [ ] All widgets load correctly for each role
- [ ] Metrics calculate accurately
- [ ] Charts render without errors
- [ ] Click actions navigate to correct pages
- [ ] Empty states display appropriately
- [ ] Loading states show during data fetch

### **Role-Based Tests**
- [ ] Sales user sees commission tracker
- [ ] Admin sees all widgets
- [ ] Office sees financial metrics
- [ ] Production sees job metrics
- [ ] Users only see their own schedule (non-admin)

### **Performance Tests**
- [ ] Dashboard loads in < 2 seconds
- [ ] Widgets don't block each other
- [ ] Auto-refresh doesn't cause lag
- [ ] Mobile responsive on all screen sizes

### **Data Accuracy Tests**
- [ ] Lead counts match actual database
- [ ] Revenue totals are correct
- [ ] Win rate calculation is accurate
- [ ] Time-based filters work correctly
- [ ] Commission totals match user records

---

## Troubleshooting

### **Widgets Not Loading**
1. Check browser console for errors
2. Verify company_id is set
3. Check RLS policies on queried tables
4. Ensure user has proper permissions

### **Incorrect Metrics**
1. Verify date range calculations (timezone issues)
2. Check deleted_at filtering
3. Confirm status values match enums
4. Test queries directly in Supabase SQL editor

### **Performance Issues**
1. Check network tab for slow queries
2. Add database indexes on frequently queried columns
3. Reduce refresh intervals
4. Consider caching heavy aggregations

---

## Maintenance

### **Adding New Widgets**
1. Create component in `components/admin/dashboard/`
2. Add API function to `lib/api/dashboard.ts` (if new data needed)
3. Create hook in `lib/hooks/use-dashboard.ts`
4. Import and use in `app/(admin)/admin/dashboard/page.tsx`
5. Update this documentation

### **Adding New Metrics**
1. Update `DashboardStats` interface
2. Add query to `getDashboardStats()`
3. Use in widget components
4. Test accuracy with real data

---

**Questions?** See `PRODUCT_ROADMAP.md` for dashboard upgrade roadmap context.
