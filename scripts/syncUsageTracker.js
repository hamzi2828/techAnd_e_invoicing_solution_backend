/**
 * Script to sync UsageTracker with actual resource counts
 * Run with: node scripts/syncUsageTracker.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const syncUsage = async () => {
  await connectDB();

  // Get current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  console.log('\n📅 Syncing for Period:');
  console.log(`   Month: ${currentMonth}, Year: ${currentYear}`);

  // Load models
  const Invoice = require('../src/models/Invoice');
  const Customer = require('../src/models/Customer');
  const Product = require('../src/models/Product');
  const Company = require('../src/models/Company');
  const UsageTracker = require('../src/models/UsageTracker');
  const User = require('../src/models/User');
  const PaymentPlan = require('../src/models/PaymentPlan');

  // Get all users
  const users = await User.find({}).select('_id email name currentPlanId');
  console.log(`\n👥 Processing ${users.length} users...\n`);

  let fixedCount = 0;

  for (const user of users) {
    // Count actual resources for this month
    const invoiceCount = await Invoice.countDocuments({
      userId: user._id,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      isDeleted: { $ne: true }
    });

    // Customers are not period-based, count total (limit is total customers allowed)
    const customerCount = await Customer.countDocuments({
      userId: user._id,
      isDeleted: { $ne: true }
    });

    // Products are not period-based, count total (limit is total products allowed)
    const productCount = await Product.countDocuments({
      userId: user._id,
      isDeleted: { $ne: true }
    });

    // Companies are not period-based, count total
    const companyCount = await Company.countDocuments({
      userId: user._id,
      isDeleted: { $ne: true }
    });

    // Skip users with no activity
    if (invoiceCount === 0 && customerCount === 0 && productCount === 0 && companyCount === 0) {
      continue;
    }

    console.log(`📧 ${user.email}`);
    console.log(`   Invoices: ${invoiceCount}, Customers: ${customerCount}, Products: ${productCount}, Companies: ${companyCount}`);

    // Find or create UsageTracker
    let tracker = await UsageTracker.findOne({
      userId: user._id,
      'period.month': currentMonth,
      'period.year': currentYear
    });

    // Get user's plan for limits
    let plan = null;
    if (user.currentPlanId) {
      plan = await PaymentPlan.findById(user.currentPlanId);
    }
    if (!plan) {
      plan = await PaymentPlan.findOne({ name: 'Free' });
    }

    const limits = plan ? {
      invoicesPerMonth: plan.limits?.invoicesPerMonth ?? 50,
      customers: plan.limits?.customers ?? 20,
      products: plan.limits?.products ?? 50,
      users: plan.limits?.users ?? 1,
      storage: plan.limits?.storage ?? 100,
      companies: plan.limits?.companies ?? 1
    } : {
      invoicesPerMonth: 50,
      customers: 20,
      products: 50,
      users: 1,
      storage: 100,
      companies: 1
    };

    if (!tracker) {
      // Create new tracker with actual counts
      tracker = new UsageTracker({
        userId: user._id,
        period: { month: currentMonth, year: currentYear },
        usage: {
          invoicesCreated: invoiceCount,
          customersCreated: customerCount,
          productsCreated: productCount,
          usersCreated: 0,
          storageUsedMB: 0,
          companiesCreated: companyCount,
          zatcaSubmissions: 0,
          bulkImports: 0,
          reportsGenerated: 0,
          scheduledReports: 0,
          apiCalls: 0,
          emailsSent: 0
        },
        limits: limits,
        planId: plan?._id,
        planName: plan?.name || 'Free'
      });

      await tracker.save();
      console.log(`   ✅ Created new UsageTracker with synced counts`);
      fixedCount++;
    } else {
      // Update existing tracker
      const needsUpdate =
        tracker.usage.invoicesCreated !== invoiceCount ||
        tracker.usage.customersCreated !== customerCount ||
        tracker.usage.productsCreated !== productCount ||
        tracker.usage.companiesCreated !== companyCount;

      if (needsUpdate) {
        tracker.usage.invoicesCreated = invoiceCount;
        tracker.usage.customersCreated = customerCount;
        tracker.usage.productsCreated = productCount;
        tracker.usage.companiesCreated = companyCount;
        await tracker.save();
        console.log(`   ✅ Updated UsageTracker to match actual counts`);
        fixedCount++;
      } else {
        console.log(`   ✓ Already in sync`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Sync complete! Fixed ${fixedCount} user(s).`);
  process.exit(0);
};

syncUsage().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
