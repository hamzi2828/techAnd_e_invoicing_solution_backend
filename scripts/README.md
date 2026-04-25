# Plan Management Scripts

## Quick Reference

### Switch User to Enterprise Plan

```bash
node scripts/switchPlan.js <email> <plan-name>
```

**Examples:**
```bash
# Switch to Enterprise
node scripts/switchPlan.js hamzahashmi640@gmail.com Enterprise

# Switch to Professional
node scripts/switchPlan.js hamzahashmi640@gmail.com Professional

# Switch to Free
node scripts/switchPlan.js hamzahashmi640@gmail.com Free
```

---

## Available Plans

| Plan | Monthly Price | Key Features |
|------|---------------|--------------|
| Free | SAR 0 | 50 invoices/month, 1 user, Phase 1 only |
| Basic | SAR 99 | 300 invoices/month, 1 user, Phase 1 only |
| Professional | SAR 299 | 5,000 invoices/month, 5 users, Phase 1 & 2 |
| Enterprise | SAR 999 | Unlimited, unlimited users, Full features |

---

## How It Works

The script updates:
1. **Subscription model** - The active subscription record (Settings page)
2. **User model** - The `currentPlanId` and `subscriptionStatus` fields
3. **UsageTracker model** - The usage limits (Dashboard page)

It also:
- Cancels any duplicate subscriptions
- Resets the billing period to start from today
- Sets subscription status to "active"
- Updates usage limits to match the new plan

---

## Troubleshooting

**UI still shows old plan?**
- Hard refresh browser (Ctrl+Shift+R)
- Check if there are multiple active subscriptions
- Run `node scripts/switchPlan.js` without arguments to see all users and their subscriptions

**Plan not found?**
- Run the seeder first: `node seeders/paymentPlanSeeder.js`
