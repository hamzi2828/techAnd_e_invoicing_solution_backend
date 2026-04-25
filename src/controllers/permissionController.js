const PermissionService = require('../services/permissionService');
const { validationResult } = require('express-validator');

const permissionController = {
  // GET /permissions - Get all permissions
  getAllPermissions: async (req, res) => {
    try {
      const { category, sortBy, sortOrder } = req.query;
      const options = {
        category,
        sortBy: sortBy || 'name',
        sortOrder: sortOrder || 'asc'
      };

      const result = await PermissionService.getAllPermissions(options);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /permissions/:id - Get permission by ID
  getPermissionById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await PermissionService.getPermissionById(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPermissionById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /permissions - Create new permission
  createPermission: async (req, res) => {
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

      const result = await PermissionService.createPermission(req.body);
      
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in createPermission:', error);
      
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

  // PUT /permissions/:id - Update permission
  updatePermission: async (req, res) => {
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
      const result = await PermissionService.updatePermission(id, req.body);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in updatePermission:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE /permissions/:id - Delete permission
  deletePermission: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await PermissionService.deletePermission(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in deletePermission:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /permissions/category/:category - Get permissions by category
  getPermissionsByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const result = await PermissionService.getPermissionsByCategory(category);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPermissionsByCategory:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /permissions/resource/:resource - Get permissions by resource
  getPermissionsByResource: async (req, res) => {
    try {
      const { resource } = req.params;
      const result = await PermissionService.getPermissionsByResource(resource);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPermissionsByResource:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /permissions/categories - Get all categories
  getCategories: async (req, res) => {
    try {
      const result = await PermissionService.getCategories();
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCategories:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // POST /permissions/bulk - Bulk create permissions
  bulkCreatePermissions: async (req, res) => {
    try {
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Permissions array is required and cannot be empty'
        });
      }

      const result = await PermissionService.bulkCreatePermissions(permissions);
      
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in bulkCreatePermissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET /permissions/search - Search permissions
  searchPermissions: async (req, res) => {
    try {
      const { q, category, limit, offset } = req.query;
      
      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) is required'
        });
      }

      const options = {
        category,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      };

      const result = await PermissionService.searchPermissions(q.trim(), options);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchPermissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = permissionController;