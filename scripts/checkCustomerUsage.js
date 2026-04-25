/**
 * Script to check Customer count vs UsageTracker
 * Run with: node scripts/checkCustomerUsage.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const checkUsage = async () => {
  await connectDB();

  // Get current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  console.log('\n--- Customer Usage Check ---');
  console.log(`Current Period: Month ${currentMonth}, Year ${currentYear}`);
  console.log(`Date Range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

  // Load models
  const Customer = require('../src/models/Customer');
  const UsageTracker = require('../src/models/UsageTracker');
  const User = require('../src/models/User');

  // Get all users
  const users = await User.find({}).select('_id email name');
  console.log(`\nFound ${users.length} users\n`);

  for (const user of users) {
    // Customer limit is TOTAL (not monthly), so count all customers
    const totalCustomers = await Customer.countDocuments({
      userId: user._id,
      isDeleted: { $ne: true }
    });

    // Count customers created this month (for reference only)
    const thisMonthCount = await Customer.countDocuments({
      userId: user._id,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      isDeleted: { $ne: true }
    });

    // Get UsageTracker record
    const tracker = await UsageTracker.findOne({
      userId: user._id,
      'period.month': currentMonth,
      'period.year': currentYear
    });

    const trackedCount = tracker?.usage?.customersCreated ?? 0;
    const limit = tracker?.limits?.customers ?? 20;

    // Only show users with customers or tracker
    if (totalCustomers > 0 || trackedCount > 0) {
      console.log(`User: ${user.email}`);
      console.log(`  Total Customers: ${totalCustomers}`);
      console.log(`  Created This Month: ${thisMonthCount}`);
      console.log(`  Tracked in UsageTracker: ${trackedCount}`);
      console.log(`  Limit: ${limit}`);

      if (totalCustomers !== trackedCount) {
        console.log(`  MISMATCH! Should be: ${totalCustomers}, Tracked: ${trackedCount}`);
      } else {
        console.log(`  OK - Counts match`);
      }
      console.log('');
    }
  }

  console.log('--- Check Complete ---');
  process.exit(0);
};

checkUsage().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
