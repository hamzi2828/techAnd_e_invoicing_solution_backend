const { body, param, query } = require('express-validator');

// Validation rules for role creation
const createRoleValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Role name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Level must be an integer between 1 and 10'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions) => {
      if (permissions && permissions.some(id => !id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('All permission IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Color class cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Color class contains invalid characters'),

  body('isSystemRole')
    .optional()
    .isBoolean()
    .withMessage('isSystemRole must be a boolean value'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation rules for role update
const updateRoleValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Role name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Role name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Role name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Level must be an integer between 1 and 10'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions) => {
      if (permissions && permissions.some(id => !id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('All permission IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Color class cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Color class contains invalid characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation for MongoDB ObjectId parameters
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid role ID format'),
];

const validatePermissionObjectId = [
  param('permissionId')
    .isMongoId()
    .withMessage('Invalid permission ID format'),
];

const validateBothObjectIds = [
  param('id')
    .isMongoId()
    .withMessage('Invalid role ID format'),
  param('permissionId')
    .isMongoId()
    .withMessage('Invalid permission ID format')
];

// Query parameter validation for role listing
const validateRoleQuery = [
  query('includePermissions')
    .optional()
    .isBoolean()
    .withMessage('includePermissions must be a boolean value'),

  query('sortBy')
    .optional()
    .isIn(['name', 'level', 'createdAt', 'updatedAt', 'userCount'])
    .withMessage('sortBy must be one of: name, level, createdAt, updatedAt, userCount'),

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
const validateRoleSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer'),

  query('includePermissions')
    .optional()
    .isBoolean()
    .withMessage('includePermissions must be a boolean value')
];

// Bulk operations validation
const validateBulkPermissions = [
  body('roleId')
    .isMongoId()
    .withMessage('Role ID must be a valid MongoDB ObjectId'),

  body('permissionIds')
    .isArray({ min: 1 })
    .withMessage('Permission IDs array is required and cannot be empty')
    .custom((permissionIds) => {
      if (permissionIds.some(id => !id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error('All permission IDs must be valid MongoDB ObjectIds');
      }
      return true;
    })
];

module.exports = {
  createRoleValidation,
  updateRoleValidation,
  validateObjectId,
  validatePermissionObjectId,
  validateBothObjectIds,
  validateRoleQuery,
  validateRoleSearch,
  validateBulkPermissions
};