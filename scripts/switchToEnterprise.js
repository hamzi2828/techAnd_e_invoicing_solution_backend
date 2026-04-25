const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const PaymentPlan = require('../src/models/PaymentPlan');
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');

async function switchToEnterprise() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');
    console.log('✅ Connected to MongoDB');

    // Find the Enterprise plan
    const enterprisePlan = await PaymentPlan.findOne({ name: 'Enterprise' });

    if (!enterprisePlan) {
      console.error('❌ Enterprise plan not found! Run the payment plan seeder first.');
      console.log('Run: node seeders/paymentPlanSeeder.js');
      process.exit(1);
    }

    console.log('\n📦 Found Enterprise Plan:');
    console.log(`   ID: ${enterprisePlan._id}`);
    console.log(`   Name: ${enterprisePlan.name}`);
    console.log(`   Badge: ${enterprisePlan.metadata?.get?.('badge') || enterprisePlan.metadata?.badge || 'Enterprise Ready'}`);
    console.log(`   Monthly Price: SAR ${enterprisePlan.monthlyPrice}`);

    // Get email from command line argument
    const emailArg = process.argv[2];

    if (!emailArg || emailArg === '--help') {
      // Show all users
      const users = await User.find({}, 'email firstName lastName currentPlanId subscriptionStatus').populate('currentPlanId', 'name');

      console.log('\n📋 All Users:');
      console.log('=============');
      for (const u of users) {
        const subscription = await Subscription.findOne({ userId: u._id }).populate('paymentPlanId', 'name');
        const planName = subscription?.paymentPlanId?.name || u.currentPlanId?.name || 'None';
        console.log(`- ${u.email}`);
        console.log(`  Name: ${u.firstName} ${u.lastName}`);
        console.log(`  Plan (from Subscription): ${subscription?.paymentPlanId?.name || 'None'}`);
        console.log(`  Plan (from User): ${u.currentPlanId?.name || 'None'}`);
        console.log(`  Subscription Status: ${subscription?.status || 'none'}`);
        console.log('');
      }

      console.log('\n💡 Usage: node scripts/switchToEnterprise.js <email>');
      console.log('   Example: node scripts/switchToEnterprise.js hamzahashmi640@gmail.com');
      process.exit(0);
    }

    // Find the user
    const user = await User.findOne({ email: emailArg.toLowerCase() });
    if (!user) {
      console.error(`\n❌ User with email "${emailArg}" not found!`);
      process.exit(1);
    }

    console.log(`\n👤 Found user: ${user.email}`);

    // Find existing subscription
    const existingSubscription = await Subscription.findOne({ userId: user._id }).populate('paymentPlanId', 'name');

    if (existingSubscription) {
      console.log(`\n📋 Current Subscription:`);
      console.log(`   Plan: ${existingSubscription.paymentPlanId?.name || 'None'}`);
      console.log(`   Status: ${existingSubscription.status}`);
      console.log(`   Amount: SAR ${existingSubscription.unitAmount / 100}`);

      // Update the existing subscription
      const oldPlanId = existingSubscription.paymentPlanId?._id;

      existingSubscription.paymentPlanId = enterprisePlan._id;
      existingSubscription.status = 'active';
      existingSubscription.unitAmount = enterprisePlan.monthlyPrice * 100; // Convert to cents
      existingSubscription.currency = 'SAR';

      // Add to plan change history
      if (oldPlanId) {
        existingSubscription.planChangeHistory.push({
          fromPaymentPlanId: oldPlanId,
          toPaymentPlanId: enterprisePlan._id,
          changedAt: new Date(),
          reason: 'Manual upgrade via script'
        });
      }

      await existingSubscription.save();
      console.log('\n✅ Updated existing subscription to Enterprise');
    } else {
      // Create new subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const newSubscription = new Subscription({
        userId: user._id,
        subscriptionId: `sub_enterprise_${user._id}_${Date.now()}`,
        customerId: `cus_${user._id}`,
        paymentGateway: 'free', // Manual/admin upgrade
        paymentPlanId: enterprisePlan._id,
        status: 'active',
        currency: 'SAR',
        unitAmount: enterprisePlan.monthlyPrice * 100,
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: new Map([['upgradedBy', 'admin-script']])
      });

      await newSubscription.save();
      console.log('\n✅ Created new Enterprise subscription');
    }

    // Update user model as well
    user.currentPlanId = enterprisePlan._id;
    user.subscriptionStatus = 'active';
    await user.save();

    console.log('\n✅ Updated user record');

    // Verify the changes
    const updatedSubscription = await Subscription.findOne({ userId: user._id }).populate('paymentPlanId', 'name monthlyPrice');

    console.log('\n🎉 SUCCESS! New subscription details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Plan: ${updatedSubscription.paymentPlanId?.name}`);
    console.log(`   Status: ${updatedSubscription.status}`);
    console.log(`   Amount: SAR ${updatedSubscription.unitAmount / 100} / ${updatedSubscription.billingCycle}`);
    console.log(`   Period End: ${updatedSubscription.currentPeriodEnd.toLocaleDateString()}`);

    console.log('\n🔄 Refresh your browser at http://localhost:3000/dashboard/settings');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
switchToEnterprise();
