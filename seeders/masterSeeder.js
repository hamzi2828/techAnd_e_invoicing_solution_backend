const mongoose = require('mongoose');
const { seedPermissions } = require('./permissionSeeder');
const { seedRoles } = require('./roleSeeder');
const { seedBankAccounts } = require('./bankAccountSeeder');
const { seedCompanies } = require('./companySeeder');
const { seedCategories } = require('./categorySeeder');
const { seedProducts } = require('./productSeeder');
require('dotenv').config();

const runMasterSeeder = async () => {
  try {
    console.log('🌱 Starting Master Seeder...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('✅ Connected to MongoDB');

    // Step 1: Seed Permissions
    console.log('\n📋 Step 1: Seeding Permissions...');
    await seedPermissions();

    // Wait a moment for permissions to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Seed Roles
    console.log('\n👥 Step 2: Seeding Roles...');
    await seedRoles();

    // Wait a moment for roles to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Seed Bank Accounts (Optional - requires existing user)
    console.log('\n🏦 Step 3: Seeding Bank Accounts...');
    try {
      await seedBankAccounts();
    } catch (error) {
      console.log('⚠️  Bank account seeding skipped (user may not exist):', error.message);
    }

    // Wait a moment for bank accounts to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Seed Companies (Optional - requires existing user)
    console.log('\n🏢 Step 4: Seeding Companies...');
    try {
      await seedCompanies();
    } catch (error) {
      console.log('⚠️  Company seeding skipped (user may not exist):', error.message);
    }

    // Wait a moment for companies to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Seed Categories (Optional - requires existing user)
    console.log('\n📁 Step 5: Seeding Categories...');
    try {
      await seedCategories();
    } catch (error) {
      console.log('⚠️  Category seeding skipped (user may not exist):', error.message);
    }

    // Wait a moment for categories to be fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 6: Seed Products (Optional - requires existing user and categories)
    console.log('\n📦 Step 6: Seeding Products...');
    try {
      await seedProducts();
    } catch (error) {
      console.log('⚠️  Product seeding skipped (user/categories may not exist):', error.message);
    }

    console.log('\n🎉 Master seeding completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Test the API endpoints:');
    console.log('   - GET /roles - List all roles');
    console.log('   - GET /permissions - List all permissions');
    console.log('   - GET /roles/statistics - Get role statistics');
    console.log('   - GET /api/bank-accounts - List bank accounts (requires auth)');
    console.log('   - GET /api/companies/me - Get user company (requires auth)');
    console.log('   - GET /api/companies/statistics - Get company statistics (admin only)');
    console.log('   - GET /api/categories - List categories (requires auth)');
    console.log('   - GET /api/products - List products (requires auth)');
    console.log('   - GET /api/products/stats - Get product statistics (requires auth)');

  } catch (error) {
    console.error('❌ Error running master seeder:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Run master seeder if called directly
if (require.main === module) {
  runMasterSeeder();
}

module.exports = { runMasterSeeder };