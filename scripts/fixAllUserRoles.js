const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const db = mongoose.connection.db;
    
    // Get all roles first
    const rolesCollection = db.collection('roles');
    const roles = await rolesCollection.find({}).toArray();
    console.log('Available roles:', roles.map(r => ({ name: r.name, id: r._id })));
    
    // Create comprehensive mapping from role names to ObjectIds
    const roleMap = {};
    roles.forEach(role => {
      const name = role.name.toLowerCase().trim();
      roleMap[name] = role._id;
      
      // Add common variations
      roleMap[role.name] = role._id; // Original case
      roleMap[role.name.toLowerCase()] = role._id;
      roleMap[role.name.replace(/\s+/g, '')] = role._id; // Remove spaces
      roleMap[role.name.toLowerCase().replace(/\s+/g, '')] = role._id; // Lower case, no spaces
    });
    
    console.log('Role mapping keys:', Object.keys(roleMap));
    
    // Find ALL users with string role values (any string type)
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Check each user's role type
    const usersWithStringRoles = [];
    const usersWithObjectIdRoles = [];
    
    for (const user of allUsers) {
      if (typeof user.role === 'string') {
        usersWithStringRoles.push(user);
      } else if (user.role && user.role.constructor && user.role.constructor.name === 'ObjectId') {
        usersWithObjectIdRoles.push(user);
      } else {
        console.log(`User ${user.email} has unexpected role type:`, typeof user.role, user.role);
      }
    }
    
    console.log(`Users with string roles: ${usersWithStringRoles.length}`);
    console.log(`Users with ObjectId roles: ${usersWithObjectIdRoles.length}`);
    
    // List all string roles found
    const stringRoles = [...new Set(usersWithStringRoles.map(u => u.role))];
    console.log('String roles found:', stringRoles);
    
    // Update each user with string roles
    let updated = 0;
    let failed = 0;
    
    for (const user of usersWithStringRoles) {
      try {
        const roleString = user.role;
        console.log(`Processing user ${user.email} with role: "${roleString}"`);
        
        // Try multiple variations to find the role
        let roleObjectId = null;
        const variations = [
          roleString,
          roleString.toLowerCase(),
          roleString.toLowerCase().trim(),
          roleString.replace(/\s+/g, ''),
          roleString.toLowerCase().replace(/\s+/g, '')
        ];
        
        for (const variation of variations) {
          if (roleMap[variation]) {
            roleObjectId = roleMap[variation];
            console.log(`  Found match for variation: "${variation}"`);
            break;
          }
        }
        
        if (roleObjectId) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { role: roleObjectId } }
          );
          console.log(`✓ Updated ${user.email}: "${roleString}" → ObjectId(${roleObjectId})`);
          updated++;
        } else {
          // Set to Super Admin as default if no match found
          const defaultRole = roleMap['super admin'] || roleMap['admin'] || Object.values(roleMap)[0];
          if (defaultRole) {
            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { role: defaultRole } }
            );
            console.log(`✓ Updated ${user.email}: "${roleString}" → Super Admin (default)`);
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
    
    console.log(`\nFinal Migration Results:`);
    console.log(`- Updated: ${updated} users`);
    console.log(`- Failed: ${failed} users`);
    
    // Final verification
    const remainingStringRoles = await usersCollection.countDocuments({
      role: { $type: "string" }
    });
    console.log(`- Remaining string roles: ${remainingStringRoles}`);
    
    if (remainingStringRoles === 0) {
      console.log('✅ All users now have ObjectId role references!');
    } else {
      console.log('⚠️  Some users still have string roles. Manual investigation needed.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
fixAllUserRoles();