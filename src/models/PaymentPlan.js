const mongoose = require('mongoose');

const paymentPlanFeatureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Payment plan feature name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  included: {
    type: Boolean,
    default: true
  },
  limit: {
    type: Number,
    default: null // null means unlimited
  }
}, { _id: true });

const paymentPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Payment plan name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Payment plan name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Payment plan description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  monthlyPrice: {
    type: Number,
    required: [true, 'Monthly price is required'],
    min: [0, 'Price cannot be negative']
  },
  yearlyPrice: {
    type: Number,
    required: [true, 'Yearly price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'SAR',
    enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR']
  },
  billingCycle: {
    type: [String],
    enum: ['monthly', 'yearly'],
    default: ['monthly', 'yearly']
  },
  features: [paymentPlanFeatureSchema],
  limits: {
    invoicesPerMonth: {
      type: Number,
      default: null // null means unlimited
    },
    customers: {
      type: Number,
      default: null
    },
    products: {
      type: Number,
      default: null
    },
    users: {
      type: Number,
      default: 1
    },
    storage: {
      type: Number, // in MB
      default: null
    },
    companies: {
      type: Number,
      default: 1
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  trialDays: {
    type: Number,
    default: 0
  },
  setupFee: {
    type: Number,
    default: 0,
    min: [0, 'Setup fee cannot be negative']
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for yearly discount percentage
paymentPlanSchema.virtual('yearlyDiscount').get(function() {
  if (this.monthlyPrice > 0) {
    const yearlyEquivalent = this.monthlyPrice * 12;
    return Math.round(((yearlyEquivalent - this.yearlyPrice) / yearlyEquivalent) * 100);
  }
  return 0;
});

// Virtual for effective monthly price when paid yearly
paymentPlanSchema.virtual('effectiveMonthlyPrice').get(function() {
  return Math.round(this.yearlyPrice / 12 * 100) / 100;
});

// Index for efficient queries on payment plans
// Note: name already has unique: true in schema definition (creates index)
paymentPlanSchema.index({ isActive: 1, sortOrder: 1 });
paymentPlanSchema.index({ isPopular: 1 });
paymentPlanSchema.index({ validFrom: 1, validUntil: 1 });
paymentPlanSchema.index({ currency: 1 });
paymentPlanSchema.index({ monthlyPrice: 1 });
paymentPlanSchema.index({ yearlyPrice: 1 });

// Static method to get active payment plans
paymentPlanSchema.statics.getActivePaymentPlans = function() {
  return this.find({
    isActive: true,
    $or: [
      { validUntil: null },
      { validUntil: { $gte: new Date() } }
    ],
    validFrom: { $lte: new Date() }
  }).sort({ sortOrder: 1, createdAt: 1 });
};

// Static method to get featured payment plans
paymentPlanSchema.statics.getFeaturedPaymentPlans = function() {
  return this.find({
    isActive: true,
    isFeatured: true,
    $or: [
      { validUntil: null },
      { validUntil: { $gte: new Date() } }
    ],
    validFrom: { $lte: new Date() }
  }).sort({ sortOrder: 1 });
};

// Static method to get popular payment plan
paymentPlanSchema.statics.getPopularPaymentPlan = function() {
  return this.findOne({
    isActive: true,
    isPopular: true,
    $or: [
      { validUntil: null },
      { validUntil: { $gte: new Date() } }
    ],
    validFrom: { $lte: new Date() }
  });
};

// Method to check if payment plan is valid
paymentPlanSchema.methods.isValidNow = function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         (this.validUntil === null || this.validUntil >= now);
};

// Method to calculate price with discount
paymentPlanSchema.methods.getDiscountedPrice = function(billingCycle = 'monthly') {
  const basePrice = billingCycle === 'yearly' ? this.yearlyPrice : this.monthlyPrice;
  if (this.discountPercentage > 0) {
    return Math.round((basePrice * (1 - this.discountPercentage / 100)) * 100) / 100;
  }
  return basePrice;
};

// Method to get payment plan summary
paymentPlanSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    monthlyPrice: this.monthlyPrice,
    yearlyPrice: this.yearlyPrice,
    currency: this.currency,
    isPopular: this.isPopular,
    isFeatured: this.isFeatured,
    trialDays: this.trialDays,
    yearlyDiscount: this.yearlyDiscount,
    effectiveMonthlyPrice: this.effectiveMonthlyPrice
  };
};

// Pre-save middleware to ensure at least one billing cycle
paymentPlanSchema.pre('save', function(next) {
  if (!this.billingCycle || this.billingCycle.length === 0) {
    this.billingCycle = ['monthly'];
  }
  next();
});

// Pre-save middleware to handle popular payment plan (only one can be popular)
paymentPlanSchema.pre('save', async function(next) {
  if (this.isPopular && this.isModified('isPopular')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isPopular: false } }
    );
  }
  next();
});

// Pre-save middleware to validate price consistency
paymentPlanSchema.pre('save', function(next) {
  if (this.yearlyPrice > this.monthlyPrice * 15) {
    next(new Error('Yearly price seems unreasonably high compared to monthly price'));
  } else if (this.yearlyPrice < this.monthlyPrice * 8 && this.yearlyPrice > 0) {
    next(new Error('Yearly price should be at least 8 months worth for reasonable discount'));
  } else {
    next();
  }
});

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);