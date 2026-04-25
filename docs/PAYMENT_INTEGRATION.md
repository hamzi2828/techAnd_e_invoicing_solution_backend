# Payment Integration Guide

## Overview

This application uses **Moyasar** as the primary payment gateway for processing subscriptions and payments in Saudi Arabia.

## Payment Gateway

| Provider | Status | Region |
|----------|--------|--------|
| Moyasar | Active | Saudi Arabia |
| Stripe | Legacy (disabled) | Global |

## Supported Payment Methods

- Visa
- Mastercard
- Mada (Saudi domestic cards)
- STC Pay
- Apple Pay

---

## Test Mode

### Environment Variables

```env
MOYASAR_SECRET_KEY=sk_test_xxxxx
MOYASAR_PUBLISHABLE_KEY=pk_test_xxxxx
MOYASAR_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

### Test Cards

#### Successful Payment

| Card Type | Card Number | Expiry | CVC |
|-----------|-------------|--------|-----|
| Visa | `4111 1111 1111 1111` | `12/29` | `123` |
| Mastercard | `5500 0000 0000 0004` | `12/29` | `123` |
| Mada | `5897 3400 0000 0005` | `12/29` | `123` |

#### Failed Payment

| Scenario | Card Number |
|----------|-------------|
| Declined | `4000 0000 0000 0002` |
| Insufficient Funds | `4000 0000 0000 9995` |

### 3D Secure (3DS) Testing

When testing payments, a 3DS emulator will appear. Select the appropriate option:

| Option | Result |
|--------|--------|
| **(Y) Authenticated** | Payment succeeds |
| **(N) Not Authenticated** | Payment fails |

**Important:** Always select **(Y) Authenticated** for successful test payments.

---

## Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User selects plan on Pricing Page                       │
│     GET /#pricing                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Redirect to Checkout                                    │
│     GET /payment/checkout?planId=xxx&price=99&billing=monthly│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Frontend requests checkout session                      │
│     POST /api/payments/checkout                             │
│     Body: { paymentPlanId, amount, currency, billingCycle } │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Moyasar form loads with publishable key                 │
│     - Amount converted to halalas (SAR × 100)               │
│     - VAT (15%) included in total                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  5. User enters card details and pays                       │
│     - 3DS authentication (if required)                      │
│     - Moyasar processes payment                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Redirect to callback                                    │
│     GET /payment/callback?id=pay_xxx&status=paid            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Frontend confirms payment                               │
│     POST /api/payments/confirm                              │
│     Body: { paymentId: "pay_xxx" }                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  8. Backend creates:                                        │
│     - Payment record (status: succeeded)                    │
│     - Subscription record (status: active)                  │
│     - Updates User (subscriptionStatus: active)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  9. Success page displayed                                  │
│     User redirected to Dashboard                            │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/config` | Get Moyasar publishable key |
| POST | `/api/payments/webhook` | Handle Moyasar webhooks |

### Protected Endpoints (Require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/checkout` | Create checkout session |
| POST | `/api/payments/confirm` | Verify payment status |
| GET | `/api/payments/history` | Get payment history |
| POST | `/api/payments/refund` | Request refund |
| POST | `/api/payments/subscribe` | Create subscription |
| POST | `/api/payments/subscribe/free` | Activate free plan |
| DELETE | `/api/payments/subscription/cancel` | Cancel subscription |
| GET | `/api/payments/subscriptions` | Get user subscriptions |
| GET | `/api/payments/invoices` | Get invoices |

---

## Currency & Amount Handling

| Display | Storage | API |
|---------|---------|-----|
| 99.00 SAR | 9900 halalas | 9900 |
| 113.85 SAR | 11385 halalas | 11385 |

**Formula:** `amount_in_halalas = amount_in_sar × 100`

---

## VAT Calculation

Saudi Arabia VAT rate: **15%**

```javascript
const subtotal = 99.00;           // Plan price
const vatRate = 0.15;             // 15%
const vatAmount = subtotal * vatRate;  // 14.85
const total = subtotal + vatAmount;    // 113.85
```

---

## Database Models

### Payment

```javascript
{
  userId: ObjectId,
  moyasarPaymentId: String,      // "pay_xxx" from Moyasar
  paymentGateway: "moyasar",
  paymentPlanId: ObjectId,
  amount: Number,                // In halalas
  currency: "SAR",
  status: "succeeded",           // pending, succeeded, failed, refunded
  paymentMethod: {
    type: "card",
    brand: "visa",
    last4: "1111"
  },
  paidAt: Date,
  createdAt: Date
}
```

### Subscription

```javascript
{
  userId: ObjectId,
  subscriptionId: String,        // "moyasar_sub_xxx"
  paymentPlanId: ObjectId,
  status: "active",              // active, canceled, expired
  billingCycle: "monthly",       // monthly, yearly
  unitAmount: Number,            // In halalas
  currency: "SAR",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,        // Next billing date
  cancelAtPeriodEnd: Boolean
}
```

---

## Webhook Events

| Event | Description | Action |
|-------|-------------|--------|
| `payment_paid` | Payment successful | Create subscription, update user |
| `payment_failed` | Payment declined | Mark payment as failed |
| `payment_refunded` | Refund processed | Update payment status |
| `payment_voided` | Payment canceled | Mark as canceled |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `DECLINED: INVALID CARD` | Wrong test card | Use `4111 1111 1111 1111` |
| `3DS: Card authentication declined` | Selected (N) on 3DS | Select (Y) Authenticated |
| `E11000 duplicate key` | Database index issue | Run index fix script |
| `Amount is required` | Missing price in URL | Check checkout URL params |

### Index Fix Script

If you encounter duplicate key errors:

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('payments').dropIndex('stripePaymentIntentId_1');
  await db.collection('payments').createIndex(
    { stripePaymentIntentId: 1 },
    { unique: true, sparse: true }
  );
  console.log('Index fixed');
  process.exit(0);
});
"
```

---

## File Structure

```
src/
├── controllers/
│   ├── payment.controller.js    # Payment route handlers
│   └── moyasar.controller.js    # Moyasar-specific handlers
├── services/
│   └── moyasarService.js        # Moyasar API integration
├── models/
│   ├── Payment.js               # Payment schema
│   ├── Subscription.js          # Subscription schema
│   └── PaymentPlan.js           # Plan schema
├── routes/
│   ├── payment.routes.js        # Payment API routes
│   └── moyasar.routes.js        # Moyasar routes
└── middleware/
    └── auth.js                  # JWT authentication
```

---

## Production Checklist

- [ ] Replace test API keys with live keys (`sk_live_`, `pk_live_`)
- [ ] Configure webhook URL in Moyasar dashboard
- [ ] Set `MOYASAR_WEBHOOK_SECRET` for signature verification
- [ ] Enable HTTPS on all payment pages
- [ ] Test with real cards in sandbox mode
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications for successful payments

---

## Support

- Moyasar Dashboard: https://dashboard.moyasar.com
- Moyasar Docs: https://docs.moyasar.com
- API Reference: https://docs.moyasar.com/api
