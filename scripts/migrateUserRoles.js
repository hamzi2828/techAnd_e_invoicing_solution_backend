const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
require('dotenv').config();

async function migrateUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database');
    
    // Get all users with string role values
    const usersWithStringRoles = await mongoose.connection.db.collection('users').find({
      role: { $type: "string" }
    }).toArray();
    
    console.log(`Found ${usersWithStringRoles.length} users with string role values`);
    
    // Get all available roles
    const roles = await Role.find();
    const roleMap = new Map();
    
    // Create a map of role names (case-insensitive) to ObjectIds
    roles.forEach(role => {
      roleMap.set(role.name.toLowerCase().trim(), role._id);
    });
    
    console.log('Available roles:', Array.from(roleMap.keys()));
    
    // Process each user
    for (const user of usersWithStringRoles) {
      const roleString = user.role.toLowerCase().trim();
      const roleObjectId = roleMap.get(roleString);
      
      if (roleObjectId) {
        // Update user with ObjectId reference
        await mongoose.connection.db.collection('users').updateOne(
          { _id: user._id },
          { $set: { role: roleObjectId } }
        );
        console.log(`Updated user ${user.email} role from "${user.role}" to ObjectId`);
      } else {
        // Try to find a default role or create one
        let defaultRole = roleMap.get('user');
        if (!defaultRole) {
          // Create a default user role if it doesn't exist
          const newRole = new Role({
            name: 'User',
            description: 'Default user role',
            level: 5,
            isSystemRole: true,
            permissionIds: ['profile.edit', 'invoices.view']
          });
          await newRole.save();
          defaultRole = newRole._id;
          roleMap.set('user', defaultRole);
        }
        
        await mongoose.connection.db.collection('users').updateOne(
          { _id: user._id },
          { $set: { role: defaultRole } }
        );
        console.log(`Updated user ${user.email} role from "${user.role}" to default "User" role`);
      }
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateUserRoles()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateUserRoles;