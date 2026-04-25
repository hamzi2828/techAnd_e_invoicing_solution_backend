const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../src/models/User');
const PaymentPlan = require('../src/models/PaymentPlan');
const Subscription = require('../src/models/Subscription');

async function upgradeUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find user
  const user = await User.findOne({ email: 'hamzahashmi640@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  console.log('Found user:', user.firstName, user.lastName, user._id);

  // Find Enterprise plan
  const enterprisePlan = await PaymentPlan.findOne({ name: 'Enterprise' });
  if (!enterprisePlan) {
    console.log('Enterprise plan not found');
    process.exit(1);
  }
  console.log('Found Enterprise plan:', enterprisePlan._id);

  // Check existing subscription
  const existingSub = await Subscription.findOne({ userId: user._id });
  console.log('Existing subscription:', existingSub ? existingSub.status : 'None');

  // Update user plan
  user.currentPlanId = enterprisePlan._id;
  user.subscriptionStatus = 'active';
  await user.save();
  console.log('Updated user currentPlanId to Enterprise');

  // Create/Update subscription
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  if (existingSub) {
    existingSub.paymentPlanId = enterprisePlan._id;
    existingSub.status = 'active';
    existingSub.currentPeriodEnd = oneYearLater;
    await existingSub.save();
    console.log('Updated existing subscription to Enterprise');
  } else {
    await Subscription.create({
      userId: user._id,
      subscriptionId: 'manual_enterprise_' + Date.now(),
      customerId: 'manual_' + user._id,
      paymentPlanId: enterprisePlan._id,
      paymentGateway: 'free',
      status: 'active',
      currency: 'SAR',
      unitAmount: 0,
      billingCycle: 'yearly',
      currentPeriodStart: now,
      currentPeriodEnd: oneYearLater
    });
    console.log('Created new Enterprise subscription');
  }

  console.log('\n✅ User upgraded to Enterprise plan successfully!');
  await mongoose.connection.close();
}

upgradeUser().catch(err => { console.error(err); process.exit(1); });
