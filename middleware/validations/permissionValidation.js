const { body, param, query } = require('express-validator');

// Valid permission categories
const VALID_CATEGORIES = [
  'Invoices', 
  'Customers', 
  'Users', 
  'Reports', 
  'Products', 
  'Settings', 
  'General'
];

// Validation rules for permission creation
const createPermissionValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Permission name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Permission name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Permission name can only contain letters, numbers, spaces, hyphens, underscores, and dots'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('resource')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Resource cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\-_]*$/)
    .withMessage('Resource can only contain letters, numbers, hyphens, and underscores'),

  body('action')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Action cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\-_]*$/)
    .withMessage('Action can only contain letters, numbers, hyphens, and underscores'),

  body('isSystemPermission')
    .optional()
    .isBoolean()
    .withMessage('isSystemPermission must be a boolean value'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  // Custom validation for resource and action combination
  body().custom((body) => {
    const { resource, action } = body;
    
    // If either resource or action is provided, both should be provided
    if ((resource && !action) || (!resource && action)) {
      throw new Error('Both resource and action must be provided together, or neither');
    }
    
    return true;
  })
];

// Validation rules for permission update
const updatePermissionValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Permission name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Permission name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Permission name can only contain letters, numbers, spaces, hyphens, underscores, and dots'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('resource')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Resource cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\-_]*$/)
    .withMessage('Resource can only contain letters, numbers, hyphens, and underscores'),

  body('action')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Action cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\-_]*$/)
    .withMessage('Action can only contain letters, numbers, hyphens, and underscores'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation for MongoDB ObjectId parameters
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid permission ID format')
];

// Query parameter validation for permission listing
const validatePermissionQuery = [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('sortBy')
    .optional()
    .isIn(['name', 'category', 'createdAt', 'updatedAt'])
    .withMessage('sortBy must be one of: name, category, createdAt, updatedAt'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either asc or desc'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
];

// Search validation
const validatePermissionSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
];

// Category parameter validation
const validateCategory = [
  param('category')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`)
];

// Resource parameter validation
const validateResource = [
  param('resource')
    .trim()
    .notEmpty()
    .withMessage('Resource is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Resource must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Resource can only contain letters, numbers, hyphens, and underscores')
];

// Bulk create validation
const validateBulkPermissions = [
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions array is required and cannot be empty')
    .custom((permissions) => {
      // Validate each permission in the array
      for (let i = 0; i < permissions.length; i++) {
        const permission = permissions[i];
        
        if (!permission.name || typeof permission.name !== 'string' || permission.name.trim().length === 0) {
          throw new Error(`Permission at index ${i}: name is required`);
        }
        
        if (permission.name.length > 100) {
          throw new Error(`Permission at index ${i}: name cannot exceed 100 characters`);
        }
        
        if (!permission.category || !VALID_CATEGORIES.includes(permission.category)) {
          throw new Error(`Permission at index ${i}: category must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        
        if (permission.description && permission.description.length > 500) {
          throw new Error(`Permission at index ${i}: description cannot exceed 500 characters`);
        }
        
        // Check resource and action combination
        const { resource, action } = permission;
        if ((resource && !action) || (!resource && action)) {
          throw new Error(`Permission at index ${i}: both resource and action must be provided together, or neither`);
        }
      }
      
      return true;
    })
];

// Permission assignment validation
const validatePermissionAssignment = [
  body('roleId')
    .isMongoId()
    .withMessage('Role ID must be a valid MongoDB ObjectId'),

  body('permissionId')
    .isMongoId()
    .withMessage('Permission ID must be a valid MongoDB ObjectId')
];

module.exports = {
  createPermissionValidation,
  updatePermissionValidation,
  validateObjectId,
  validatePermissionQuery,
  validatePermissionSearch,
  validateCategory,
  validateResource,
  validateBulkPermissions,
  validatePermissionAssignment,
  VALID_CATEGORIES
};