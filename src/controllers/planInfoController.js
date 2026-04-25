const UsageTracker = require('../models/UsageTracker');
const PaymentPlan = require('../models/PaymentPlan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');

/**
 * Get current user's plan info and usage
 * GET /api/user/plan-info
 */
const getPlanInfo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with current plan
    const user = await User.findById(userId)
      .populate('currentPlanId')
      .lean();

    // Get active subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'trialing'] }
    }).populate('paymentPlanId').lean();

    // Determine effective plan
    const effectivePlan = subscription?.paymentPlanId || user?.currentPlanId;

    // Get current usage tracker
    const usageTracker = await UsageTracker.getCurrentTracker(
      userId,
      user?.assignedCompanyId
    );

    // Calculate ACTUAL counts from database for total-based limits (not monthly)
    // Customers, Products, Companies are TOTAL limits (not monthly)
    const [actualCustomerCount, actualProductCount, actualCompanyCount] = await Promise.all([
      Customer.countDocuments({ userId: userId, isDeleted: { $ne: true } }),
      Product.countDocuments({ userId: userId, isDeleted: { $ne: true } }),
      Company.countDocuments({ userId: userId, isDeleted: { $ne: true } })
    ]);

    // Invoices are monthly, so we use the tracker value (or calculate for current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const actualInvoiceCount = await Invoice.countDocuments({
      userId: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      isDeleted: { $ne: true }
    });

    // Get all available plans for comparison
    const availablePlans = await PaymentPlan.getActivePaymentPlans();

    // Calculate usage percentages
    const calculatePercentage = (current, limit) => {
      if (limit === null || limit === undefined) return null;
      if (limit === 0) return 100;
      return Math.round((current / limit) * 100);
    };

    // Build response
    const response = {
      success: true,
      data: {
        currentPlan: {
          id: effectivePlan?._id?.toString() || null,
          name: effectivePlan?.name || 'Free',
          description: effectivePlan?.description || 'Free plan with limited features',
          features: effectivePlan?.features || [],
          limits: effectivePlan?.limits || {
            invoicesPerMonth: 50,
            customers: 20,
            products: 50,
            users: 1,
            storage: 100
          },
          metadata: effectivePlan?.metadata || {}
        },
        subscription: subscription ? {
          id: subscription._id.toString(),
          subscriptionId: subscription.subscriptionId,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          unitAmount: subscription.unitAmount,
          currency: subscription.currency || 'SAR',
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          daysRemaining: Math.max(0, Math.ceil(
            (new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)
          )),
          isActive: ['active', 'trialing'].includes(subscription.status),
          isTrialing: subscription.status === 'trialing'
        } : null,
        usage: {
          current: {
            // Use actual database counts for accuracy
            invoicesCreated: actualInvoiceCount,
            customersCreated: actualCustomerCount,
            productsCreated: actualProductCount,
            usersCreated: usageTracker.usage.usersCreated || 0,
            storageUsedMB: usageTracker.usage.storageUsedMB || 0,
            companiesCreated: actualCompanyCount,
            zatcaSubmissions: usageTracker.usage.zatcaSubmissions || 0,
            bulkImports: usageTracker.usage.bulkImports || 0,
            reportsGenerated: usageTracker.usage.reportsGenerated || 0
          },
          limits: {
            invoicesPerMonth: usageTracker.limits.invoicesPerMonth,
            customers: usageTracker.limits.customers,
            products: usageTracker.limits.products,
            users: usageTracker.limits.users,
            storage: usageTracker.limits.storage,
            companies: usageTracker.limits.companies
          },
          period: {
            month: usageTracker.period.month,
            year: usageTracker.period.year
          },
          percentages: {
            invoices: calculatePercentage(
              actualInvoiceCount,
              usageTracker.limits.invoicesPerMonth
            ),
            customers: calculatePercentage(
              actualCustomerCount,
              usageTracker.limits.customers
            ),
            products: calculatePercentage(
              actualProductCount,
              usageTracker.limits.products
            ),
            users: calculatePercentage(
              usageTracker.usage.usersCreated,
              usageTracker.limits.users
            ),
            storage: calculatePercentage(
              usageTracker.usage.storageUsedMB,
              usageTracker.limits.storage
            ),
            companies: calculatePercentage(
              actualCompanyCount,
              usageTracker.limits.companies
            )
          }
        },
        availablePlans: availablePlans.map(plan => ({
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          currency: plan.currency || 'SAR',
          features: plan.features,
          limits: plan.limits,
          isPopular: plan.isPopular,
          isFeatured: plan.isFeatured,
          badge: plan.metadata?.badge,
          isCurrentPlan: plan._id.toString() === (effectivePlan?._id?.toString() || '')
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get plan info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plan information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get usage history for the user
 * GET /api/user/usage-history
 */
const getUsageHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const months = parseInt(req.query.months) || 6;

    const history = await UsageTracker.getUsageHistory(userId, months);

    res.json({
      success: true,
      data: {
        history: history.map(tracker => ({
          period: tracker.period,
          usage: tracker.usage,
          limits: tracker.limits,
          planName: tracker.planName,
          summary: tracker.getUsageSummary()
        }))
      }
    });
  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage history'
    });
  }
};

/**
 * Check if user can create a specific resource
 * GET /api/user/can-create/:resourceType
 */
const checkCanCreate = async (req, res) => {
  try {
    const { resourceType } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    const usageTracker = await UsageTracker.getCurrentTracker(
      userId,
      user?.assignedCompanyId
    );

    // Get actual counts from database for accurate limit checking
    let actualCount = 0;
    let limit = null;

    if (resourceType === 'customer') {
      actualCount = await Customer.countDocuments({ userId, isDeleted: { $ne: true } });
      limit = usageTracker.limits.customers;
    } else if (resourceType === 'product') {
      actualCount = await Product.countDocuments({ userId, isDeleted: { $ne: true } });
      limit = usageTracker.limits.products;
    } else if (resourceType === 'company') {
      actualCount = await Company.countDocuments({ userId, isDeleted: { $ne: true } });
      limit = usageTracker.limits.companies;
    } else if (resourceType === 'invoice') {
      // Invoices are monthly
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      actualCount = await Invoice.countDocuments({
        userId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        isDeleted: { $ne: true }
      });
      limit = usageTracker.limits.invoicesPerMonth;
    } else {
      // Fallback to tracker for other resource types
      const check = usageTracker.canCreate(resourceType);
      return res.json({
        success: true,
        data: {
          resourceType,
          ...check,
          planName: usageTracker.planName
        }
      });
    }

    // Calculate check result
    const unlimited = limit === null || limit === undefined || limit === -1;
    const remaining = unlimited ? null : Math.max(0, limit - actualCount);
    const allowed = unlimited || actualCount < limit;
    const percentage = unlimited ? null : Math.round((actualCount / limit) * 100);

    res.json({
      success: true,
      data: {
        resourceType,
        allowed,
        current: actualCount,
        limit: unlimited ? null : limit,
        remaining,
        unlimited,
        percentage,
        planName: usageTracker.planName
      }
    });
  } catch (error) {
    console.error('Check can create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check resource limit'
    });
  }
};

/**
 * Check if user has a specific feature
 * GET /api/user/has-feature/:featureName
 */
const checkHasFeature = async (req, res) => {
  try {
    const { featureName } = req.params;

    // Decode URI component in case feature name has special characters
    const decodedFeatureName = decodeURIComponent(featureName);

    const hasFeature = req.plan?.hasFeature(decodedFeatureName) || false;
    const featureLimit = req.plan?.getFeatureLimit(decodedFeatureName);

    res.json({
      success: true,
      data: {
        feature: decodedFeatureName,
        hasFeature,
        limit: featureLimit,
        currentPlan: req.plan?.planName || 'Free'
      }
    });
  } catch (error) {
    console.error('Check has feature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check feature availability'
    });
  }
};

/**
 * Get feature availability matrix for current plan
 * GET /api/user/features
 */
const getFeatures = async (req, res) => {
  try {
    const features = req.plan?.features || [];
    const planName = req.plan?.planName || 'Free';

    // Build feature availability object
    const featureAvailability = {};
    features.forEach(feature => {
      featureAvailability[feature.name] = {
        included: feature.included,
        limit: feature.limit || null,
        description: feature.description || ''
      };
    });

    res.json({
      success: true,
      data: {
        planName,
        features: featureAvailability,
        rawFeatures: features
      }
    });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get features'
    });
  }
};

module.exports = {
  getPlanInfo,
  getUsageHistory,
  checkCanCreate,
  checkHasFeature,
  getFeatures
};
