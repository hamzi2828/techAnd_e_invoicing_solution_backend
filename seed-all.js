require('dotenv').config();
const mongoose = require('mongoose');

const Permission = require('./src/models/Permission');
const Role = require('./src/models/Role');
const User = require('./src/models/User');

// Re-use the data arrays from the existing seeders so we stay in sync.
// The existing runner functions are skipped because they each open/close
// their own connection (which clobbers a unified run) and the permission
// seeder data is missing the `id` field that the Permission schema requires.
const { permissions: permissionData } = require('./seeders/permissionSeeder');

// Hardcoded role _ids referenced by the frontend (src/helper/helper.ts ROLE_IDS).
const FRONTEND_ROLE_IDS = {
  SUPER_ADMIN: '68bed8982bb19cac89def499',
  ADMIN: '68bed8982bb19cac89def49b',
  INVOICE_MANAGER: '68bed8982bb19cac89def49d',
  ACCOUNTANT: '68bed8992bb19cac89def49f',
  SALES_REP: '68bed8992bb19cac89def4a1',
  HR_MANAGER: '68bed8992bb19cac89def4a3',
  CUSTOMER_SERVICE: '68bed89a2bb19cac89def4a7',
  USER: '68bedb7fff7fc8961da7a3f8',
};

const ADMIN_EMAIL = 'hamzahashmi640@gmail.com';

// --- helpers ---

const buildPermissionId = (p) => {
  if (p.id) return p.id;
  if (p.identifier) return p.identifier;
  if (p.resource && p.action) return `${p.resource}.${p.action}`;
  return p.name.toLowerCase().replace(/\s+/g, '.');
};

const seedPermissions = async () => {
  const docs = permissionData.map((p) => ({ ...p, id: buildPermissionId(p) }));
  await Permission.deleteMany({ isSystemPermission: true });
  const inserted = await Permission.insertMany(docs);
  console.log(`Permissions: inserted ${inserted.length}`);
  return inserted;
};

// Definitions for all system roles. Hardcoded `_id` is REQUIRED so the
// frontend's ROLE_IDS constants keep working.
const roleDefs = (allPermissions) => {
  const byId = new Map(allPermissions.map((p) => [p.id, p]));
  const find = (ids) =>
    ids
      .map((id) => byId.get(id))
      .filter(Boolean);

  return [
    {
      _id: FRONTEND_ROLE_IDS.SUPER_ADMIN,
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      level: 1,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      isSystemRole: true,
      permissions: allPermissions.map((p) => p._id),
      permissionIds: ['all'],
    },
    {
      _id: FRONTEND_ROLE_IDS.ADMIN,
      name: 'Admin',
      description: 'Administrative access to most features',
      level: 2,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'invoices.create','invoices.edit','invoices.view','invoices.send',
          'customers.manage','customers.view','customers.create','customers.edit',
          'users.view','users.create','users.edit',
          'products.view','products.create','products.edit',
          'reports.view','reports.export',
          'settings.view','settings.edit',
          'dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.INVOICE_MANAGER,
      name: 'Invoice Manager',
      description: 'Full invoice management capabilities',
      level: 3,
      color: 'bg-green-100 text-green-800 border-green-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'invoices.create','invoices.edit','invoices.view','invoices.send','invoices.export',
          'customers.view','customers.create','customers.edit',
          'products.view','reports.view',
          'dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.ACCOUNTANT,
      name: 'Accountant',
      description: 'Financial reporting and invoice viewing',
      level: 4,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'invoices.view','invoices.export',
          'customers.view','products.view',
          'reports.view','reports.export','reports.create',
          'payments.view','dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.SALES_REP,
      name: 'Sales Rep',
      description: 'Customer and invoice creation access',
      level: 5,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'invoices.create','invoices.view','invoices.send',
          'customers.view','customers.create','customers.edit',
          'products.view','dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.HR_MANAGER,
      name: 'HR Manager',
      description: 'Human resources and user management',
      level: 3,
      color: 'bg-pink-100 text-pink-800 border-pink-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'users.view','users.manage','users.create','users.edit',
          'reports.view','reports.export',
          'settings.view','dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.CUSTOMER_SERVICE,
      name: 'Customer Service',
      description: 'Customer support and basic invoice management',
      level: 4,
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      isSystemRole: true,
      ...(() => {
        const ids = [
          'customers.view','customers.create','customers.edit',
          'invoices.view','invoices.create',
          'products.view','dashboard.view','profile.edit',
        ];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
    {
      _id: FRONTEND_ROLE_IDS.USER,
      name: 'User',
      description: 'Default role for new users',
      level: 6,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      isSystemRole: true,
      ...(() => {
        const ids = ['profile.edit', 'invoices.view', 'dashboard.view'];
        const found = find(ids);
        return { permissions: found.map((p) => p._id), permissionIds: found.map((p) => p.id) };
      })(),
    },
  ];
};

const seedRoles = async (allPermissions) => {
  const defs = roleDefs(allPermissions);
  for (const def of defs) {
    const _id = new mongoose.Types.ObjectId(def._id);
    await Role.deleteOne({ _id });
    await new Role({ ...def, _id }).save();
    console.log(`Role: "${def.name}" (${_id}) — ${def.permissionIds.length} perms`);
  }
};

const ensureAdminUserRole = async () => {
  const user = await User.findOne({ email: ADMIN_EMAIL });
  if (!user) {
    console.warn(`Admin user "${ADMIN_EMAIL}" not found — skipping role assignment.`);
    return;
  }
  user.role = new mongoose.Types.ObjectId(FRONTEND_ROLE_IDS.SUPER_ADMIN);
  await user.save();
  console.log(`Admin user "${ADMIN_EMAIL}" → Super Admin.`);
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', mongoose.connection.name, '\n');

    console.log('--- Seeding permissions ---');
    const perms = await seedPermissions();

    console.log('\n--- Seeding roles ---');
    await seedRoles(perms);

    console.log('\n--- Ensuring admin user role ---');
    await ensureAdminUserRole();

    console.log('\nDone.');
    console.log('\nNote: data seeders (companies, customers, categories, products) were');
    console.log('skipped — they hardcode an old user _id (68b741c85f4ef5778646f0b2) and');
    console.log('would create orphaned records in the new DB.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
