const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const Permission = require('../src/models/Permission');
require('dotenv').config();

const seedRoles = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('Connected to MongoDB');

    // Get all permissions to assign to roles
    const permissions = await Permission.find({ isActive: true });
    console.log(`Found ${permissions.length} permissions`);

    if (permissions.length === 0) {
      console.log('No permissions found. Please run permission seeder first.');
      return;
    }

    // Create permission lookup maps
    const permissionMap = {};
    permissions.forEach(permission => {
      const identifier = permission.identifier || permission.name.toLowerCase().replace(/\s+/g, '.');
      permissionMap[identifier] = permission;
    });

    // Helper function to get permission IDs by identifiers
    const getPermissionIds = (identifiers) => {
      const ids = [];
      const permissionIds = [];
      
      identifiers.forEach(identifier => {
        const permission = permissions.find(p => 
          (p.identifier && p.identifier === identifier) ||
          p.name.toLowerCase().replace(/\s+/g, '.') === identifier ||
          `${p.resource}.${p.action}` === identifier
        );
        
        if (permission) {
          ids.push(permission._id);
          permissionIds.push(identifier);
        } else {
          console.warn(`Permission not found: ${identifier}`);
        }
      });
      
      return { ids, permissionIds };
    };

    // Define roles with their permissions
    const roles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        level: 1,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        isSystemRole: true,
        permissionIdentifiers: ['all'] // Special case - all permissions
      },
      {
        name: 'Admin',
        description: 'Administrative access to most features',
        level: 2,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'invoices.create',
          'invoices.edit', 
          'invoices.view',
          'invoices.send',
          'customers.manage',
          'customers.view',
          'customers.create',
          'customers.edit',
          'users.view',
          'users.create',
          'users.edit',
          'products.view',
          'products.create',
          'products.edit',
          'reports.view',
          'reports.export',
          'settings.view',
          'settings.edit',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'Invoice Manager',
        description: 'Full invoice management capabilities',
        level: 3,
        color: 'bg-green-100 text-green-800 border-green-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'invoices.create',
          'invoices.edit',
          'invoices.view',
          'invoices.send',
          'invoices.export',
          'customers.view',
          'customers.create',
          'customers.edit',
          'products.view',
          'reports.view',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'Accountant',
        description: 'Financial reporting and invoice viewing',
        level: 4,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'invoices.view',
          'invoices.export',
          'customers.view',
          'products.view',
          'reports.view',
          'reports.export',
          'reports.create',
          'payments.view',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'Sales Rep',
        description: 'Customer and invoice creation access',
        level: 5,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'invoices.create',
          'invoices.view',
          'invoices.send',
          'customers.view',
          'customers.create',
          'customers.edit',
          'products.view',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'HR Manager',
        description: 'Human resources and user management',
        level: 3,
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'users.view',
          'users.manage',
          'users.create',
          'users.edit',
          'reports.view',
          'reports.export',
          'settings.view',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'Viewer',
        description: 'Read-only access to basic features',
        level: 6,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'invoices.view',
          'customers.view',
          'products.view',
          'reports.view',
          'dashboard.view',
          'profile.edit'
        ]
      },
      {
        name: 'Customer Service',
        description: 'Customer support and basic invoice management',
        level: 4,
        color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        isSystemRole: true,
        permissionIdentifiers: [
          'customers.view',
          'customers.create',
          'customers.edit',
          'invoices.view',
          'invoices.create',
          'products.view',
          'dashboard.view',
          'profile.edit'
        ]
      }
    ];

    // Clear existing system roles (optional)
    await Role.deleteMany({ isSystemRole: true });
    console.log('Cleared existing system roles');

    // Create roles
    const createdRoles = [];
    
    for (const roleData of roles) {
      const { permissionIdentifiers, ...otherRoleData } = roleData;
      
      let rolePermissions = [];
      let rolePermissionIds = [];
      
      if (permissionIdentifiers.includes('all')) {
        // Super Admin gets all permissions
        rolePermissions = permissions.map(p => p._id);
        rolePermissionIds = ['all'];
      } else {
        // Get specific permissions
        const { ids, permissionIds } = getPermissionIds(permissionIdentifiers);
        rolePermissions = ids;
        rolePermissionIds = permissionIds;
      }
      
      const role = new Role({
        ...otherRoleData,
        permissions: rolePermissions,
        permissionIds: rolePermissionIds,
        userCount: 0
      });
      
      const savedRole = await role.save();
      createdRoles.push(savedRole);
      
      console.log(`Created role: ${savedRole.name} with ${rolePermissions.length} permissions`);
    }

    console.log(`\nSeeded ${createdRoles.length} roles successfully`);

    // Display created roles
    console.log('\nCreated Roles:');
    createdRoles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.name} (Level ${role.level}) - ${role.permissions.length} permissions`);
    });

    console.log('\nRole seeding completed successfully!');

    return createdRoles;

  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedRoles().catch(console.error);
}

module.exports = { seedRoles };