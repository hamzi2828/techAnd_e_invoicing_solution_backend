const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Payment Gateway References
  // Supports both Stripe (legacy) and Moyasar
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  priceId: {
    type: String,
    required: false,
    index: true
  },
  // Payment gateway identifier
  paymentGateway: {
    type: String,
    enum: ['stripe', 'moyasar', 'free', 'admin_assigned'],
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

  // Subscription Details
  status: {
    type: String,
    required: true,
    enum: [
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'trialing',
      'unpaid',
      'paused'
    ],
    default: 'incomplete',
    index: true
  },

  // Billing Information
  currency: {
    type: String,
    required: true,
    default: 'SAR',
    uppercase: true
  },
  unitAmount: {
    type: Number,
    required: true,
    min: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'weekly', 'daily'],
    required: true,
    index: true
  },

  // Period Information
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    index: true
  },

  // Trial Information
  trialStart: Date,
  trialEnd: Date,

  // Cancellation Information
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  canceledAt: Date,
  cancellationReason: String,

  // Pause Information
  pausedAt: Date,
  pauseReason: String,
  resumeAt: Date,

  // Metadata
  metadata: {
    type: Map,
    of: String
  },

  // Payment History Reference
  latestInvoiceId: String,
  latestPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Upgrade/Downgrade History
  planChangeHistory: [{
    fromPaymentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentPlan'
    },
    toPaymentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentPlan'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // Discount Information
  discount: {
    couponId: String,
    percentOff: Number,
    amountOff: Number,
    validUntil: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ customerId: 1, status: 1 });
subscriptionSchema.index({ paymentPlanId: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
subscriptionSchema.index({ paymentGateway: 1, status: 1 });

// Virtual for formatted amount
subscriptionSchema.virtual('formattedAmount').get(function() {
  return `${this.currency.toUpperCase()} ${(this.unitAmount / 100).toFixed(2)}`;
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.currentPeriodEnd) return 0;
  const now = new Date();
  const diffTime = this.currentPeriodEnd - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for is active
subscriptionSchema.virtual('isActive').get(function() {
  return ['active', 'trialing'].includes(this.status);
});

// Method to check if subscription is expiring soon
subscriptionSchema.methods.isExpiringSoon = function(days = 7) {
  return this.daysRemaining <= days && this.daysRemaining > 0;
};

// Method to check if subscription can be canceled
subscriptionSchema.methods.canBeCanceled = function() {
  return ['active', 'trialing', 'past_due'].includes(this.status);
};

// Method to add plan change to history
subscriptionSchema.methods.addPlanChange = function(fromPlanId, toPlanId, reason = '') {
  this.planChangeHistory.push({
    fromPlanId,
    toPlanId,
    reason
  });
  return this.save();
};

// Static method to get active subscriptions count
subscriptionSchema.statics.getActiveCount = async function() {
  return await this.countDocuments({
    status: { $in: ['active', 'trialing'] }
  });
};

// Static method to get subscriptions expiring soon
subscriptionSchema.statics.getExpiringSoon = async function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return await this.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: {
      $gte: new Date(),
      $lte: futureDate
    }
  }).populate('userId', 'firstName lastName email');
};

// Static method to get subscription analytics
subscriptionSchema.statics.getAnalytics = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$unitAmount' }
      }
    },
    {
      $group: {
        _id: null,
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            revenue: '$totalRevenue'
          }
        },
        totalSubscriptions: { $sum: '$count' },
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);
};

module.exports = mongoose.model('Subscription', subscriptionSchema);