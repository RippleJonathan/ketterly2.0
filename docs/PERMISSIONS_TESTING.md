# Permission System Testing Guide

This guide provides comprehensive testing procedures for the Ketterly CRM permission system.

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [UI Testing](#ui-testing)
4. [Permission Enforcement Testing](#permission-enforcement-testing)
5. [Role Template Testing](#role-template-testing)
6. [Multi-Tenant Testing](#multi-tenant-testing)
7. [API Testing](#api-testing)
8. [Edge Cases & Security](#edge-cases--security)
9. [Automated Testing](#automated-testing)

---

## Overview

The permission system has **44 permissions** across **9 categories**. Testing ensures:
- ✅ Permissions are enforced correctly
- ✅ UI respects permission states
- ✅ Multi-tenant isolation is maintained
- ✅ Role templates work as expected
- ✅ Security vulnerabilities are prevented

---

## Test Environment Setup

### Prerequisites

1. **Two Test Companies**
   - Company A: "Test Roofing Co"
   - Company B: "Demo Construction"

2. **Test Users Per Company**
   - Admin user (all permissions)
   - Office user (office role template)
   - Sales user (sales role template)
   - Production user (production role template)
   - Limited user (only 2-3 permissions)
   - No-permissions user (0 permissions)

### Setup Script

```sql
-- Create test companies
INSERT INTO companies (name, slug) VALUES
  ('Test Roofing Co', 'test-roofing-co'),
  ('Demo Construction', 'demo-construction');

-- Create test users for Company A
-- (Use Supabase Auth UI or API to create auth.users first)

-- Then insert into public.users and user_permissions
-- See supabase/seed.sql for examples
```

---

## UI Testing

### 1. Permission Manager Component

**Location:** Admin → Users → [Select User] → Manage Permissions

#### Test Cases

- [ ] **TC-UI-01: Dialog Opens**
  - Click "Manage Permissions" on a user
  - Verify dialog opens with user's name in title
  - Verify current role badge is shown

- [ ] **TC-UI-02: Permission Stats**
  - Verify stats bar shows correct count (X / 44)
  - Verify progress bar fills proportionally
  - Toggle a permission and verify count updates

- [ ] **TC-UI-03: Category Display**
  - Verify all 9 categories are displayed
  - Verify category icons are shown
  - Verify permission count badge per category (X / Y)
  - Expand/collapse categories work

- [ ] **TC-UI-04: Permission Toggles**
  - Toggle individual permissions on/off
  - Verify checkbox state updates immediately
  - Verify visual feedback (highlight when enabled)
  - Verify tooltip/description shows on hover

- [ ] **TC-UI-05: Bulk Actions**
  - Click "Enable All" → verify all 44 enabled
  - Click "Disable All" → verify all disabled (except protected)
  - Click "Select All" in category → verify category enabled
  - Click "Deselect All" in category → verify category disabled

- [ ] **TC-UI-06: Search Functionality**
  - Search "leads" → verify only lead permissions shown
  - Search "create" → verify all create permissions shown
  - Clear search → verify all permissions return
  - Search with no results → verify appropriate message

- [ ] **TC-UI-07: Role Templates Tab**
  - Switch to "Role Templates" tab
  - Verify 6 templates shown (admin, office, sales_manager, sales, production, marketing)
  - Click template → verify permissions update
  - Verify template shows permission count
  - Verify selected template is highlighted

- [ ] **TC-UI-08: Save/Cancel**
  - Make changes → verify "Unsaved changes" warning appears
  - Click Cancel → verify changes not saved
  - Make changes → click Save → verify success toast
  - Reopen dialog → verify changes persisted

- [ ] **TC-UI-09: Reset Button**
  - Make changes → click Reset → verify reverted to saved state
  - Verify Reset button disabled when no changes

- [ ] **TC-UI-10: Responsive Design**
  - Test on desktop (1920x1080)
  - Test on laptop (1366x768)
  - Test on tablet (768x1024)
  - Test on mobile (375x667)
  - Verify layout adapts properly

### 2. User List Integration

- [ ] **TC-UI-11: Permission Badge**
  - Verify user list shows permission count per user
  - Verify badge updates after permission changes

- [ ] **TC-UI-12: Actions Menu**
  - Verify "Manage Permissions" option in user actions
  - Verify only visible to users with `can_manage_permissions`

---

## Permission Enforcement Testing

### 1. Leads Feature

#### View Permission (`can_view_leads`)

- [ ] **TC-PERM-01: View Access**
  - User WITHOUT `can_view_leads`:
    - Navigate to /admin/leads → should redirect to /admin/dashboard
    - Sidebar should not show "Leads" link
  - User WITH `can_view_leads`:
    - Navigate to /admin/leads → should show leads page
    - Sidebar should show "Leads" link

#### Create Permission (`can_create_leads`)

- [ ] **TC-PERM-02: Create Access**
  - User WITHOUT `can_create_leads`:
    - "Create Lead" button should not be visible
    - API call to create lead should return 403
  - User WITH `can_create_leads`:
    - "Create Lead" button should be visible
    - Should be able to create leads successfully

#### Edit Permission (`can_edit_leads`)

- [ ] **TC-PERM-03: Edit Access**
  - User WITHOUT `can_edit_leads`:
    - "Edit" button should not be visible on leads
    - API call to update lead should return 403
  - User WITH `can_edit_leads`:
    - "Edit" button should be visible
    - Should be able to update leads successfully

#### Delete Permission (`can_delete_leads`)

- [ ] **TC-PERM-04: Delete Access**
  - User WITHOUT `can_delete_leads`:
    - "Delete" button should not be visible
    - API call to delete lead should return 403
  - User WITH `can_delete_leads`:
    - "Delete" button should be visible
    - Should be able to soft-delete leads successfully

### 2. Quotes Feature

Repeat similar tests for all quote permissions:
- [ ] TC-PERM-05: `can_view_quotes`
- [ ] TC-PERM-06: `can_create_quotes`
- [ ] TC-PERM-07: `can_edit_quotes`
- [ ] TC-PERM-08: `can_delete_quotes`
- [ ] TC-PERM-09: `can_approve_quotes`
- [ ] TC-PERM-10: `can_send_quotes`

### 3. Invoices & Payments Feature

- [ ] TC-PERM-11: `can_view_invoices`
- [ ] TC-PERM-12: `can_create_invoices`
- [ ] TC-PERM-13: `can_edit_invoices`
- [ ] TC-PERM-14: `can_delete_invoices`
- [ ] TC-PERM-15: `can_record_payments`
- [ ] TC-PERM-16: `can_void_payments`

### 4. Users & Settings

- [ ] **TC-PERM-17: User Management**
  - User WITHOUT `can_view_users`:
    - Should not see Users menu item
    - Should not access /admin/users
  - User WITH `can_view_users` but WITHOUT `can_manage_permissions`:
    - Should see user list
    - Should NOT see "Manage Permissions" action

- [ ] **TC-PERM-18: Critical Permissions**
  - Test `can_manage_permissions`:
    - Only admins should have this
    - Should prevent self-removal
  - Test `can_delete_users`:
    - Only admins should have this
    - Should warn before deleting users

### 5. Financial Permissions

- [ ] **TC-PERM-19: Financial Visibility**
  - User WITHOUT `can_view_financials`:
    - Should not see profit/revenue in reports
    - Dashboard should hide financial widgets
  - User WITH `can_view_financials`:
    - Should see full financial data

- [ ] **TC-PERM-20: Profit Margins**
  - User WITHOUT `can_view_profit_margins`:
    - Should see revenue but not costs/margins
  - User WITH `can_view_profit_margins`:
    - Should see cost breakdown and margins

---

## Role Template Testing

### Admin Role (42/44 permissions)

- [ ] **TC-ROLE-01: Admin Access**
  - Apply admin template
  - Verify can access all features
  - Verify can manage all users
  - Verify can view all reports
  - Verify has `can_manage_permissions`
  - Verify has `can_edit_company_settings`

### Office Role (28/44 permissions)

- [ ] **TC-ROLE-02: Office Access**
  - Apply office template
  - Verify can create/edit quotes ✓
  - Verify can create/edit invoices ✓
  - Verify can manage customers ✓
  - Verify CANNOT delete anything ✗
  - Verify CANNOT view financials ✗
  - Verify CANNOT manage users ✗

### Sales Manager Role (25/44 permissions)

- [ ] **TC-ROLE-03: Sales Manager Access**
  - Apply sales_manager template
  - Verify can view all leads ✓
  - Verify can approve quotes ✓
  - Verify can view team commissions ✓
  - Verify CANNOT create invoices ✗
  - Verify CANNOT manage users ✗

### Sales Role (17/44 permissions)

- [ ] **TC-ROLE-04: Sales Access**
  - Apply sales template
  - Verify can create leads ✓
  - Verify can create quotes ✓
  - Verify can view only assigned leads ✓
  - Verify CANNOT approve quotes ✗
  - Verify CANNOT view all leads ✗
  - Verify CANNOT access work orders ✗

### Production Role (12/44 permissions)

- [ ] **TC-ROLE-05: Production Access**
  - Apply production template
  - Verify can view work orders ✓
  - Verify can upload photos ✓
  - Verify can update project status ✓
  - Verify CANNOT view leads ✗
  - Verify CANNOT view quotes ✗
  - Verify CANNOT view financials ✗

### Marketing Role (16/44 permissions)

- [ ] **TC-ROLE-06: Marketing Access**
  - Apply marketing template
  - Verify can create leads ✓
  - Verify can view all leads ✓
  - Verify can view reports ✓
  - Verify CANNOT create quotes ✗
  - Verify CANNOT view financials (detailed) ✗

---

## Multi-Tenant Testing

### Permission Isolation

- [ ] **TC-TENANT-01: Permission Visibility**
  - Login as Company A admin
  - Create user and set permissions
  - Login as Company B admin
  - Verify cannot see Company A's user permissions

- [ ] **TC-TENANT-02: Permission Management**
  - Login as Company A admin
  - Attempt to modify Company B user permissions via API
  - Verify returns 403 or not found

- [ ] **TC-TENANT-03: Data Access**
  - Login as Company A sales user (limited permissions)
  - Verify can only see Company A leads
  - Verify cannot access Company B data even if URLs known

---

## API Testing

### Permission Check Endpoints

```bash
# Get user permissions
curl -X GET 'https://[project].supabase.co/rest/v1/user_permissions?user_id=eq.[USER_ID]' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [USER_JWT]"

# Update permissions
curl -X PATCH 'https://[project].supabase.co/rest/v1/user_permissions?user_id=eq.[USER_ID]' \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ADMIN_JWT]" \
  -H "Content-Type: application/json" \
  -d '{"can_create_leads": true}'
```

### Test Cases

- [ ] **TC-API-01: Get Permissions**
  - Request own permissions → should succeed
  - Request other user's permissions in same company → should succeed if admin
  - Request other company user's permissions → should fail

- [ ] **TC-API-02: Update Permissions**
  - Admin updates user permissions → should succeed
  - Non-admin updates permissions → should fail
  - User updates own permissions → should fail

- [ ] **TC-API-03: Permission-Gated Endpoints**
  - Test each CRUD endpoint requires appropriate permission
  - Test without permission → should return 403
  - Test with permission → should succeed

---

## Edge Cases & Security

### Critical Security Tests

- [ ] **TC-SEC-01: Self-Permission Escalation**
  - User attempts to grant self `can_manage_permissions`
  - Verify blocked by UI and API

- [ ] **TC-SEC-02: Cross-Tenant Permission Injection**
  - User A tries to inject Company B's company_id in permission update
  - Verify blocked by RLS

- [ ] **TC-SEC-03: Permission Bypass Attempts**
  - User without `can_view_leads` attempts direct API call to /leads
  - Verify RLS blocks response
  - Verify empty data returned, not error exposing existence

- [ ] **TC-SEC-04: Token Manipulation**
  - User modifies JWT token to claim different permissions
  - Verify server validates against database
  - Verify unauthorized access blocked

### Edge Cases

- [ ] **TC-EDGE-01: User With Zero Permissions**
  - Create user with no permissions
  - Verify can login but sees minimal UI
  - Verify redirects to dashboard with "no access" message

- [ ] **TC-EDGE-02: User With All Permissions**
  - Grant user all 44 permissions
  - Verify can access all features
  - Verify no UI elements hidden

- [ ] **TC-EDGE-03: Partial Category Permissions**
  - Grant only `can_view_leads` and `can_edit_leads` (skip create/delete)
  - Verify can view and edit but not create or delete
  - Verify UI reflects partial access

- [ ] **TC-EDGE-04: Permission Race Conditions**
  - Have 2 admins update same user's permissions simultaneously
  - Verify last write wins
  - Verify no data corruption

- [ ] **TC-EDGE-05: Deleted User Permissions**
  - Soft-delete user (set deleted_at)
  - Verify permissions still in database
  - Verify cannot login/access system
  - Restore user → verify permissions intact

---

## Automated Testing

### Unit Tests

```typescript
// tests/utils/permissions.test.ts
import { describe, it, expect } from 'vitest'
import { hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/utils/permissions'

describe('Permission Utilities', () => {
  const mockPermissions = {
    can_view_leads: true,
    can_create_leads: true,
    can_edit_leads: false,
    can_delete_leads: false,
    // ... other permissions
  }

  it('should check single permission', () => {
    expect(hasPermission(mockPermissions, 'can_view_leads')).toBe(true)
    expect(hasPermission(mockPermissions, 'can_delete_leads')).toBe(false)
  })

  it('should check all permissions', () => {
    expect(hasAllPermissions(mockPermissions, ['can_view_leads', 'can_create_leads'])).toBe(true)
    expect(hasAllPermissions(mockPermissions, ['can_view_leads', 'can_delete_leads'])).toBe(false)
  })

  it('should check any permission', () => {
    expect(hasAnyPermission(mockPermissions, ['can_create_leads', 'can_delete_leads'])).toBe(true)
    expect(hasAnyPermission(mockPermissions, ['can_delete_leads', 'can_edit_leads'])).toBe(false)
  })
})
```

### Integration Tests

```typescript
// tests/api/permissions.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Permission API', () => {
  let supabase
  let testUserId

  beforeEach(async () => {
    // Setup test user
  })

  it('should update user permissions', async () => {
    const { data, error } = await supabase
      .from('user_permissions')
      .update({ can_create_leads: true })
      .eq('user_id', testUserId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.can_create_leads).toBe(true)
  })

  it('should enforce RLS on permission updates', async () => {
    // Try to update different company's user
    const { error } = await supabase
      .from('user_permissions')
      .update({ can_create_leads: true })
      .eq('user_id', otherCompanyUserId)

    expect(error).toBeTruthy()
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/permissions.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Permission Management', () => {
  test('admin can manage user permissions', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')

    // Navigate to users
    await page.goto('/admin/users')
    
    // Open permissions manager
    await page.click('button:has-text("Manage Permissions")')
    
    // Toggle permission
    await page.click('input[id="can_create_leads"]')
    
    // Save
    await page.click('button:has-text("Save Permissions")')
    
    // Verify success
    await expect(page.locator('text=Permissions updated successfully')).toBeVisible()
  })

  test('non-admin cannot access permission management', async ({ page }) => {
    // Login as sales user
    await page.goto('/login')
    await page.fill('input[name="email"]', 'sales@test.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')

    // Try to navigate to users
    await page.goto('/admin/users')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/admin/dashboard')
  })
})
```

---

## Test Report Template

```markdown
# Permission System Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Production/Staging/Dev]

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Blocked: X

## Failed Tests
| Test ID | Description | Expected | Actual | Severity |
|---------|-------------|----------|--------|----------|
| TC-PERM-05 | Quote view permission | Redirect to dashboard | Shows error page | High |

## Issues Found
1. **Issue #1:** [Description]
   - Severity: High/Medium/Low
   - Steps to Reproduce: ...
   - Expected: ...
   - Actual: ...

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## Troubleshooting Test Failures

### Common Issues

1. **RLS Policy Errors**
   ```sql
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'user_permissions';
   
   -- Test RLS as specific user
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims TO '{"sub": "[USER_ID]"}';
   SELECT * FROM user_permissions;
   ```

2. **React Query Cache Issues**
   - Clear browser cache
   - Hard refresh (Ctrl+Shift+R)
   - Check React Query DevTools

3. **Permission Not Persisting**
   - Check database updated_at timestamp
   - Verify no client-side caching
   - Check for transaction rollbacks

---

## Continuous Testing

### Daily Tests
- [ ] Smoke test: Admin can manage permissions
- [ ] Smoke test: Sales user cannot delete leads

### Weekly Tests
- [ ] Full role template verification
- [ ] Multi-tenant isolation checks
- [ ] Performance test (loading 100+ users)

### Before Release
- [ ] Run full test suite
- [ ] Security audit
- [ ] Load testing
- [ ] User acceptance testing

---

**Version:** 1.0.0  
**Last Updated:** December 11, 2024
