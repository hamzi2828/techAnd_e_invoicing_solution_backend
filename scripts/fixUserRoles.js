const mongoose = require('mongoose');
require('dotenv').config();

async function fixUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const db = mongoose.connection.db;
    
    // First, let's see what roles exist
    const rolesCollection = db.collection('roles');
    const roles = await rolesCollection.find({}).toArray();
    console.log('Available roles:', roles.map(r => ({ name: r.name, id: r._id })));
    
    // Create a mapping from role names to ObjectIds
    const roleMap = {};
    roles.forEach(role => {
      const name = role.name.toLowerCase().trim();
      roleMap[name] = role._id;
      // Also map common variations
      if (name === 'super admin') {
        roleMap['superadmin'] = role._id;
      }
    });
    
    console.log('Role mapping:', roleMap);
    
    // Find users with string role values
    const usersCollection = db.collection('users');
    const usersWithStringRoles = await usersCollection.find({
      role: { $type: "string" }
    }).toArray();
    
    console.log(`Found ${usersWithStringRoles.length} users with string roles`);
    
    // Update each user
    let updated = 0;
    let failed = 0;
    
    for (const user of usersWithStringRoles) {
      try {
        const roleString = user.role.toLowerCase().trim();
        const roleObjectId = roleMap[roleString];
        
        if (roleObjectId) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { role: roleObjectId } }
          );
          console.log(`✓ Updated ${user.email}: "${user.role}" → ObjectId`);
          updated++;
        } else {
          // Set to default user role
          const defaultRole = roleMap['user'] || roleMap['customer'] || Object.values(roleMap)[0];
          if (defaultRole) {
            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { role: defaultRole } }
            );
            console.log(`✓ Updated ${user.email}: "${user.role}" → default role`);
            updated++;
          } else {
            console.log(`✗ No default role found for ${user.email}`);
            failed++;
          }
        }
      } catch (error) {
        console.error(`✗ Failed to update ${user.email}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\nMigration completed:`);
    console.log(`- Updated: ${updated} users`);
    console.log(`- Failed: ${failed} users`);
    
    // Verify the migration
    const remainingStringRoles = await usersCollection.countDocuments({
      role: { $type: "string" }
    });
    console.log(`- Remaining string roles: ${remainingStringRoles}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
fixUserRoles();