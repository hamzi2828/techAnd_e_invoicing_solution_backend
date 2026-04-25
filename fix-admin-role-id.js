require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Role = require('./src/models/Role');

// Hardcoded in frontend src/helper/helper.ts (ROLE_IDS.SUPER_ADMIN)
const SUPER_ADMIN_ID = new mongoose.Types.ObjectId('68bed8982bb19cac89def499');
const ADMIN_ID = new mongoose.Types.ObjectId('68bed8982bb19cac89def49b');
const NEW_USER_ROLE_ID = new mongoose.Types.ObjectId('68bedb7fff7fc8961da7a3f8');

const ADMIN_EMAIL = 'hamzahashmi640@gmail.com';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', mongoose.connection.name);

    const upsertRole = async (id, name, level) => {
      const existing = await Role.findById(id);
      if (existing) {
        if (!existing.permissionIds.includes('all')) {
          existing.permissionIds.push('all');
          await existing.save();
        }
        console.log(`Role "${name}" already exists with target _id.`);
        return existing;
      }
      const role = new Role({
        _id: id,
        name,
        description: `${name} role`,
        permissions: [],
        permissionIds: ['all'],
        level,
        isActive: true,
        isSystemRole: true,
      });
      await role.save();
      console.log(`Created role "${name}" with _id ${id}.`);
      return role;
    };

    // Drop any existing role(s) with the same name but a different _id
    await Role.deleteMany({ name: /^super admin$/i, _id: { $ne: SUPER_ADMIN_ID } });
    await Role.deleteMany({ name: /^admin$/i, _id: { $ne: ADMIN_ID } });

    const superAdmin = await upsertRole(SUPER_ADMIN_ID, 'Super Admin', 1);
    await upsertRole(ADMIN_ID, 'Admin', 2);
    await upsertRole(NEW_USER_ROLE_ID, 'User', 5);

    const user = await User.findOne({ email: ADMIN_EMAIL });
    if (!user) {
      console.error(`User ${ADMIN_EMAIL} not found.`);
      process.exitCode = 1;
      return;
    }
    user.role = superAdmin._id;
    await user.save();
    console.log(`User "${ADMIN_EMAIL}" role updated to Super Admin (${superAdmin._id}).`);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
