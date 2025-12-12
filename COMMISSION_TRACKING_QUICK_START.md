# Quick Start: Using the Commission System

## For Developers

### Add Commission to a Lead (Code Example)

```typescript
import { useCreateLeadCommission } from '@/lib/hooks/use-lead-commissions'
import { useCurrentUser } from '@/lib/hooks/use-current-user'

function MyComponent() {
  const createCommission = useCreateLeadCommission()
  const { data: currentUser } = useCurrentUser()

  const handleAddCommission = async () => {
    await createCommission.mutateAsync({
      leadId: 'lead-uuid',
      data: {
        user_id: 'sales-rep-uuid',
        commission_type: 'percentage',
        commission_rate: 10, // 10%
        base_amount: 10000, // $10,000 quote
        calculated_amount: 1000, // Auto-calculated: $1,000
        paid_when: 'when_final_payment',
        created_by: currentUser!.id,
      }
    })
  }
}
```

### Query Commissions

```typescript
import { useLeadCommissions } from '@/lib/hooks/use-lead-commissions'

function CommissionsList({ leadId }: { leadId: string }) {
  const { data: commissionsData, isLoading } = useLeadCommissions(leadId)
  const commissions = commissionsData?.data || []
  
  return (
    <div>
      {commissions.map(c => (
        <div key={c.id}>
          {c.user?.full_name}: {formatCurrency(c.calculated_amount)}
        </div>
      ))}
    </div>
  )
}
```

---

## For End Users

### Adding a Commission

1. Navigate to a lead detail page
2. Click the **Commissions** tab (Banknote icon)
3. Click **Add Commission** button
4. Fill out the form:
   - **Select User** - Who gets the commission
   - **Commission Plan** - Optional, select existing plan
   - **Commission Type** - Choose one:
     - **Percentage** - Enter % rate (e.g., 10%)
     - **Flat Amount** - Enter dollar amount (e.g., $500)
     - **Custom** - Manual calculation
   - **Base Amount** - What to calculate on (usually quote total)
   - **Paid When** - When commission is earned:
     - When Deposit Paid
     - When Job Completed
     - When Final Payment Received
   - **Notes** - Optional notes
5. Review calculated amount (shows live)
6. Click **Create Commission**

### Marking a Commission as Paid

1. Go to lead's Commissions tab
2. Find the commission to mark paid
3. Click the **checkmark icon** (✓)
4. Add payment notes (optional): check number, transaction ID, etc.
5. Click **Confirm Payment**
6. Status updates to "Paid" (green badge)
7. Paid date and paid by user are recorded

### Editing a Commission

1. Go to lead's Commissions tab
2. Click **pencil icon** on the commission
3. Update fields as needed
4. Click **Update Commission**

**Note:** Cannot edit commissions that are already paid.

### Deleting a Commission

1. Go to lead's Commissions tab
2. Click **trash icon** on the commission
3. Confirm deletion
4. Commission is removed (soft deleted)

**Note:** Cannot delete commissions that are already paid.

---

## Commission Calculations

### Percentage Commission
- Formula: `base_amount × (rate / 100)`
- Example: $10,000 × (10 / 100) = $1,000

### Flat Amount
- Formula: `flat_amount`
- Example: $500 (fixed, regardless of base)

### Custom
- Manually entered amount

---

## Common Workflows

### Single Sales Rep Commission
```
Lead → Quote $10,000
↓
Add Commission:
  User: John Smith
  Type: Percentage
  Rate: 10%
  Base: $10,000
  Calculated: $1,000
  Paid When: When Final Payment
```

### Split Commission (Two Reps)
```
Lead → Quote $10,000
↓
Add Commission #1:
  User: John Smith (Closer)
  Type: Percentage
  Rate: 7%
  Calculated: $700
↓
Add Commission #2:
  User: Jane Doe (Lead Gen)
  Type: Percentage
  Rate: 3%
  Calculated: $300
↓
Total: $1,000
```

### Flat Fee for Referral
```
Lead → Quote $10,000
↓
Add Commission:
  User: Referral Partner
  Type: Flat Amount
  Amount: $250
  Paid When: When Deposit Paid
```

---

## Permission Requirements

| Action | Permission Required |
|--------|---------------------|
| View Commissions Tab | `can_view_commissions` |
| Add Commission | `can_manage_commissions` |
| Edit Commission | `can_manage_commissions` |
| Delete Commission | `can_manage_commissions` |
| Mark as Paid | `can_mark_commissions_paid` |

### Who Has What Access?

- **Admin** - All permissions ✅
- **Office** - All permissions ✅
- **Sales Manager** - View + Manage (cannot mark paid)
- **Sales** - View only
- **Production** - No access
- **Marketing** - No access

---

## Tips & Best Practices

### 1. Use Commission Plans for Consistency
- Create standard plans (e.g., "Standard Sales: 10%")
- Apply to multiple users
- Easy to update rates company-wide

### 2. Set Base Amount Correctly
- Usually = Quote Total
- Can also be: Revenue, Profit, or Custom
- Document what base represents in notes

### 3. Track Payment Triggers
- "When Deposit Paid" - Immediate commission
- "When Job Completed" - After job done
- "When Final Payment" - After full payment received
- Helps with cash flow planning

### 4. Use Notes Field
- Document special agreements
- Track exceptions or adjustments
- Reference related documents

### 5. Regular Reconciliation
- Review pending commissions weekly
- Mark as paid promptly
- Keep payment notes detailed

### 6. Split Commissions Clearly
- Add separate commission for each user
- Document split agreement in notes
- Total should equal expected commission

---

## Troubleshooting

**Q: I don't see the Commissions tab**  
A: Check with admin - you may need `can_view_commissions` permission.

**Q: "Add Commission" button is missing**  
A: You need `can_manage_commissions` permission.

**Q: Cannot mark commission as paid**  
A: You need `can_mark_commissions_paid` permission (Admin or Office roles).

**Q: Calculated amount seems wrong**  
A: Double-check the commission type matches your rate/amount. For percentage, verify base amount is correct.

**Q: Commission disappeared after deleting**  
A: It's soft-deleted (not permanently removed). Contact admin to restore if needed.

**Q: Can't edit a commission**  
A: Once marked as paid, commissions cannot be edited. Contact admin to adjust.

---

## FAQ

**Q: Can I have multiple commissions for one user on one lead?**  
A: Yes! Add as many as needed (e.g., base commission + bonus).

**Q: What happens when I delete a lead?**  
A: Commissions are cascade deleted (database foreign key).

**Q: Can I export commission data?**  
A: Not yet - feature planned for future release. Currently view per-lead only.

**Q: How do commission plans work?**  
A: Plans are templates you can apply when creating commissions. They pre-fill type and rate.

**Q: What if the quote changes after commission is created?**  
A: Commission base amount doesn't auto-update. Edit the commission to adjust.

**Q: Can commissions be negative?**  
A: No, schema prevents negative amounts (validation check).

**Q: Is there a commission report?**  
A: Not yet - planned enhancement. Currently view per-lead in Commissions tab.

---

## Video Tutorials (Coming Soon)

- [ ] How to Add a Commission
- [ ] Managing Commission Plans  
- [ ] Marking Commissions as Paid
- [ ] Setting Up Split Commissions
- [ ] Understanding Payment Triggers

---

**Last Updated:** December 12, 2024  
**Version:** 1.0  
**Need Help?** Contact your system administrator
