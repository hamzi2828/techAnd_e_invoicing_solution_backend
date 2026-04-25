/**
 * Centralized feature names - use these constants throughout the app
 * to ensure consistency between frontend and backend
 */
const FEATURES = {
  // Companies
  NUMBER_OF_COMPANIES: 'Number of Companies',

  // Invoice Volume
  INVOICE_VOLUME: 'Invoice Volume',

  // ZATCA Compliance
  ZATCA_PHASE_1: 'ZATCA Phase 1 (Generation)',
  ZATCA_PHASE_2: 'ZATCA Phase 2 (Integration)',
  ZATCA_ONBOARDING: 'ZATCA Onboarding',

  // Core Features
  QUOTATION: 'Quotation',
  BULK_IMPORT: 'Bulk Import',

  // Reports
  REPORTS: 'Reports',
  REPORT_SCHEDULING: 'Report Scheduling',

  // Users & Permissions
  MULTIPLE_USERS: 'Multiple Users',
  ROLES_PERMISSIONS: 'Roles & Permissions',

  // Notifications
  EMAIL_NOTIFICATIONS: 'Email Notifications',

  // Support
  SUPPORT: 'Support',

  // POS Features
  POS_ACCESS: 'POS Access',

  // Enterprise Features
  API_ACCESS: 'API Access',
  CUSTOM_INTEGRATIONS: 'Custom Integrations',
  DEDICATED_ACCOUNT_MANAGER: 'Dedicated Account Manager'
};

/**
 * Resource types for usage tracking
 */
const RESOURCE_TYPES = {
  INVOICE: 'invoice',
  CUSTOMER: 'customer',
  PRODUCT: 'product',
  USER: 'user',
  STORAGE: 'storage',
  COMPANY: 'company',
  ZATCA: 'zatca',
  BULK_IMPORT: 'bulkImport',
  REPORT: 'report',
  SCHEDULED_REPORT: 'scheduledReport',
  API: 'api',
  EMAIL: 'email'
};

/**
 * Plan names
 */
const PLAN_NAMES = {
  FREE: 'Free',
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise'
};

/**
 * Plan hierarchy for comparison (higher number = higher tier)
 */
const PLAN_HIERARCHY = {
  'Free': 0,
  'Basic': 1,
  'Professional': 2,
  'Enterprise': 3
};

/**
 * Check if plan A is at least plan B level
 * @param {string} currentPlan - Current plan name
 * @param {string} requiredPlan - Required plan name
 * @returns {boolean}
 */
const isPlanAtLeast = (currentPlan, requiredPlan) => {
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;
  return currentLevel >= requiredLevel;
};

/**
 * Get plan level number
 * @param {string} planName - Plan name
 * @returns {number}
 */
const getPlanLevel = (planName) => {
  return PLAN_HIERARCHY[planName] ?? 0;
};

/**
 * Feature availability by plan
 * Maps which features are available in which plans
 */
const FEATURE_AVAILABILITY = {
  [FEATURES.ZATCA_PHASE_1]: [PLAN_NAMES.FREE, PLAN_NAMES.BASIC, PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.ZATCA_PHASE_2]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.ZATCA_ONBOARDING]: [PLAN_NAMES.BASIC, PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.QUOTATION]: [PLAN_NAMES.FREE, PLAN_NAMES.BASIC, PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.BULK_IMPORT]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.REPORTS]: [PLAN_NAMES.FREE, PLAN_NAMES.BASIC, PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.REPORT_SCHEDULING]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.MULTIPLE_USERS]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.ROLES_PERMISSIONS]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.EMAIL_NOTIFICATIONS]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.POS_ACCESS]: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.ENTERPRISE],
  [FEATURES.API_ACCESS]: [PLAN_NAMES.ENTERPRISE],
  [FEATURES.CUSTOM_INTEGRATIONS]: [PLAN_NAMES.ENTERPRISE],
  [FEATURES.DEDICATED_ACCOUNT_MANAGER]: [PLAN_NAMES.ENTERPRISE]
};

/**
 * Check if a feature is available for a plan
 * @param {string} featureName - Feature name
 * @param {string} planName - Plan name
 * @returns {boolean}
 */
const isFeatureAvailable = (featureName, planName) => {
  const availablePlans = FEATURE_AVAILABILITY[featureName];
  if (!availablePlans) return true; // If not defined, assume available
  return availablePlans.includes(planName);
};

/**
 * Error codes for plan-related errors
 */
const PLAN_ERROR_CODES = {
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  LIMIT_REACHED: 'LIMIT_REACHED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PLAN_UPGRADE_REQUIRED: 'PLAN_UPGRADE_REQUIRED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED'
};

module.exports = {
  FEATURES,
  RESOURCE_TYPES,
  PLAN_NAMES,
  PLAN_HIERARCHY,
  FEATURE_AVAILABILITY,
  PLAN_ERROR_CODES,
  isPlanAtLeast,
  getPlanLevel,
  isFeatureAvailable
};
