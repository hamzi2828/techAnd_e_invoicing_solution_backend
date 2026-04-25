const User = require('../src/models/User');
const PaymentPlan = require('../src/models/PaymentPlan');
const UsageTracker = require('../src/models/UsageTracker');
const Subscription = require('../src/models/Subscription');
const {
  PLAN_HIERARCHY,
  PLAN_ERROR_CODES,
  isPlanAtLeast,
  isFeatureAvailable
} = require('../src/constants/planFeatures');

/**
 * Attaches plan information to the request object
 * Must be used AFTER auth middleware (requires req.user)
 *
 * Adds to req:
 * - req.plan.current - Current PaymentPlan document
 * - req.plan.planId - Plan ID string
 * - req.plan.planName - Plan name
 * - req.plan.features - Array of plan features
 * - req.plan.limits - Plan limits object
 * - req.plan.subscription - Active subscription info
 * - req.plan.usage - Current period usage
 * - req.plan.usageTracker - UsageTracker document
 * - req.plan.hasFeature(name) - Check if feature is available
 * - req.plan.getFeatureLimit(name) - Get feature limit
 * - req.plan.canCreate(resourceType) - Check if can create resource
 */
const attachPlan = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Get user with populated plan
    const user = await User.findById(req.user._id)
      .populate('currentPlanId')
      .lean();

    // Get active subscription
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'trialing'] }
    }).populate('paymentPlanId').lean();

    // Determine effective plan (subscription plan takes precedence over user's currentPlanId)
    const effectivePlan = subscription?.paymentPlanId || user?.currentPlanId;

    // Get current usage tracker
    const usageTracker = await UsageTracker.getCurrentTracker(
      req.user._id,
      user?.assignedCompanyId
    );

    // Build plan object
    req.plan = {
      current: effectivePlan || null,
      planId: effectivePlan?._id?.toString() || null,
      planName: effectivePlan?.name || 'Free',
      features: effectivePlan?.features || [],
      limits: effectivePlan?.limits || {},
      subscription: subscription ? {
        id: subscription._id.toString(),
        subscriptionId: subscription.subscriptionId,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        daysRemaining: Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))),
        isActive: ['active', 'trialing'].includes(subscription.status)
      } : null,
      usage: usageTracker.usage,
      usageTracker: usageTracker
    };

    // Helper: Check if feature is included in plan
    req.plan.hasFeature = (featureName) => {
      // First check in plan features array
      const feature = req.plan.features.find(f => f.name === featureName);
      if (feature) {
        return feature.included === true;
      }
      // Fallback to feature availability matrix
      return isFeatureAvailable(featureName, req.plan.planName);
    };

    // Helper: Get feature limit
    req.plan.getFeatureLimit = (featureName) => {
      const feature = req.plan.features.find(f => f.name === featureName);
      return feature?.limit ?? null;
    };

    // Helper: Check if can create resource
    req.plan.canCreate = (resourceType) => {
      return usageTracker.canCreate(resourceType);
    };

    // Helper: Check plan level
    req.plan.isPlanAtLeast = (planName) => {
      return isPlanAtLeast(req.plan.planName, planName);
    };

    next();
  } catch (error) {
    console.error('Plan middleware error:', error);
    // Don't block request, proceed without plan info
    req.plan = {
      current: null,
      planId: null,
      planName: 'Free',
      features: [],
      limits: {},
      subscription: null,
      usage: {},
      usageTracker: null,
      hasFeature: () => false,
      getFeatureLimit: () => null,
      canCreate: () => ({ allowed: false, reason: 'Plan not loaded' }),
      isPlanAtLeast: () => false
    };
    next();
  }
};

/**
 * Require a specific feature to access route
 * @param {string} featureName - Feature name from FEATURES constant
 * @returns {Function} Express middleware
 */
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.plan) {
      return res.status(403).json({
        success: false,
        message: 'Plan information not available. Please try again.',
        code: PLAN_ERROR_CODES.PLAN_NOT_FOUND
      });
    }

    if (!req.plan.hasFeature(featureName)) {
      return res.status(403).json({
        success: false,
        message: `The "${featureName}" feature requires an upgraded plan`,
        code: PLAN_ERROR_CODES.FEATURE_NOT_AVAILABLE,
        data: {
          feature: featureName,
          currentPlan: req.plan.planName,
          upgradeRequired: true
        }
      });
    }

    next();
  };
};

/**
 * Check resource limit before creation
 * @param {string} resourceType - Resource type from RESOURCE_TYPES
 * @returns {Function} Express middleware
 */
const checkLimit = (resourceType) => {
  return async (req, res, next) => {
    if (!req.plan) {
      return res.status(403).json({
        success: false,
        message: 'Plan information not available. Please try again.',
        code: PLAN_ERROR_CODES.PLAN_NOT_FOUND
      });
    }

    if (!req.plan.usageTracker) {
      return res.status(403).json({
        success: false,
        message: 'Usage tracker not available. Please try again.',
        code: PLAN_ERROR_CODES.PLAN_NOT_FOUND
      });
    }

    // Use async version to get accurate DB count for lifetime-based resources like company
    const check = await req.plan.usageTracker.canCreateAsync(resourceType);

    if (!check.allowed && !check.unlimited) {
      return res.status(403).json({
        success: false,
        message: `You have reached your ${resourceType} limit for this billing period`,
        code: PLAN_ERROR_CODES.LIMIT_REACHED,
        data: {
          resourceType,
          current: check.current,
          limit: check.limit,
          remaining: check.remaining,
          percentage: check.percentage,
          currentPlan: req.plan.planName,
          upgradeRequired: true
        }
      });
    }

    // Attach limit info for use in controller
    req.limitCheck = check;
    next();
  };
};

/**
 * Require an active subscription (not free plan)
 * @returns {Function} Express middleware
 */
const requireSubscription = (req, res, next) => {
  if (!req.plan?.subscription?.isActive) {
    return res.status(403).json({
      success: false,
      message: 'An active subscription is required for this feature',
      code: PLAN_ERROR_CODES.SUBSCRIPTION_REQUIRED,
      data: {
        currentPlan: req.plan?.planName || 'None',
        upgradeRequired: true
      }
    });
  }
  next();
};

/**
 * Require minimum plan level
 * @param {...string} allowedPlans - Plan names that are allowed
 * @returns {Function} Express middleware
 */
const requirePlan = (...allowedPlans) => {
  return (req, res, next) => {
    if (!req.plan) {
      return res.status(403).json({
        success: false,
        message: 'Plan information not available. Please try again.',
        code: PLAN_ERROR_CODES.PLAN_NOT_FOUND
      });
    }

    const currentPlan = req.plan.planName;
    const isAllowed = allowedPlans.some(plan =>
      plan.toLowerCase() === currentPlan.toLowerCase()
    );

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
        code: PLAN_ERROR_CODES.PLAN_UPGRADE_REQUIRED,
        data: {
          currentPlan,
          requiredPlans: allowedPlans,
          upgradeRequired: true
        }
      });
    }

    next();
  };
};

/**
 * Require minimum plan level (by hierarchy)
 * @param {string} minPlan - Minimum plan name required
 * @returns {Function} Express middleware
 */
const requireMinPlan = (minPlan) => {
  return (req, res, next) => {
    if (!req.plan) {
      return res.status(403).json({
        success: false,
        message: 'Plan information not available. Please try again.',
        code: PLAN_ERROR_CODES.PLAN_NOT_FOUND
      });
    }

    if (!req.plan.isPlanAtLeast(minPlan)) {
      return res.status(403).json({
        success: false,
        message: `This feature requires ${minPlan} plan or higher`,
        code: PLAN_ERROR_CODES.PLAN_UPGRADE_REQUIRED,
        data: {
          currentPlan: req.plan.planName,
          requiredPlan: minPlan,
          upgradeRequired: true
        }
      });
    }

    next();
  };
};

/**
 * Track usage after successful resource creation
 * Call this AFTER the resource is successfully created
 * @param {string} resourceType - Resource type to track
 * @param {number} count - Amount to increment (default 1)
 * @returns {Function} Express middleware (to be called manually or as post-hook)
 */
const trackUsage = (resourceType, count = 1) => {
  return async (req, res, next) => {
    // Only track if we have plan info and operation was successful
    if (req.plan?.usageTracker) {
      try {
        await req.plan.usageTracker.incrementUsage(resourceType, count);
      } catch (error) {
        console.error('Usage tracking error:', error);
        // Don't fail the request, just log the error
      }
    }

    if (next) next();
  };
};

/**
 * Helper function to track usage (for use in controllers)
 * @param {Request} req - Express request with plan attached
 * @param {string} resourceType - Resource type to track
 * @param {number} count - Amount to increment
 */
const incrementUsage = async (req, resourceType, count = 1) => {
  if (req.plan?.usageTracker) {
    try {
      await req.plan.usageTracker.incrementUsage(resourceType, count);
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }
};

/**
 * Helper function to decrement usage (for use in controllers when deleting)
 * @param {Request} req - Express request with plan attached
 * @param {string} resourceType - Resource type to track
 * @param {number} count - Amount to decrement
 */
const decrementUsage = async (req, resourceType, count = 1) => {
  if (req.plan?.usageTracker) {
    try {
      await req.plan.usageTracker.decrementUsage(resourceType, count);
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }
};

module.exports = {
  attachPlan,
  requireFeature,
  checkLimit,
  requireSubscription,
  requirePlan,
  requireMinPlan,
  trackUsage,
  incrementUsage,
  decrementUsage
};
