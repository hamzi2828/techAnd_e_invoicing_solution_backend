const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Subscription = require('../src/models/Subscription');
const PaymentPlan = require('../src/models/PaymentPlan');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');

  const sub = await Subscription.findById('6984e82b0ee6de4f07df32e9').populate('paymentPlanId', 'name monthlyPrice');

  console.log('=== Subscription 6984e82b0ee6de4f07df32e9 ===');
  console.log('Plan:', sub.paymentPlanId?.name);
  console.log('Plan ID:', sub.paymentPlanId?._id);
  console.log('Price:', sub.paymentPlanId?.monthlyPrice);
  console.log('Status:', sub.status);
  console.log('Unit Amount (cents):', sub.unitAmount);
  console.log('Billing Cycle:', sub.billingCycle);

  await mongoose.connection.close();
}
check();
