const RoleService = require('../services/roleService');
const { validationResult } = require('express-validator');
const { getUserFromToken } = require('../../helpers/authHelper');

const roleController = {
  // GET /roles - Get all roles
  getAllRoles: async (req, res) => {
    try {
      const { includePermissions, sortBy, sortOrder } = req.query;
      const options = {
        includePermissions: includePermissions === 'true',
        sortBy: sortBy || 'level',
        sortOrder: sortOrder || 'asc'
      };

      const result = await RoleService.getAllRoles(options);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/:id - Get role by ID
  getRoleById: async (req, res) => {
    try {
      const { id } = req.params;
      const { includePermissions } = req.query;
      
      const result = await RoleService.getRoleById(id, includePermissions !== 'false');
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getRoleById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /roles - Create new role
  createRole: async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await RoleService.createRole(req.body);
      
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in createRole:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // PUT /roles/:id - Update role
  updateRole: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const result = await RoleService.updateRole(id, req.body);
      
      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        return res.status(statusCode).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE /roles/:id - Delete role
  deleteRole: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await RoleService.deleteRole(id);
      
      if (!result.success) {
        const statusCode = result.message.includes('not found') ? 404 : 400;
        return res.status(statusCode).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in deleteRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/system - Get system roles
  getSystemRoles: async (req, res) => {
    try {
      const result = await RoleService.getSystemRoles();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getSystemRoles:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/custom - Get custom roles
  getCustomRoles: async (req, res) => {
    try {
      const result = await RoleService.getCustomRoles();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCustomRoles:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /roles/:id/permissions/:permissionId - Add permission to role
  addPermissionToRole: async (req, res) => {
    try {
      const { id: roleId, permissionId } = req.params;
      
      const result = await RoleService.addPermissionToRole(roleId, permissionId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in addPermissionToRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE /roles/:id/permissions/:permissionId - Remove permission from role
  removePermissionFromRole: async (req, res) => {
    try {
      const { id: roleId, permissionId } = req.params;
      
      const result = await RoleService.removePermissionFromRole(roleId, permissionId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in removePermissionFromRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/statistics - Get role statistics
  getRoleStatistics: async (req, res) => {
    try {
      const result = await RoleService.getRoleStatistics();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getRoleStatistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/search - Search roles
  searchRoles: async (req, res) => {
    try {
      const { q, limit, offset, includePermissions } = req.query;
      
      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) is required'
        });
      }

      const options = {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        includePermissions: includePermissions === 'true'
      };

      const result = await RoleService.searchRoles(q.trim(), options);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchRoles:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /roles/update-user-counts - Update user counts for all roles
  updateRoleUserCounts: async (req, res) => {
    try {
      const result = await RoleService.updateAllRoleUserCounts();

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateRoleUserCounts:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /roles/register - Register a new role (admin creating roles with createdBy)
  registerRole: async (req, res) => {
    try {
      const token = req.headers.authorization;
      const currentUser = getUserFromToken(token);

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      console.log('Admin registering role:', req.body);
      console.log('Created by:', currentUser.id);

      const result = await RoleService.registerRole(req.body, currentUser.id);

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in registerRole:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /roles/created-by-me - Get roles created by the logged-in user
  getRolesCreatedByMe: async (req, res) => {
    try {
      const token = req.headers.authorization;
      const currentUser = getUserFromToken(token);

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      const { includePermissions, sortBy, sortOrder } = req.query;
      const options = {
        includePermissions: includePermissions === 'true',
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };

      console.log('Fetching roles created by:', currentUser.id);
      const result = await RoleService.getRolesCreatedByMe(currentUser.id, options);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getRolesCreatedByMe:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = roleController;