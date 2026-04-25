const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PaymentPlan = require('../src/models/PaymentPlan');
const User = require('../src/models/User');
const UsageTracker = require('../src/models/UsageTracker');

async function updateUsageTracker() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');
    console.log('Connected to MongoDB\n');

    const email = process.argv[2] || 'hamzahashmi640@gmail.com';

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User "${email}" not found`);
      process.exit(1);
    }

    // Find Enterprise plan
    const enterprisePlan = await PaymentPlan.findOne({ name: 'Enterprise' });
    console.log('Enterprise Plan Limits:', enterprisePlan.limits);

    // Find all usage trackers for this user
    const trackers = await UsageTracker.find({ userId: user._id });
    console.log(`\nFound ${trackers.length} usage tracker(s) for ${email}`);

    for (const tracker of trackers) {
      console.log(`\n--- Tracker ${tracker._id} ---`);
      console.log('Before:', tracker.limits);
      console.log('Plan Name:', tracker.planName);

      // Update limits to Enterprise
      tracker.limits = {
        invoicesPerMonth: enterprisePlan.limits.invoicesPerMonth, // null = unlimited
        customers: enterprisePlan.limits.customers,
        products: enterprisePlan.limits.products,
        users: enterprisePlan.limits.users,
        storage: enterprisePlan.limits.storage,
        companies: enterprisePlan.limits.companies || 10
      };
      tracker.planId = enterprisePlan._id;
      tracker.planName = 'Enterprise';

      await tracker.save();
      console.log('After:', tracker.limits);
      console.log('Plan Name:', tracker.planName);
    }

    // If no tracker exists, create one
    if (trackers.length === 0) {
      const now = new Date();
      const newTracker = await UsageTracker.create({
        userId: user._id,
        period: {
          month: now.getMonth() + 1,
          year: now.getFullYear()
        },
        usage: {
          invoicesCreated: 0,
          customersCreated: 0,
          productsCreated: 0,
          usersCreated: 0,
          storageUsedMB: 0,
          companiesCreated: 0
        },
        limits: {
          invoicesPerMonth: enterprisePlan.limits.invoicesPerMonth,
          customers: enterprisePlan.limits.customers,
          products: enterprisePlan.limits.products,
          users: enterprisePlan.limits.users,
          storage: enterprisePlan.limits.storage,
          companies: enterprisePlan.limits.companies || 10
        },
        planId: enterprisePlan._id,
        planName: 'Enterprise'
      });
      console.log('\nCreated new usage tracker:', newTracker._id);
    }

    console.log('\n=== SUCCESS ===');
    console.log('Usage limits updated to Enterprise plan');
    console.log('Refresh your dashboard to see the changes');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

updateUsageTracker();
