require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Role = require('./src/models/Role');

const ADMIN = {
  firstName: 'Hamza',
  lastName: 'Hashmi',
  email: 'hamzahashmi640@gmail.com',
  password: 'hamzahashmi640',
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', mongoose.connection.name);

    // Get-or-create Super Admin role with the "all" permission shortcut
    // (Role.hasPermission() short-circuits on permissionIds.includes('all'))
    let role = await Role.findOne({ name: /^super admin$/i });
    if (!role) {
      role = await Role.create({
        name: 'Super Admin',
        description: 'Full system access',
        permissions: [],
        permissionIds: ['all'],
        level: 1,
        isActive: true,
        isSystemRole: true,
      });
      console.log('Created role: Super Admin');
    } else {
      if (!role.permissionIds.includes('all')) {
        role.permissionIds.push('all');
        await role.save();
      }
      console.log('Using existing role:', role.name);
    }

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      existing.password = ADMIN.password;
      existing.role = role._id;
      existing.isActive = true;
      await existing.save();
      console.log(`Updated existing user "${ADMIN.email}" — password reset, role = Super Admin.`);
    } else {
      await User.create({
        firstName: ADMIN.firstName,
        lastName: ADMIN.lastName,
        email: ADMIN.email,
        password: ADMIN.password,
        role: role._id,
        provider: 'local',
        isActive: true,
      });
      console.log(`Created admin user "${ADMIN.email}".`);
    }

    console.log('\nLogin credentials:');
    console.log('  email:    ', ADMIN.email);
    console.log('  password: ', ADMIN.password);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
