const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const permissionController = require('../controllers/permissionController');
const { protect } = require('../../middleware/auth');
const {
  validateRole,
  validatePermission,
  validateObjectId,
  validateId,
  validateRoleAndPermissionIds,
  validateCategory,
  validateResource
} = require('../../middleware/validations/rolePermissionValidation');

// ROLE ROUTES
// GET /roles - Get all roles
router.get('/roles', protect, roleController.getAllRoles);

// GET /roles/created-by-me - Get roles created by the logged-in user
router.get('/roles/created-by-me', protect, roleController.getRolesCreatedByMe);

// GET /roles/system - Get system roles
router.get('/roles/system', protect, roleController.getSystemRoles);

// GET /roles/custom - Get custom roles
router.get('/roles/custom', protect, roleController.getCustomRoles);

// GET /roles/statistics - Get role statistics
router.get('/roles/statistics', protect, roleController.getRoleStatistics);

// GET /roles/search - Search roles
router.get('/roles/search', protect, roleController.searchRoles);

// POST /roles/update-user-counts - Update user counts for all roles
router.post('/roles/update-user-counts', protect, roleController.updateRoleUserCounts);

// POST /roles/register/created-by-me - Register a new role (admin creating roles with createdBy)
router.post('/roles/register/created-by-me', protect, validateRole, roleController.registerRole);

// GET /roles/:id - Get role by ID
router.get('/roles/:id', protect, validateId, roleController.getRoleById);

// POST /roles - Create new role
router.post('/roles', protect, validateRole, roleController.createRole);

// PUT /roles/:id/created-by-me - Update role created by me
router.put('/roles/:id/created-by-me', protect, validateId, validateRole, roleController.updateRole);

// DELETE /roles/:id/created-by-me - Delete role created by me
router.delete('/roles/:id/created-by-me', protect, validateId, roleController.deleteRole);

// POST /roles/:id/permissions/:permissionId/created-by-me - Add permission to role created by me
router.post('/roles/:id/permissions/:permissionId/created-by-me', protect, validateRoleAndPermissionIds, roleController.addPermissionToRole);

// DELETE /roles/:id/permissions/:permissionId/created-by-me - Remove permission from role created by me
router.delete('/roles/:id/permissions/:permissionId/created-by-me', protect, validateRoleAndPermissionIds, roleController.removePermissionFromRole);

// PERMISSION ROUTES
// GET /permissions - Get all permissions
router.get('/permissions', protect, permissionController.getAllPermissions);

// GET /permissions/categories - Get all categories
router.get('/permissions/categories', protect, permissionController.getCategories);

// GET /permissions/search - Search permissions
router.get('/permissions/search', protect, permissionController.searchPermissions);

// GET /permissions/category/:category - Get permissions by category
router.get('/permissions/category/:category', protect, validateCategory, permissionController.getPermissionsByCategory);

// GET /permissions/resource/:resource - Get permissions by resource
router.get('/permissions/resource/:resource', protect, validateResource, permissionController.getPermissionsByResource);

// POST /permissions/bulk - Bulk create permissions
router.post('/permissions/bulk', protect, permissionController.bulkCreatePermissions);

// GET /permissions/:id - Get permission by ID
router.get('/permissions/:id', protect, validateId, permissionController.getPermissionById);

// POST /permissions - Create new permission
router.post('/permissions', protect, validatePermission, permissionController.createPermission);

// PUT /permissions/:id - Update permission
router.put('/permissions/:id', protect, validateId, validatePermission, permissionController.updatePermission);

// DELETE /permissions/:id - Delete permission
router.delete('/permissions/:id', protect, validateId, permissionController.deletePermission);

module.exports = router;