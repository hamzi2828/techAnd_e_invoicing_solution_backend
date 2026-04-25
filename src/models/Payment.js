const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Stripe References
  stripePaymentIntentId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  stripeCustomerId: {
    type: String,
    index: true
  },
  stripeChargeId: {
    type: String,
    index: true
  },

  // Moyasar References
  moyasarPaymentId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // Payment Gateway identifier
  paymentGateway: {
    type: String,
    enum: ['stripe', 'moyasar'],
    default: 'moyasar',
    index: true
  },

  // Plan Information
  paymentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan',
    required: false,
    index: true,
    default: null
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'SAR',
    uppercase: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },

  // Payment Method
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_account', 'wallet'],
      default: 'card'
    },
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number
  },

  // Transaction Details
  description: String,
  receiptUrl: String,
  receiptNumber: String,

  // Refund Information
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReason: String,
  refundedAt: Date,

  // Metadata
  metadata: {
    type: Map,
    of: String
  },

  // Billing Information
  billingDetails: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },

  // Timestamps
  paidAt: Date,
  failedAt: Date,
  processedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ stripeCustomerId: 1, createdAt: -1 });
paymentSchema.index({ planId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency.toUpperCase()} ${(this.amount / 100).toFixed(2)}`;
});

// Virtual for net amount (after refunds)
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundedAmount;
});

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'succeeded';
};

// Method to check if payment is refundable
paymentSchema.methods.isRefundable = function() {
  return this.status === 'succeeded' && this.refundedAmount < this.amount;
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(userId, startDate, endDate) {
  const matchCriteria = { userId };

  if (startDate || endDate) {
    matchCriteria.createdAt = {};
    if (startDate) matchCriteria.createdAt.$gte = new Date(startDate);
    if (endDate) matchCriteria.createdAt.$lte = new Date(endDate);
  }

  return await this.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalRefunded: { $sum: '$refundedAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);