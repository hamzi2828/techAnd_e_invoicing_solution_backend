const Permission = require('../models/Permission');

class PermissionService {
  // Get all permissions
  static async getAllPermissions(options = {}) {
    try {
      const { category, isActive = true, sortBy = 'name', sortOrder = 'asc' } = options;
      
      const query = { isActive };
      if (category) {
        query.category = category;
      }
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const permissions = await Permission.find(query).sort(sort);
      
      return {
        success: true,
        data: permissions,
        message: 'Permissions retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw new Error('Failed to fetch permissions: ' + error.message);
    }
  }

  // Get permission by ID
  static async getPermissionById(id) {
    try {
      const permission = await Permission.findById(id);
      
      if (!permission) {
        return {
          success: false,
          message: 'Permission not found'
        };
      }
      
      return {
        success: true,
        data: permission,
        message: 'Permission retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching permission:', error);
      throw new Error('Failed to fetch permission: ' + error.message);
    }
  }

  // Create new permission
  static async createPermission(permissionData) {
    try {
      const permission = new Permission(permissionData);
      const savedPermission = await permission.save();
      
      return {
        success: true,
        data: savedPermission,
        message: 'Permission created successfully'
      };
    } catch (error) {
      console.error('Error creating permission:', error);
      
      if (error.code === 11000) {
        throw new Error('Permission with this name already exists');
      }
      
      throw new Error('Failed to create permission: ' + error.message);
    }
  }

  // Update permission
  static async updatePermission(id, updateData) {
    try {
      const permission = await Permission.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!permission) {
        return {
          success: false,
          message: 'Permission not found'
        };
      }
      
      return {
        success: true,
        data: permission,
        message: 'Permission updated successfully'
      };
    } catch (error) {
      console.error('Error updating permission:', error);
      throw new Error('Failed to update permission: ' + error.message);
    }
  }

  // Delete permission
  static async deletePermission(id) {
    try {
      const permission = await Permission.findById(id);
      
      if (!permission) {
        return {
          success: false,
          message: 'Permission not found'
        };
      }
      
      // Check if permission is a system permission
      if (permission.isSystemPermission) {
        return {
          success: false,
          message: 'Cannot delete system permissions'
        };
      }
      
      // Soft delete by marking as inactive
      permission.isActive = false;
      await permission.save();
      
      return {
        success: true,
        message: 'Permission deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting permission:', error);
      throw new Error('Failed to delete permission: ' + error.message);
    }
  }

  // Get permissions by category
  static async getPermissionsByCategory(category) {
    try {
      const permissions = await Permission.findByCategory(category);
      
      return {
        success: true,
        data: permissions,
        message: `Permissions for category '${category}' retrieved successfully`
      };
    } catch (error) {
      console.error('Error fetching permissions by category:', error);
      throw new Error('Failed to fetch permissions by category: ' + error.message);
    }
  }

  // Get permissions by resource
  static async getPermissionsByResource(resource) {
    try {
      const permissions = await Permission.findByResource(resource);
      
      return {
        success: true,
        data: permissions,
        message: `Permissions for resource '${resource}' retrieved successfully`
      };
    } catch (error) {
      console.error('Error fetching permissions by resource:', error);
      throw new Error('Failed to fetch permissions by resource: ' + error.message);
    }
  }

  // Get all categories
  static async getCategories() {
    try {
      const categories = await Permission.distinct('category', { isActive: true });
      
      return {
        success: true,
        data: categories.sort(),
        message: 'Categories retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories: ' + error.message);
    }
  }

  // Bulk create permissions
  static async bulkCreatePermissions(permissionsData) {
    try {
      const permissions = await Permission.insertMany(permissionsData);
      
      return {
        success: true,
        data: permissions,
        message: `${permissions.length} permissions created successfully`
      };
    } catch (error) {
      console.error('Error bulk creating permissions:', error);
      throw new Error('Failed to bulk create permissions: ' + error.message);
    }
  }

  // Search permissions
  static async searchPermissions(query, options = {}) {
    try {
      const { category, limit = 50, offset = 0 } = options;
      
      const searchQuery = {
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };
      
      if (category) {
        searchQuery.category = category;
      }
      
      const permissions = await Permission.find(searchQuery)
        .limit(limit)
        .skip(offset)
        .sort({ name: 1 });
      
      const total = await Permission.countDocuments(searchQuery);
      
      return {
        success: true,
        data: permissions,
        total,
        limit,
        offset,
        message: 'Search completed successfully'
      };
    } catch (error) {
      console.error('Error searching permissions:', error);
      throw new Error('Failed to search permissions: ' + error.message);
    }
  }
}

module.exports = PermissionService;