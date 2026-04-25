const { body, param, query } = require('express-validator');

// ========== ROLE VALIDATIONS ==========

// Validation middleware for role creation/update
const validateRole = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Level must be between 1 and 10'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Color class cannot exceed 100 characters')
];

// ========== PERMISSION VALIDATIONS ==========

// Validation middleware for permission creation/update
const validatePermission = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Permission name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .trim()
    .isIn(['Invoices', 'Customers', 'Users', 'Reports', 'Products', 'Settings', 'General'])
    .withMessage('Category must be a valid option'),
  body('resource')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Resource cannot exceed 50 characters'),
  body('action')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Action cannot exceed 50 characters')
];

// ========== PARAMETER VALIDATIONS ==========

// Parameter validation for MongoDB ObjectId
const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  param('permissionId').optional().isMongoId().withMessage('Invalid permission ID format')
];

// Validate single ID parameter
const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format')
];

// Validate permission ID parameter
const validatePermissionId = [
  param('permissionId').isMongoId().withMessage('Invalid permission ID format')
];

// Validate both role ID and permission ID
const validateRoleAndPermissionIds = [
  param('id').isMongoId().withMessage('Invalid role ID format'),
  param('permissionId').isMongoId().withMessage('Invalid permission ID format')
];

// ========== QUERY VALIDATIONS ==========

// Validation for search queries
const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

// Validation for category parameter
const validateCategory = [
  param('category')
    .trim()
    .isIn(['Invoices', 'Customers', 'Users', 'Reports', 'Products', 'Settings', 'General'])
    .withMessage('Invalid category')
];

// Validation for resource parameter
const validateResource = [
  param('resource')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Resource must be between 1 and 50 characters')
];

module.exports = {
  // Role validations
  validateRole,
  
  // Permission validations
  validatePermission,
  
  // Parameter validations
  validateObjectId,
  validateId,
  validatePermissionId,
  validateRoleAndPermissionIds,
  
  // Query validations
  validateSearchQuery,
  validateCategory,
  validateResource
};