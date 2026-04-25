const { body, param, query } = require('express-validator');

// Base validation for MongoDB ObjectId
const validatePaymentPlanId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid payment plan ID format')
];

// Validation for creating a new payment plan
const validateCreatePaymentPlan = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Payment plan name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Payment plan name must be between 2 and 100 characters')
    .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z0-9\s\-_.()]+$/)
    .withMessage('Payment plan name contains invalid characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Payment plan description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('monthlyPrice')
    .isNumeric()
    .withMessage('Monthly price must be a number')
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Monthly price must be between 0 and 999,999')
    .custom((value) => {
      // Check if price has more than 2 decimal places
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Monthly price can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('yearlyPrice')
    .isNumeric()
    .withMessage('Yearly price must be a number')
    .isFloat({ min: 0, max: 9999999 })
    .withMessage('Yearly price must be between 0 and 9,999,999')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Yearly price can have maximum 2 decimal places');
      }
      return true;
    }),
  
  // Validate that yearly price makes sense compared to monthly
  body('yearlyPrice')
    .custom((yearlyPrice, { req }) => {
      const monthlyPrice = parseFloat(req.body.monthlyPrice);
      const yearly = parseFloat(yearlyPrice);
      
      if (yearly > monthlyPrice * 15) {
        throw new Error('Yearly price seems too high compared to monthly price');
      }
      
      if (yearly < monthlyPrice * 8 && yearly > 0) {
        throw new Error('Yearly price should be at least 8 months worth for reasonable discount');
      }
      
      return true;
    }),
  
  body('currency')
    .optional()
    .isIn(['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'])
    .withMessage('Currency must be one of: SAR, USD, EUR, AED, KWD, BHD, OMR, QAR'),
  
  body('billingCycle')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Billing cycle must be a non-empty array')
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      const validCycles = ['monthly', 'yearly'];
      const uniqueCycles = [...new Set(value)];
      
      if (uniqueCycles.length !== value.length) {
        throw new Error('Billing cycle contains duplicate values');
      }
      
      return value.every(cycle => validCycles.includes(cycle));
    })
    .withMessage('Billing cycle must contain only "monthly" and/or "yearly"'),
  
  // Features validation for payment plans
  body('features')
    .optional()
    .isArray()
    .withMessage('Payment plan features must be an array'),
  
  body('features.*.name')
    .if(body('features').exists())
    .trim()
    .notEmpty()
    .withMessage('Payment plan feature name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Feature name must be between 2 and 100 characters'),
  
  body('features.*.description')
    .if(body('features').exists())
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Feature description cannot exceed 300 characters'),
  
  body('features.*.included')
    .if(body('features').exists())
    .optional()
    .isBoolean()
    .withMessage('Feature included must be boolean'),
  
  body('features.*.limit')
    .if(body('features').exists())
    .optional()
    .isInt({ min: 0 })
    .withMessage('Feature limit must be a non-negative integer'),
  
  // Payment plan limits validation
  body('limits.invoicesPerMonth')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Invoice limit must be a non-negative integer or null');
      }
      if (value > 100000) {
        throw new Error('Invoice limit cannot exceed 100,000');
      }
      return true;
    }),
  
  body('limits.customers')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Customer limit must be a non-negative integer or null');
      }
      if (value > 50000) {
        throw new Error('Customer limit cannot exceed 50,000');
      }
      return true;
    }),
  
  body('limits.products')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Product limit must be a non-negative integer or null');
      }
      if (value > 25000) {
        throw new Error('Product limit cannot exceed 25,000');
      }
      return true;
    }),
  
  body('limits.users')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('User limit must be between 1 and 1,000'),
  
  body('limits.storage')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Storage limit must be a non-negative integer (MB) or null');
      }
      if (value > 1000000) { // 1TB in MB
        throw new Error('Storage limit cannot exceed 1,000,000 MB (1TB)');
      }
      return true;
    }),
  
  body('trialDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Trial days must be between 0 and 365'),
  
  body('setupFee')
    .optional()
    .isFloat({ min: 0, max: 99999 })
    .withMessage('Setup fee must be between 0 and 99,999')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Setup fee can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Discount percentage can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Sort order must be between 0 and 1,000'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be boolean'),
  
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be boolean'),
  
  // Date validation for payment plans
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('validFrom must be a valid ISO 8601 date'),
  
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('validUntil must be a valid ISO 8601 date')
    .custom((validUntil, { req }) => {
      if (validUntil && req.body.validFrom) {
        const from = new Date(req.body.validFrom);
        const until = new Date(validUntil);
        
        if (until <= from) {
          throw new Error('validUntil must be after validFrom');
        }
      }
      return true;
    }),
  
  // Metadata validation for payment plans
  body('metadata')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Payment plan metadata must be an object');
      }
      
      // Check if metadata is too large (prevent DoS)
      if (JSON.stringify(value).length > 10000) {
        throw new Error('Payment plan metadata is too large (max 10KB)');
      }
      
      return true;
    })
];

// Validation for updating a payment plan (all fields optional)
const validateUpdatePaymentPlan = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Payment plan name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Payment plan name must be between 2 and 100 characters')
    .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z0-9\s\-_.()]+$/)
    .withMessage('Payment plan name contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Payment plan description cannot be empty')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('monthlyPrice')
    .optional()
    .isNumeric()
    .withMessage('Monthly price must be a number')
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Monthly price must be between 0 and 999,999')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Monthly price can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('yearlyPrice')
    .optional()
    .isNumeric()
    .withMessage('Yearly price must be a number')
    .isFloat({ min: 0, max: 9999999 })
    .withMessage('Yearly price must be between 0 and 9,999,999')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Yearly price can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('currency')
    .optional()
    .isIn(['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'])
    .withMessage('Currency must be one of: SAR, USD, EUR, AED, KWD, BHD, OMR, QAR'),
  
  body('discountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100')
    .custom((value) => {
      if (value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('Discount percentage can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('setupFee')
    .optional()
    .isFloat({ min: 0, max: 99999 })
    .withMessage('Setup fee must be between 0 and 99,999'),
  
  body('trialDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Trial days must be between 0 and 365'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Sort order must be between 0 and 1,000'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean'),
  
  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be boolean'),
  
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be boolean')
];

// Validation for query parameters (filtering, sorting, pagination)
const validatePaymentPlanQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1,000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('active')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Active filter must be "true" or "false"'),
  
  query('popular')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Popular filter must be "true" or "false"'),
  
  query('featured')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Featured filter must be "true" or "false"'),
  
  query('validNow')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('ValidNow filter must be "true" or "false"'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Minimum price must be between 0 and 999,999'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Maximum price must be between 0 and 999,999')
    .custom((maxPrice, { req }) => {
      const minPrice = parseFloat(req.query.minPrice);
      const max = parseFloat(maxPrice);
      
      if (minPrice && max <= minPrice) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      
      return true;
    }),
  
  query('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle filter must be "monthly" or "yearly"'),
  
  query('currency')
    .optional()
    .isIn(['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'])
    .withMessage('Currency filter must be one of: SAR, USD, EUR, AED, KWD, BHD, OMR, QAR'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'monthlyPrice', 'yearlyPrice', 'createdAt', 'updatedAt', 'sortOrder', 'trialDays'])
    .withMessage('Invalid sort field for payment plans'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('Sort order must be "asc", "desc", "1", or "-1"'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape() // Prevent XSS
];

// Validation for bulk operations on payment plans
const validateBulkPaymentPlanOrderUpdate = [
  body('paymentPlanOrders')
    .isArray({ min: 1 })
    .withMessage('paymentPlanOrders must be a non-empty array'),
  
  body('paymentPlanOrders.*.id')
    .isMongoId()
    .withMessage('Each payment plan order must have a valid MongoDB ID'),
  
  body('paymentPlanOrders.*.sortOrder')
    .isInt({ min: 0, max: 1000 })
    .withMessage('Each sort order must be between 0 and 1,000'),
  
  // Custom validation to ensure no duplicate IDs or sort orders
  body('paymentPlanOrders')
    .custom((paymentPlanOrders) => {
      if (!Array.isArray(paymentPlanOrders)) return false;
      
      const ids = paymentPlanOrders.map(item => item.id);
      const uniqueIds = [...new Set(ids)];
      
      if (uniqueIds.length !== ids.length) {
        throw new Error('Duplicate payment plan IDs found in order update');
      }
      
      const sortOrders = paymentPlanOrders.map(item => item.sortOrder);
      const uniqueSortOrders = [...new Set(sortOrders)];
      
      if (uniqueSortOrders.length !== sortOrders.length) {
        throw new Error('Duplicate sort orders found in payment plan order update');
      }
      
      return true;
    })
];

// Validation for payment plan duplication
const validatePaymentPlanDuplicate = [
  body('newName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('New payment plan name must be between 2 and 100 characters')
    .matches(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFA-Za-z0-9\s\-_.()]+$/)
    .withMessage('New payment plan name contains invalid characters'),
  
  body('copyFeatures')
    .optional()
    .isBoolean()
    .withMessage('copyFeatures must be boolean'),
  
  body('copyLimits')
    .optional()
    .isBoolean()
    .withMessage('copyLimits must be boolean'),
  
  body('makeActive')
    .optional()
    .isBoolean()
    .withMessage('makeActive must be boolean')
];

module.exports = {
  validatePaymentPlanId,
  validateCreatePaymentPlan,
  validateUpdatePaymentPlan,
  validatePaymentPlanQueryParams,
  validateBulkPaymentPlanOrderUpdate,
  validatePaymentPlanDuplicate
};