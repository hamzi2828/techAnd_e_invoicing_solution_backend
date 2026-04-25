const mongoose = require('mongoose');
const Permission = require('../src/models/Permission');
require('dotenv').config();

const permissions = [
  // Invoice Permissions
  {
    name: 'Create Invoices',
    description: 'Ability to create new invoices',
    category: 'Invoices',
    resource: 'invoices',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'Edit Invoices',
    description: 'Ability to modify existing invoices',
    category: 'Invoices',
    resource: 'invoices',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'View Invoices',
    description: 'Ability to view invoice data',
    category: 'Invoices',
    resource: 'invoices',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Delete Invoices',
    description: 'Ability to delete invoices',
    category: 'Invoices',
    resource: 'invoices',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'Send Invoices',
    description: 'Ability to send invoices to customers',
    category: 'Invoices',
    resource: 'invoices',
    action: 'send',
    isSystemPermission: true
  },
  {
    name: 'Export Invoices',
    description: 'Ability to export invoice data',
    category: 'Invoices',
    resource: 'invoices',
    action: 'export',
    isSystemPermission: true
  },

  // Customer Permissions
  {
    name: 'View Customers',
    description: 'Ability to view customer list and details',
    category: 'Customers',
    resource: 'customers',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Create Customers',
    description: 'Ability to add new customers',
    category: 'Customers',
    resource: 'customers',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'Edit Customers',
    description: 'Ability to modify customer information',
    category: 'Customers',
    resource: 'customers',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'Delete Customers',
    description: 'Ability to remove customers',
    category: 'Customers',
    resource: 'customers',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'Manage Customers',
    description: 'Full customer management access',
    category: 'Customers',
    resource: 'customers',
    action: 'manage',
    isSystemPermission: true
  },

  // Product Permissions
  {
    name: 'View Products',
    description: 'Ability to view product catalog',
    category: 'Products',
    resource: 'products',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Create Products',
    description: 'Ability to add new products/services',
    category: 'Products',
    resource: 'products',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'Edit Products',
    description: 'Ability to modify product information',
    category: 'Products',
    resource: 'products',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'Delete Products',
    description: 'Ability to remove products',
    category: 'Products',
    resource: 'products',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'Manage Products',
    description: 'Full product management access',
    category: 'Products',
    resource: 'products',
    action: 'manage',
    isSystemPermission: true
  },

  // Reports Permissions
  {
    name: 'View Reports',
    description: 'Ability to access reporting dashboard',
    category: 'Reports',
    resource: 'reports',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Export Reports',
    description: 'Ability to export reports to files',
    category: 'Reports',
    resource: 'reports',
    action: 'export',
    isSystemPermission: true
  },
  {
    name: 'Create Reports',
    description: 'Ability to create custom reports',
    category: 'Reports',
    resource: 'reports',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'Advanced Reports',
    description: 'Access to advanced reporting features',
    category: 'Reports',
    resource: 'reports',
    action: 'advanced',
    isSystemPermission: true
  },

  // User Management Permissions
  {
    name: 'View Users',
    description: 'Ability to view user list',
    category: 'Users',
    resource: 'users',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Create Users',
    description: 'Ability to add new users',
    category: 'Users',
    resource: 'users',
    action: 'create',
    isSystemPermission: true
  },
  {
    name: 'Edit Users',
    description: 'Ability to modify user accounts',
    category: 'Users',
    resource: 'users',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'Delete Users',
    description: 'Ability to remove users',
    category: 'Users',
    resource: 'users',
    action: 'delete',
    isSystemPermission: true
  },
  {
    name: 'Manage Users',
    description: 'Full user management access',
    category: 'Users',
    resource: 'users',
    action: 'manage',
    isSystemPermission: true
  },

  // Settings Permissions
  {
    name: 'View Settings',
    description: 'Ability to view system settings',
    category: 'Settings',
    resource: 'settings',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Edit Settings',
    description: 'Ability to modify system settings',
    category: 'Settings',
    resource: 'settings',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'Company Settings',
    description: 'Ability to manage company profile',
    category: 'Settings',
    resource: 'settings',
    action: 'company',
    isSystemPermission: true
  },
  {
    name: 'System Administration',
    description: 'Full system administration access',
    category: 'Settings',
    resource: 'settings',
    action: 'admin',
    isSystemPermission: true
  },

  // Payment Permissions
  {
    name: 'View Payments',
    description: 'Ability to view payment information',
    category: 'Reports',
    resource: 'payments',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Process Payments',
    description: 'Ability to process customer payments',
    category: 'Reports',
    resource: 'payments',
    action: 'process',
    isSystemPermission: true
  },
  {
    name: 'Refund Payments',
    description: 'Ability to process refunds',
    category: 'Reports',
    resource: 'payments',
    action: 'refund',
    isSystemPermission: true
  },

  // General Permissions
  {
    name: 'Dashboard Access',
    description: 'Access to main dashboard',
    category: 'General',
    resource: 'dashboard',
    action: 'view',
    isSystemPermission: true
  },
  {
    name: 'Profile Management',
    description: 'Ability to manage own profile',
    category: 'General',
    resource: 'profile',
    action: 'edit',
    isSystemPermission: true
  },
  {
    name: 'Notification Settings',
    description: 'Ability to manage notification preferences',
    category: 'General',
    resource: 'notifications',
    action: 'manage',
    isSystemPermission: true
  }
];

const seedPermissions = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('Connected to MongoDB');

    // Clear existing permissions (optional - remove if you want to keep existing data)
    await Permission.deleteMany({ isSystemPermission: true });
    console.log('Cleared existing system permissions');

    // Insert permissions
    const insertedPermissions = await Permission.insertMany(permissions);
    console.log(`Seeded ${insertedPermissions.length} permissions successfully`);

    // Display created permissions
    console.log('\nCreated Permissions:');
    insertedPermissions.forEach((permission, index) => {
      console.log(`${index + 1}. ${permission.name} (${permission.category})`);
    });

    console.log('\nPermissions seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding permissions:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedPermissions();
}

module.exports = { seedPermissions, permissions };