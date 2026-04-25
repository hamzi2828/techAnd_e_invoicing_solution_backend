const mongoose = require('mongoose');

const usageTrackerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  period: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true }
  },
  usage: {
    invoicesCreated: { type: Number, default: 0 },
    customersCreated: { type: Number, default: 0 },
    productsCreated: { type: Number, default: 0 },
    usersCreated: { type: Number, default: 0 },
    storageUsedMB: { type: Number, default: 0 },
    companiesCreated: { type: Number, default: 0 },
    // ZATCA specific
    zatcaSubmissions: { type: Number, default: 0 },
    // Feature-specific
    bulkImports: { type: Number, default: 0 },
    reportsGenerated: { type: Number, default: 0 },
    scheduledReports: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 }
  },
  limits: {
    // Snapshot of limits at period start (for audit/reference)
    invoicesPerMonth: { type: Number, default: null },
    customers: { type: Number, default: null },
    products: { type: Number, default: null },
    users: { type: Number, default: null },
    storage: { type: Number, default: null },
    companies: { type: Number, default: null }
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan'
  },
  planName: {
    type: String,
    default: 'Free'
  }
}, {
  timestamps: true
});

// Compound index for fast lookups - unique per user per month
usageTrackerSchema.index(
  { userId: 1, 'period.year': 1, 'period.month': 1 },
  { unique: true }
);

// Index for company-wide queries
usageTrackerSchema.index({ companyId: 1, 'period.year': 1, 'period.month': 1 });

// Resource type to field mapping
const RESOURCE_MAP = {
  invoice: { usage: 'invoicesCreated', limit: 'invoicesPerMonth' },
  customer: { usage: 'customersCreated', limit: 'customers' },
  product: { usage: 'productsCreated', limit: 'products' },
  user: { usage: 'usersCreated', limit: 'users' },
  storage: { usage: 'storageUsedMB', limit: 'storage' },
  company: { usage: 'companiesCreated', limit: 'companies' },
  zatca: { usage: 'zatcaSubmissions', limit: null },
  bulkImport: { usage: 'bulkImports', limit: null },
  report: { usage: 'reportsGenerated', limit: null },
  scheduledReport: { usage: 'scheduledReports', limit: null },
  api: { usage: 'apiCalls', limit: null },
  email: { usage: 'emailsSent', limit: null }
};

/**
 * Get or create usage tracker for current period
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} companyId - Company ID (optional)
 * @returns {Promise<UsageTracker>}
 */
usageTrackerSchema.statics.getCurrentTracker = async function(userId, companyId = null) {
  const User = require('./User');
  const Company = require('./Company');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let tracker = await this.findOne({
    userId,
    'period.month': month,
    'period.year': year
  });

  if (!tracker) {
    // Get user's current plan limits
    const user = await User.findById(userId).populate('currentPlanId');
    const plan = user?.currentPlanId;

    // Count existing resources for the user to initialize usage correctly
    const existingCompanies = await Company.countDocuments({
      userId: userId,
      isDeleted: { $ne: true }
    });

    tracker = await this.create({
      userId,
      companyId,
      period: { month, year },
      usage: {
        // Initialize with existing counts (companies are not period-based)
        companiesCreated: existingCompanies
      },
      limits: {
        invoicesPerMonth: plan?.limits?.invoicesPerMonth ?? 50,
        customers: plan?.limits?.customers ?? 20,
        products: plan?.limits?.products ?? 50,
        users: plan?.limits?.users ?? 1,
        storage: plan?.limits?.storage ?? 100,
        companies: plan?.limits?.companies ?? plan?.metadata?.companiesLimit ?? 1
      },
      planId: plan?._id || null,
      planName: plan?.name || 'Free'
    });
  }

  return tracker;
};

/**
 * Get tracker for a specific period
 */
usageTrackerSchema.statics.getTrackerForPeriod = async function(userId, month, year) {
  return this.findOne({
    userId,
    'period.month': month,
    'period.year': year
  });
};

/**
 * Get usage history for a user
 */
usageTrackerSchema.statics.getUsageHistory = async function(userId, months = 6) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  return this.find({
    userId,
    $or: [
      { 'period.year': { $gt: startDate.getFullYear() } },
      {
        'period.year': startDate.getFullYear(),
        'period.month': { $gte: startDate.getMonth() + 1 }
      }
    ]
  }).sort({ 'period.year': -1, 'period.month': -1 });
};

/**
 * Check if user can create a resource
 * @param {string} resourceType - Type of resource (invoice, customer, product, user, storage, company)
 * @returns {Object} { allowed, current, limit, remaining, unlimited }
 */
usageTrackerSchema.methods.canCreate = function(resourceType) {
  const mapping = RESOURCE_MAP[resourceType];

  if (!mapping) {
    return { allowed: true, unlimited: true };
  }

  const currentUsage = this.usage[mapping.usage] || 0;
  const limit = mapping.limit ? this.limits[mapping.limit] : null;

  // null limit means unlimited
  if (limit === null || limit === undefined) {
    return {
      allowed: true,
      unlimited: true,
      current: currentUsage,
      limit: null,
      remaining: null
    };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;

  return {
    allowed: currentUsage < limit,
    current: currentUsage,
    limit: limit,
    remaining: remaining,
    percentage: percentage,
    unlimited: false
  };
};

/**
 * Check if user can create a resource (async version for accurate DB counts)
 * Use this for lifetime-based resources like companies that need real-time DB counts
 * @param {string} resourceType - Type of resource (invoice, customer, product, user, storage, company)
 * @returns {Promise<Object>} { allowed, current, limit, remaining, unlimited }
 */
usageTrackerSchema.methods.canCreateAsync = async function(resourceType) {
  const mapping = RESOURCE_MAP[resourceType];

  if (!mapping) {
    return { allowed: true, unlimited: true };
  }

  let currentUsage = this.usage[mapping.usage] || 0;
  const limit = mapping.limit ? this.limits[mapping.limit] : null;

  // For company resource, always get actual count from database
  // Companies are lifetime-based, not period-based, so cached counts can drift
  if (resourceType === 'company') {
    const Company = require('./Company');
    currentUsage = await Company.countDocuments({
      userId: this.userId,
      isDeleted: { $ne: true }
    });

    // Sync the cached value if it's different
    if (this.usage.companiesCreated !== currentUsage) {
      this.usage.companiesCreated = currentUsage;
      await this.save();
    }
  }

  // null limit means unlimited
  if (limit === null || limit === undefined) {
    return {
      allowed: true,
      unlimited: true,
      current: currentUsage,
      limit: null,
      remaining: null
    };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;

  return {
    allowed: currentUsage < limit,
    current: currentUsage,
    limit: limit,
    remaining: remaining,
    percentage: percentage,
    unlimited: false
  };
};

/**
 * Increment usage for a resource type
 * @param {string} resourceType - Type of resource
 * @param {number} count - Amount to increment (default 1)
 * @returns {Promise<UsageTracker>}
 */
usageTrackerSchema.methods.incrementUsage = async function(resourceType, count = 1) {
  const mapping = RESOURCE_MAP[resourceType];

  if (mapping) {
    this.usage[mapping.usage] = (this.usage[mapping.usage] || 0) + count;
    await this.save();
  }

  return this;
};

/**
 * Decrement usage for a resource type (e.g., when deleting)
 * @param {string} resourceType - Type of resource
 * @param {number} count - Amount to decrement (default 1)
 * @returns {Promise<UsageTracker>}
 */
usageTrackerSchema.methods.decrementUsage = async function(resourceType, count = 1) {
  const mapping = RESOURCE_MAP[resourceType];

  if (mapping) {
    this.usage[mapping.usage] = Math.max(0, (this.usage[mapping.usage] || 0) - count);
    await this.save();
  }

  return this;
};

/**
 * Get usage summary with percentages
 */
usageTrackerSchema.methods.getUsageSummary = function() {
  const calculatePercentage = (current, limit) => {
    if (limit === null || limit === undefined) return null;
    if (limit === 0) return 100;
    return Math.round((current / limit) * 100);
  };

  return {
    invoices: {
      current: this.usage.invoicesCreated,
      limit: this.limits.invoicesPerMonth,
      percentage: calculatePercentage(this.usage.invoicesCreated, this.limits.invoicesPerMonth),
      remaining: this.limits.invoicesPerMonth !== null
        ? Math.max(0, this.limits.invoicesPerMonth - this.usage.invoicesCreated)
        : null
    },
    customers: {
      current: this.usage.customersCreated,
      limit: this.limits.customers,
      percentage: calculatePercentage(this.usage.customersCreated, this.limits.customers),
      remaining: this.limits.customers !== null
        ? Math.max(0, this.limits.customers - this.usage.customersCreated)
        : null
    },
    products: {
      current: this.usage.productsCreated,
      limit: this.limits.products,
      percentage: calculatePercentage(this.usage.productsCreated, this.limits.products),
      remaining: this.limits.products !== null
        ? Math.max(0, this.limits.products - this.usage.productsCreated)
        : null
    },
    users: {
      current: this.usage.usersCreated,
      limit: this.limits.users,
      percentage: calculatePercentage(this.usage.usersCreated, this.limits.users),
      remaining: this.limits.users !== null
        ? Math.max(0, this.limits.users - this.usage.usersCreated)
        : null
    },
    storage: {
      current: this.usage.storageUsedMB,
      limit: this.limits.storage,
      percentage: calculatePercentage(this.usage.storageUsedMB, this.limits.storage),
      remaining: this.limits.storage !== null
        ? Math.max(0, this.limits.storage - this.usage.storageUsedMB)
        : null
    },
    companies: {
      current: this.usage.companiesCreated,
      limit: this.limits.companies,
      percentage: calculatePercentage(this.usage.companiesCreated, this.limits.companies),
      remaining: this.limits.companies !== null
        ? Math.max(0, this.limits.companies - this.usage.companiesCreated)
        : null
    }
  };
};

/**
 * Update limits when plan changes
 */
usageTrackerSchema.methods.updateLimits = async function(newPlan) {
  if (newPlan) {
    this.limits = {
      invoicesPerMonth: newPlan.limits?.invoicesPerMonth ?? null,
      customers: newPlan.limits?.customers ?? null,
      products: newPlan.limits?.products ?? null,
      users: newPlan.limits?.users ?? null,
      storage: newPlan.limits?.storage ?? null,
      companies: newPlan.limits?.companies ?? newPlan.metadata?.companiesLimit ?? null
    };
    this.planId = newPlan._id;
    this.planName = newPlan.name;
    await this.save();
  }
  return this;
};

const UsageTracker = mongoose.model('UsageTracker', usageTrackerSchema);

module.exports = UsageTracker;
