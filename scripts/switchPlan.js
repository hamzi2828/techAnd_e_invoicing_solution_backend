const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PaymentPlan = require('../src/models/PaymentPlan');
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');
const UsageTracker = require('../src/models/UsageTracker');

async function switchPlan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');
    console.log('Connected to MongoDB\n');

    const email = process.argv[2];
    const planName = process.argv[3];

    // Show usage if no arguments
    if (!email) {
      console.log('USAGE: node scripts/switchPlan.js <email> <plan-name>\n');
      console.log('PLANS: Free, Basic, Professional, Enterprise\n');
      console.log('EXAMPLE: node scripts/switchPlan.js user@example.com Enterprise\n');

      // List all users
      const users = await User.find({}, 'email firstName lastName');
      const plans = await PaymentPlan.find({ isActive: true }, 'name monthlyPrice');

      console.log('--- Available Plans ---');
      plans.forEach(p => console.log(`  ${p.name} (SAR ${p.monthlyPrice}/month)`));

      console.log('\n--- All Users ---');
      for (const u of users) {
        const sub = await Subscription.findOne({ userId: u._id, status: 'active' }).populate('paymentPlanId', 'name');
        console.log(`  ${u.email} -> ${sub?.paymentPlanId?.name || 'No active plan'}`);
      }
      process.exit(0);
    }

    if (!planName) {
      console.error('ERROR: Please specify plan name (Free, Basic, Professional, Enterprise)');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`ERROR: User "${email}" not found`);
      process.exit(1);
    }

    // Find plan
    const plan = await PaymentPlan.findOne({ name: new RegExp(`^${planName}$`, 'i') });
    if (!plan) {
      console.error(`ERROR: Plan "${planName}" not found`);
      const plans = await PaymentPlan.find({ isActive: true }, 'name');
      console.log('Available plans:', plans.map(p => p.name).join(', '));
      process.exit(1);
    }

    console.log(`User: ${user.email}`);
    console.log(`Target Plan: ${plan.name} (SAR ${plan.monthlyPrice}/month)\n`);

    // Get all subscriptions
    const subscriptions = await Subscription.find({ userId: user._id });
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

    // Sort by most recent
    activeSubscriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let mainSubscription = activeSubscriptions[0];

    // Cancel other subscriptions
    for (const sub of subscriptions) {
      if (mainSubscription && sub._id.toString() !== mainSubscription._id.toString() && sub.status !== 'canceled') {
        sub.status = 'canceled';
        sub.canceledAt = new Date();
        await sub.save();
        console.log(`Canceled duplicate subscription: ${sub._id}`);
      }
    }

    // Create or update subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (mainSubscription) {
      mainSubscription.paymentPlanId = plan._id;
      mainSubscription.status = 'active';
      mainSubscription.unitAmount = plan.monthlyPrice * 100;
      mainSubscription.currency = 'SAR';
      mainSubscription.billingCycle = 'monthly';
      mainSubscription.cancelAtPeriodEnd = false;
      mainSubscription.currentPeriodStart = now;
      mainSubscription.currentPeriodEnd = periodEnd;
      await mainSubscription.save();
      console.log('Updated existing subscription');
    } else {
      mainSubscription = await Subscription.create({
        userId: user._id,
        subscriptionId: `sub_${plan.name.toLowerCase()}_${user._id}_${Date.now()}`,
        customerId: `cus_${user._id}`,
        paymentGateway: 'free',
        paymentPlanId: plan._id,
        status: 'active',
        currency: 'SAR',
        unitAmount: plan.monthlyPrice * 100,
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      });
      console.log('Created new subscription');
    }

    // Update user
    user.currentPlanId = plan._id;
    user.subscriptionStatus = 'active';
    await user.save();

    // Update UsageTracker limits
    const trackers = await UsageTracker.find({ userId: user._id });
    for (const tracker of trackers) {
      tracker.limits = {
        invoicesPerMonth: plan.limits.invoicesPerMonth,
        customers: plan.limits.customers,
        products: plan.limits.products,
        users: plan.limits.users,
        storage: plan.limits.storage,
        companies: plan.limits.companies || 10
      };
      tracker.planId = plan._id;
      tracker.planName = plan.name;
      await tracker.save();
    }
    console.log(`Updated ${trackers.length} usage tracker(s)`);

    console.log('\n=== SUCCESS ===');
    console.log(`Email: ${user.email}`);
    console.log(`Plan: ${plan.name}`);
    console.log(`Price: SAR ${plan.monthlyPrice}/month`);
    console.log(`Status: active`);
    console.log(`Period: ${now.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);
    console.log('\nRefresh browser to see changes.');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

switchPlan();
