const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');

class RoleService {
  // Get all roles
  static async getAllRoles(options = {}) {
    try {
      const { includePermissions = true, isActive = true, sortBy = 'level', sortOrder = 'asc' } = options;
      
      const query = { isActive };
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      let rolesQuery = Role.find(query).sort(sort);
      
      if (includePermissions) {
        rolesQuery = rolesQuery.populate('permissions', 'id name description category resource action');
      }
      
      const roles = await rolesQuery;
      
      // Update user counts for all roles
      await Promise.all(roles.map(role => role.updateUserCount()));
      
      return {
        success: true,
        data: roles,
        message: 'Roles retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error('Failed to fetch roles: ' + error.message);
    }
  }

  // Get role by ID
  static async getRoleById(id, includePermissions = true) {
    try {
      let roleQuery = Role.findById(id);
      
      if (includePermissions) {
        roleQuery = roleQuery.populate('permissions', 'id name description category resource action');
      }
      
      const role = await roleQuery;
      
      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        };
      }
      
      // Update user count
      await role.updateUserCount();
      
      return {
        success: true,
        data: role,
        message: 'Role retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching role:', error);
      throw new Error('Failed to fetch role: ' + error.message);
    }
  }

  // Create new role
  static async createRole(roleData) {
    try {
      const { permissions: permissionIds, ...otherData } = roleData;
      
      // Create role without permissions first
      const role = new Role(otherData);
      
      // If permissions are provided, validate and add them
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.find({
          id: { $in: permissionIds },
          isActive: true
        });

        if (permissions.length !== permissionIds.length) {
          console.warn(`Expected ${permissionIds.length} permissions, found ${permissions.length}`);
          console.warn('Missing permissions:', permissionIds.filter(id => !permissions.find(p => p.id === id)));
        }

        // Store the permission IDs (custom string IDs, not ObjectIds)
        role.permissions = permissions.map(p => p._id); // Store MongoDB ObjectIds
        role.permissionIds = permissionIds; // Store custom string IDs
      }
      
      const savedRole = await role.save();
      
      // Populate permissions for response
      await savedRole.populate('permissions', 'id name description category');
      
      return {
        success: true,
        data: savedRole,
        message: 'Role created successfully'
      };
    } catch (error) {
      console.error('Error creating role:', error);
      
      if (error.code === 11000) {
        throw new Error('Role with this name already exists');
      }
      
      throw new Error('Failed to create role: ' + error.message);
    }
  }

  // Update role
  static async updateRole(id, updateData) {
    try {
      const { permissions: permissionIds, ...otherData } = updateData;
      
      const role = await Role.findById(id);
      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        };
      }
      
      // Check if it's a system role and prevent certain modifications
      if (role.isSystemRole && (otherData.name || otherData.level)) {
        return {
          success: false,
          message: 'Cannot modify name or level of system roles'
        };
      }
      
      // Update basic fields
      Object.assign(role, otherData);
      
      // If permissions are being updated
      if (permissionIds !== undefined) {
        if (permissionIds.length > 0) {
          const permissions = await Permission.find({
            id: { $in: permissionIds },
            isActive: true
          });

          if (permissions.length !== permissionIds.length) {
            console.warn(`Expected ${permissionIds.length} permissions, found ${permissions.length}`);
            console.warn('Missing permissions:', permissionIds.filter(id => !permissions.find(p => p.id === id)));
          }

          // Store the permission IDs (custom string IDs, not ObjectIds)
          role.permissions = permissions.map(p => p._id); // Store MongoDB ObjectIds
          role.permissionIds = permissionIds; // Store custom string IDs
        } else {
          role.permissions = [];
          role.permissionIds = [];
        }
      }
      
      const updatedRole = await role.save();
      await updatedRole.populate('permissions', 'id name description category');
      
      return {
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      };
    } catch (error) {
      console.error('Error updating role:', error);
      throw new Error('Failed to update role: ' + error.message);
    }
  }

  // Delete role
  static async deleteRole(id) {
    try {
      const role = await Role.findById(id);
      
      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        };
      }
      
      // Check if role is a system role
      if (role.isSystemRole) {
        return {
          success: false,
          message: 'Cannot delete system roles'
        };
      }
      
      // Check if role is assigned to any users
      const userCount = await User.countDocuments({ role: role.name, isActive: true });
      if (userCount > 0) {
        return {
          success: false,
          message: `Cannot delete role. ${userCount} user(s) are currently assigned to this role`
        };
      }
      
      // Soft delete by marking as inactive
      role.isActive = false;
      await role.save();
      
      return {
        success: true,
        message: 'Role deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting role:', error);
      throw new Error('Failed to delete role: ' + error.message);
    }
  }

  // Get system roles
  static async getSystemRoles() {
    try {
      const roles = await Role.findSystemRoles().populate('permissions', 'id name description category');
      
      return {
        success: true,
        data: roles,
        message: 'System roles retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching system roles:', error);
      throw new Error('Failed to fetch system roles: ' + error.message);
    }
  }

  // Get custom roles
  static async getCustomRoles() {
    try {
      const roles = await Role.findCustomRoles().populate('permissions', 'id name description category');
      
      return {
        success: true,
        data: roles,
        message: 'Custom roles retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching custom roles:', error);
      throw new Error('Failed to fetch custom roles: ' + error.message);
    }
  }

  // Add permission to role
  static async addPermissionToRole(roleId, permissionId) {
    try {
      const role = await Role.findById(roleId);
      const permission = await Permission.findById(permissionId);
      
      if (!role) {
        return { success: false, message: 'Role not found' };
      }
      
      if (!permission) {
        return { success: false, message: 'Permission not found' };
      }
      
      const permissionIdentifier = permission.identifier || permission.name.toLowerCase().replace(/\s+/g, '.');
      await role.addPermission(permissionIdentifier, permissionId);
      
      return {
        success: true,
        data: role,
        message: 'Permission added to role successfully'
      };
    } catch (error) {
      console.error('Error adding permission to role:', error);
      throw new Error('Failed to add permission to role: ' + error.message);
    }
  }

  // Remove permission from role
  static async removePermissionFromRole(roleId, permissionId) {
    try {
      const role = await Role.findById(roleId);
      const permission = await Permission.findById(permissionId);
      
      if (!role) {
        return { success: false, message: 'Role not found' };
      }
      
      if (!permission) {
        return { success: false, message: 'Permission not found' };
      }
      
      const permissionIdentifier = permission.identifier || permission.name.toLowerCase().replace(/\s+/g, '.');
      await role.removePermission(permissionIdentifier, permissionId);
      
      return {
        success: true,
        data: role,
        message: 'Permission removed from role successfully'
      };
    } catch (error) {
      console.error('Error removing permission from role:', error);
      throw new Error('Failed to remove permission from role: ' + error.message);
    }
  }

  // Get role statistics
  static async getRoleStatistics() {
    try {
      const totalRoles = await Role.countDocuments({ isActive: true });
      const systemRoles = await Role.countDocuments({ isSystemRole: true, isActive: true });
      const customRoles = await Role.countDocuments({ isSystemRole: false, isActive: true });
      const totalPermissions = await Permission.countDocuments({ isActive: true });
      
      return {
        success: true,
        data: {
          totalRoles,
          systemRoles,
          customRoles,
          totalPermissions
        },
        message: 'Role statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching role statistics:', error);
      throw new Error('Failed to fetch role statistics: ' + error.message);
    }
  }

  // Search roles
  static async searchRoles(query, options = {}) {
    try {
      const { limit = 50, offset = 0, includePermissions = false } = options;
      
      const searchQuery = {
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };
      
      let rolesQuery = Role.find(searchQuery)
        .limit(limit)
        .skip(offset)
        .sort({ level: 1 });
      
      if (includePermissions) {
        rolesQuery = rolesQuery.populate('permissions', 'id name description category');
      }
      
      const roles = await rolesQuery;
      const total = await Role.countDocuments(searchQuery);
      
      return {
        success: true,
        data: roles,
        total,
        limit,
        offset,
        message: 'Search completed successfully'
      };
    } catch (error) {
      console.error('Error searching roles:', error);
      throw new Error('Failed to search roles: ' + error.message);
    }
  }

  // Update user counts for all roles
  static async updateAllRoleUserCounts() {
    try {
      const roles = await Role.find({ isActive: true });

      await Promise.all(roles.map(role => role.updateUserCount()));

      return {
        success: true,
        message: 'User counts updated for all roles'
      };
    } catch (error) {
      console.error('Error updating role user counts:', error);
      throw new Error('Failed to update role user counts: ' + error.message);
    }
  }

  // Register Role (Admin creating roles with createdBy tracking)
  static async registerRole(roleData, createdBy) {
    try {
      const { permissions: permissionIds, ...otherData } = roleData;

      // Create role without permissions first
      const role = new Role({
        ...otherData,
        createdBy: createdBy || null
      });

      // If permissions are provided, validate and add them
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.find({
          id: { $in: permissionIds },
          isActive: true
        });

        if (permissions.length !== permissionIds.length) {
          console.warn(`Expected ${permissionIds.length} permissions, found ${permissions.length}`);
          console.warn('Missing permissions:', permissionIds.filter(id => !permissions.find(p => p.id === id)));
        }

        // Store the permission IDs (custom string IDs, not ObjectIds)
        role.permissions = permissions.map(p => p._id); // Store MongoDB ObjectIds
        role.permissionIds = permissionIds; // Store custom string IDs
      }

      const savedRole = await role.save();

      // Populate permissions and createdBy for response
      await savedRole.populate('permissions', 'id name description category');
      if (savedRole.createdBy) {
        await savedRole.populate('createdBy', 'firstName lastName email');
      }

      return {
        success: true,
        data: savedRole,
        message: 'Role registered successfully'
      };
    } catch (error) {
      console.error('Error registering role:', error);

      if (error.code === 11000) {
        throw new Error('Role with this name already exists');
      }

      throw new Error('Failed to register role: ' + error.message);
    }
  }

  // Get Roles Created By Me
  static async getRolesCreatedByMe(currentUserId, options = {}) {
    try {
      const { includePermissions = true, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      const query = { createdBy: currentUserId, isActive: true };
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      let rolesQuery = Role.find(query).sort(sort);

      if (includePermissions) {
        rolesQuery = rolesQuery.populate('permissions', 'id name description category resource action');
      }

      // Populate createdBy details
      rolesQuery = rolesQuery.populate('createdBy', 'firstName lastName email');

      const roles = await rolesQuery;

      // Update user counts for all roles
      await Promise.all(roles.map(role => role.updateUserCount()));

      console.log(`Found ${roles.length} roles created by user ${currentUserId}`);

      return {
        success: true,
        data: roles,
        message: 'Roles created by you retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching roles created by me:', error);
      throw new Error('Failed to fetch roles created by you: ' + error.message);
    }
  }
}

module.exports = RoleService;