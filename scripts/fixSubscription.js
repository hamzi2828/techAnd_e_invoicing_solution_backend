const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PaymentPlan = require('../src/models/PaymentPlan');
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');

async function fixSubscription() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');
    console.log('✅ Connected to MongoDB');

    const email = 'hamzahashmi640@gmail.com';

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    console.log(`\n👤 User: ${user.email} (${user._id})`);

    // Find Enterprise plan
    const enterprisePlan = await PaymentPlan.findOne({ name: 'Enterprise' });
    console.log(`\n📦 Enterprise Plan ID: ${enterprisePlan._id}`);

    // Get all subscriptions for this user
    const subscriptions = await Subscription.find({ userId: user._id }).populate('paymentPlanId', 'name');

    console.log(`\n📋 Found ${subscriptions.length} subscriptions:`);
    subscriptions.forEach((sub, i) => {
      console.log(`\n${i + 1}. ID: ${sub._id}`);
      console.log(`   Plan: ${sub.paymentPlanId?.name || 'None'}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Amount: SAR ${sub.unitAmount / 100}`);
      console.log(`   Period: ${sub.currentPeriodStart?.toLocaleDateString()} - ${sub.currentPeriodEnd?.toLocaleDateString()}`);
    });

    // Strategy: Keep only ONE subscription and make it Enterprise
    // Cancel all except the most recent active one, then update that one to Enterprise

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    console.log(`\n🔄 Found ${activeSubscriptions.length} active subscriptions`);

    // Sort by creation date (most recent first)
    activeSubscriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // The most recent active subscription (the Free one showing in UI)
    const mainSubscription = activeSubscriptions[0];

    if (!mainSubscription) {
      console.error('❌ No active subscription found');
      process.exit(1);
    }

    console.log(`\n🎯 Main subscription to update: ${mainSubscription._id}`);
    console.log(`   Current Plan: ${mainSubscription.paymentPlanId?.name || 'None'}`);

    // Cancel all other subscriptions
    for (const sub of subscriptions) {
      if (sub._id.toString() !== mainSubscription._id.toString()) {
        sub.status = 'canceled';
        sub.canceledAt = new Date();
        sub.cancellationReason = 'Consolidated to single Enterprise subscription';
        await sub.save();
        console.log(`\n❌ Canceled subscription: ${sub._id}`);
      }
    }

    // Update the main subscription to Enterprise
    mainSubscription.paymentPlanId = enterprisePlan._id;
    mainSubscription.status = 'active';
    mainSubscription.unitAmount = enterprisePlan.monthlyPrice * 100;
    mainSubscription.currency = 'SAR';
    mainSubscription.billingCycle = 'monthly';
    mainSubscription.cancelAtPeriodEnd = false;

    // Reset period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    mainSubscription.currentPeriodStart = now;
    mainSubscription.currentPeriodEnd = periodEnd;

    await mainSubscription.save();
    console.log(`\n✅ Updated main subscription to Enterprise`);

    // Update user model
    user.currentPlanId = enterprisePlan._id;
    user.subscriptionStatus = 'active';
    await user.save();
    console.log('✅ Updated user record');

    // Verify
    const finalSub = await Subscription.findById(mainSubscription._id).populate('paymentPlanId', 'name monthlyPrice');
    console.log('\n🎉 FINAL RESULT:');
    console.log(`   Subscription ID: ${finalSub._id}`);
    console.log(`   Plan: ${finalSub.paymentPlanId?.name}`);
    console.log(`   Status: ${finalSub.status}`);
    console.log(`   Amount: SAR ${finalSub.unitAmount / 100} / ${finalSub.billingCycle}`);
    console.log(`   Period: ${finalSub.currentPeriodStart?.toLocaleDateString()} - ${finalSub.currentPeriodEnd?.toLocaleDateString()}`);

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

fixSubscription();
