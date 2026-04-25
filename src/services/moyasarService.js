const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const PaymentPlan = require('../models/PaymentPlan');

const MOYASAR_API_URL = 'https://api.moyasar.com/v1';

class MoyasarService {
  constructor() {
    this.apiInstance = null;
  }

  // Get API instance with fresh credentials
  get api() {
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      throw new Error('MOYASAR_SECRET_KEY environment variable is not set');
    }

    if (!this.apiInstance) {
      this.apiInstance = axios.create({
        baseURL: MOYASAR_API_URL,
        auth: {
          username: secretKey,
          password: ''
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return this.apiInstance;
  }

  getPublishableKey() {
    return process.env.MOYASAR_PUBLISHABLE_KEY;
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Create a payment using Moyasar
   */
  async createPayment({
    userId,
    amount,
    currency = 'SAR',
    description,
    callbackUrl,
    metadata = {},
    source = null,
    paymentPlanId = null
  }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const amountInHalalas = Math.round(amount * 100);

      const paymentData = {
        amount: amountInHalalas,
        currency: currency.toUpperCase(),
        description: description || 'Payment',
        callback_url: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          userId: userId.toString(),
          paymentPlanId: paymentPlanId || '',
          userEmail: user.email,
          ...metadata
        }
      };

      if (source) {
        paymentData.source = source;
      }

      const response = await this.api.post('/payments', paymentData);

      const paymentRecord = await Payment.create({
        userId: userId,
        moyasarPaymentId: response.data.id,
        paymentPlanId: paymentPlanId || null,
        amount: amountInHalalas,
        currency: currency.toUpperCase(),
        status: this.mapMoyasarStatus(response.data.status),
        description: description,
        metadata: metadata,
        paymentGateway: 'moyasar'
      });

      return {
        success: true,
        paymentId: response.data.id,
        paymentUrl: response.data.source?.transaction_url || null,
        status: response.data.status,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        dbPaymentId: paymentRecord._id
      };
    } catch (error) {
      console.error('Error creating Moyasar payment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create payment');
    }
  }

  /**
   * Create checkout session - returns data for frontend payment form
   */
  async createCheckoutSession({
    userId,
    paymentPlanId,
    amount,
    currency = 'SAR',
    successUrl,
    cancelUrl,
    metadata = {},
    billingCycle = 'monthly'
  }) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let finalAmount = amount;
      let description = 'Payment';

      if (paymentPlanId) {
        const plan = await PaymentPlan.findById(paymentPlanId);
        if (plan) {
          if (!finalAmount) {
            finalAmount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
          }
          description = `Subscription to ${plan.name} plan (${billingCycle})`;
        }
      }

      // Check if amount is undefined/null (0 is valid for free plans)
      if (finalAmount === undefined || finalAmount === null) {
        throw new Error('Amount is required');
      }

      // For free plans (amount = 0), return special response
      if (finalAmount === 0) {
        return {
          success: true,
          isFree: true,
          amount: 0,
          currency: currency.toUpperCase(),
          description,
          paymentPlanId: paymentPlanId,
          billingCycle,
          metadata: {
            userId: userId.toString(),
            paymentPlanId: paymentPlanId || '',
            billingCycle,
            userEmail: user.email,
            ...metadata
          }
        };
      }

      const amountInHalalas = Math.round(finalAmount * 100);

      return {
        success: true,
        publishableKey: this.getPublishableKey(),
        amount: amountInHalalas,
        currency: currency.toUpperCase(),
        description,
        callbackUrl: successUrl || `${process.env.FRONTEND_URL}/payment/callback`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: userId.toString(),
          paymentPlanId: paymentPlanId || '',
          billingCycle,
          userEmail: user.email,
          ...metadata
        }
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get payment details from Moyasar
   */
  async getPayment(paymentId) {
    try {
      const response = await this.api.get(`/payments/${paymentId}`);
      return {
        success: true,
        payment: {
          id: response.data.id,
          status: response.data.status,
          amount: response.data.amount / 100,
          currency: response.data.currency,
          description: response.data.description,
          fee: response.data.fee / 100,
          refunded: response.data.refunded / 100,
          captured: response.data.captured / 100,
          source: response.data.source,
          metadata: response.data.metadata,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at
        }
      };
    } catch (error) {
      console.error('Error fetching Moyasar payment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch payment');
    }
  }

  /**
   * Confirm/verify a payment status
   * Also creates Payment record if not found locally (handles webhook failures)
   */
  async confirmPayment(paymentId) {
    try {
      // Check local DB first by Moyasar payment ID
      let payment = await Payment.findOne({ moyasarPaymentId: paymentId });

      // Only try findById if paymentId looks like a MongoDB ObjectId (24 hex chars)
      if (!payment && /^[0-9a-fA-F]{24}$/.test(paymentId)) {
        payment = await Payment.findById(paymentId);
      }

      if (payment?.moyasarPaymentId) {
        const result = await this.getPayment(payment.moyasarPaymentId);

        // Update payment status if it changed
        if (result.payment.status === 'paid' && payment.status !== 'succeeded') {
          payment.status = 'succeeded';
          payment.paidAt = new Date();
          payment.processedAt = new Date();
          if (result.payment.source) {
            payment.paymentMethod = {
              type: this.mapPaymentMethodType(result.payment.source.type),
              brand: result.payment.source.company || result.payment.source.type,
              last4: result.payment.source.number ? result.payment.source.number.slice(-4) : null
            };
          }
          await payment.save();

          // Create/update subscription if metadata exists
          const metadata = result.payment.metadata || {};
          if (metadata.userId && metadata.paymentPlanId) {
            await this.createOrUpdateSubscription(
              metadata.userId,
              metadata.paymentPlanId,
              { id: paymentId, ...result.payment, amount: result.payment.amount * 100 }
            );
          }
        }

        return {
          success: result.payment.status === 'paid',
          payment: result.payment
        };
      }

      // Fetch directly from Moyasar API using the payment ID
      const result = await this.getPayment(paymentId);

      // If payment was successful but not in DB, create a record
      // This handles cases where webhook failed (e.g., localhost development)
      if (result.payment.status === 'paid') {
        const metadata = result.payment.metadata || {};

        // Create Payment record
        const newPayment = await Payment.create({
          userId: metadata.userId || null,
          moyasarPaymentId: paymentId,
          paymentPlanId: metadata.paymentPlanId || null,
          amount: Math.round(result.payment.amount * 100), // Convert to halalas
          currency: result.payment.currency,
          status: 'succeeded',
          description: result.payment.description,
          metadata: metadata,
          paymentGateway: 'moyasar',
          paidAt: new Date(),
          processedAt: new Date(),
          paymentMethod: result.payment.source ? {
            type: this.mapPaymentMethodType(result.payment.source.type),
            brand: result.payment.source.company || result.payment.source.type,
            last4: result.payment.source.number ? result.payment.source.number.slice(-4) : null
          } : undefined
        });

        console.log(`Payment record created for Moyasar payment ${paymentId} (webhook fallback)`);

        // Create/update subscription
        if (metadata.userId && metadata.paymentPlanId) {
          await this.createOrUpdateSubscription(
            metadata.userId,
            metadata.paymentPlanId,
            { id: paymentId, ...result.payment, amount: result.payment.amount * 100 }
          );
        }
      }

      return {
        success: result.payment.status === 'paid',
        payment: result.payment
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async refundPayment(paymentId, amount = null) {
    try {
      // Find the Moyasar payment ID
      let moyasarPaymentId = paymentId;
      const payment = await Payment.findById(paymentId);
      if (payment?.moyasarPaymentId) {
        moyasarPaymentId = payment.moyasarPaymentId;
      }

      const refundData = {};
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const response = await this.api.post(`/payments/${moyasarPaymentId}/refund`, refundData);

      // Update payment record
      const paymentRecord = await Payment.findOne({ moyasarPaymentId: moyasarPaymentId });
      if (paymentRecord) {
        paymentRecord.status = amount ? 'partially_refunded' : 'refunded';
        paymentRecord.refundedAmount = (paymentRecord.refundedAmount || 0) + (amount ? Math.round(amount * 100) : paymentRecord.amount);
        paymentRecord.refundedAt = new Date();
        await paymentRecord.save();
      }

      return {
        success: true,
        refund: {
          id: response.data.id,
          status: response.data.status,
          amount: response.data.amount / 100,
          refunded: response.data.refunded / 100
        }
      };
    } catch (error) {
      console.error('Error processing refund:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to process refund');
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId, limit = 10) {
    try {
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('paymentPlanId', 'name');

      return {
        success: true,
        payments: payments.map(payment => ({
          id: payment._id,
          moyasarId: payment.moyasarPaymentId,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          description: payment.description,
          planName: payment.paymentPlanId?.name,
          paymentMethod: payment.paymentMethod,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt
        }))
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('paymentPlanId', 'name monthlyPrice yearlyPrice')
        .populate('userId');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return await this.createCheckoutSession({
        userId: payment.userId._id,
        paymentPlanId: payment.paymentPlanId?._id?.toString(),
        amount: payment.amount / 100,
        currency: payment.currency,
        metadata: {
          originalPaymentId: payment._id.toString(),
          retryAttempt: 'true'
        }
      });
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }

  // ==================== SUBSCRIPTION METHODS ====================

  /**
   * Create subscription (initiates payment for subscription)
   */
  async createSubscription(userId, paymentPlanId, billingCycle = 'monthly') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = await PaymentPlan.findById(paymentPlanId);
      if (!plan) {
        throw new Error('Payment plan not found');
      }

      const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

      return await this.createCheckoutSession({
        userId,
        paymentPlanId: plan._id.toString(),
        amount,
        currency: plan.currency || 'SAR',
        billingCycle,
        metadata: {
          planName: plan.name,
          subscriptionType: billingCycle
        }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      subscription.cancelAtPeriodEnd = true;
      await subscription.save();

      // Update user status
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionStatus = 'canceled';
        await user.save();
      }

      return {
        success: true,
        subscription: {
          id: subscription._id,
          status: subscription.status,
          canceledAt: subscription.canceledAt,
          currentPeriodEnd: subscription.currentPeriodEnd
        }
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription (change plan)
   */
  async updateSubscription(subscriptionId, newPlanId) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newPlan = await PaymentPlan.findById(newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      const oldPlanId = subscription.paymentPlanId;

      subscription.paymentPlanId = newPlan._id;
      subscription.unitAmount = Math.round(newPlan.monthlyPrice * 100);
      subscription.planChangeHistory.push({
        fromPaymentPlanId: oldPlanId,
        toPaymentPlanId: newPlan._id,
        changedAt: new Date(),
        reason: 'User requested plan change'
      });

      await subscription.save();

      // Update user's current plan
      const user = await User.findById(subscription.userId);
      if (user) {
        user.currentPlanId = newPlan._id;
        await user.save();
      }

      return {
        success: true,
        subscription: {
          id: subscription._id,
          planId: subscription.paymentPlanId,
          status: subscription.status
        }
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId)
        .populate('paymentPlanId', 'name monthlyPrice yearlyPrice currency features')
        .populate('userId', 'firstName lastName email');

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return {
        success: true,
        subscription: {
          id: subscription._id,
          status: subscription.status,
          plan: subscription.paymentPlanId,
          user: subscription.userId,
          billingCycle: subscription.billingCycle,
          unitAmount: subscription.unitAmount / 100,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
          daysRemaining: subscription.daysRemaining
        }
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getCustomerSubscriptions(userId) {
    try {
      const subscriptions = await Subscription.find({ userId })
        .populate('paymentPlanId', 'name monthlyPrice yearlyPrice currency')
        .sort({ createdAt: -1 });

      return {
        success: true,
        subscriptions: subscriptions.map(sub => ({
          id: sub._id,
          status: sub.status,
          plan: sub.paymentPlanId,
          billingCycle: sub.billingCycle,
          unitAmount: sub.unitAmount / 100,
          currency: sub.currency,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          daysRemaining: sub.daysRemaining,
          isActive: sub.isActive
        }))
      };
    } catch (error) {
      console.error('Error getting customer subscriptions:', error);
      throw error;
    }
  }

  // ==================== INVOICE METHODS ====================

  /**
   * Get invoices for a user
   */
  async getInvoices(userId, limit = 10) {
    try {
      const payments = await Payment.find({
        userId,
        status: 'succeeded'
      })
        .populate('paymentPlanId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit);

      return {
        success: true,
        invoices: payments.map(payment => ({
          id: payment._id,
          number: `INV-${payment._id.toString().slice(-8).toUpperCase()}`,
          amountPaid: payment.amount / 100,
          currency: payment.currency,
          status: 'paid',
          paidAt: payment.paidAt,
          planName: payment.paymentPlanId?.name,
          description: payment.description
        }))
      };
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  /**
   * Get single invoice
   */
  async getInvoice(invoiceId) {
    try {
      const payment = await Payment.findById(invoiceId)
        .populate('paymentPlanId', 'name')
        .populate('userId', 'firstName lastName email');

      if (!payment) {
        throw new Error('Invoice not found');
      }

      return {
        success: true,
        invoice: {
          id: payment._id,
          number: `INV-${payment._id.toString().slice(-8).toUpperCase()}`,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status === 'succeeded' ? 'paid' : payment.status,
          paidAt: payment.paidAt,
          planName: payment.paymentPlanId?.name,
          description: payment.description,
          user: payment.userId,
          paymentMethod: payment.paymentMethod,
          createdAt: payment.createdAt
        }
      };
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }

  /**
   * Download invoice data
   */
  async downloadInvoice(invoiceId) {
    try {
      const result = await this.getInvoice(invoiceId);
      return {
        success: true,
        invoice: result.invoice
      };
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  // ==================== WEBHOOK HANDLING ====================

  /**
   * Handle webhook from Moyasar
   */
  async handleWebhook(payload, signature = null) {
    try {
      if (process.env.MOYASAR_WEBHOOK_SECRET && signature) {
        const isValid = this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      const { type, data } = payload;

      switch (type) {
        case 'payment_paid':
          await this.handlePaymentPaid(data);
          break;
        case 'payment_failed':
          await this.handlePaymentFailed(data);
          break;
        case 'payment_authorized':
          await this.handlePaymentAuthorized(data);
          break;
        case 'payment_captured':
          await this.handlePaymentCaptured(data);
          break;
        case 'payment_refunded':
          await this.handlePaymentRefunded(data);
          break;
        case 'payment_voided':
          await this.handlePaymentVoided(data);
          break;
        default:
          console.log(`Unhandled Moyasar webhook type: ${type}`);
      }

      return { received: true, type };
    } catch (error) {
      console.error('Moyasar webhook error:', error);
      throw error;
    }
  }

  async handlePaymentPaid(data) {
    try {
      let payment = await Payment.findOne({ moyasarPaymentId: data.id });

      if (payment) {
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.processedAt = new Date();

        if (data.source) {
          payment.paymentMethod = {
            type: this.mapPaymentMethodType(data.source.type),
            brand: data.source.company || data.source.type,
            last4: data.source.number ? data.source.number.slice(-4) : null
          };
        }

        await payment.save();
      } else {
        const userId = data.metadata?.userId;
        const paymentPlanId = data.metadata?.paymentPlanId;

        payment = await Payment.create({
          userId: userId,
          moyasarPaymentId: data.id,
          paymentPlanId: paymentPlanId || null,
          amount: data.amount,
          currency: data.currency,
          status: 'succeeded',
          description: data.description,
          metadata: data.metadata,
          paymentGateway: 'moyasar',
          paidAt: new Date(),
          processedAt: new Date(),
          paymentMethod: data.source ? {
            type: this.mapPaymentMethodType(data.source.type),
            brand: data.source.company || data.source.type,
            last4: data.source.number ? data.source.number.slice(-4) : null
          } : undefined
        });
      }

      // Create/update subscription
      const userId = data.metadata?.userId;
      const paymentPlanId = data.metadata?.paymentPlanId;

      if (userId && paymentPlanId) {
        await this.createOrUpdateSubscription(userId, paymentPlanId, data);
      }

      console.log(`Moyasar payment ${data.id} marked as paid`);
    } catch (error) {
      console.error('Error handling payment paid:', error);
      throw error;
    }
  }

  async handlePaymentFailed(data) {
    try {
      const payment = await Payment.findOne({ moyasarPaymentId: data.id });
      if (payment) {
        payment.status = 'failed';
        payment.failedAt = new Date();
        await payment.save();
      }
      console.log(`Moyasar payment ${data.id} marked as failed`);
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  async handlePaymentAuthorized(data) {
    try {
      const payment = await Payment.findOne({ moyasarPaymentId: data.id });
      if (payment) {
        payment.status = 'pending';
        await payment.save();
      }
      console.log(`Moyasar payment ${data.id} authorized`);
    } catch (error) {
      console.error('Error handling payment authorized:', error);
    }
  }

  async handlePaymentCaptured(data) {
    try {
      const payment = await Payment.findOne({ moyasarPaymentId: data.id });
      if (payment) {
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.processedAt = new Date();
        await payment.save();
      }
      console.log(`Moyasar payment ${data.id} captured`);
    } catch (error) {
      console.error('Error handling payment captured:', error);
    }
  }

  async handlePaymentRefunded(data) {
    try {
      const payment = await Payment.findOne({ moyasarPaymentId: data.id });
      if (payment) {
        const refundedAmount = data.refunded || 0;
        payment.status = refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
        payment.refundedAmount = refundedAmount;
        payment.refundedAt = new Date();
        await payment.save();
      }
      console.log(`Moyasar payment ${data.id} refunded`);
    } catch (error) {
      console.error('Error handling payment refunded:', error);
    }
  }

  async handlePaymentVoided(data) {
    try {
      const payment = await Payment.findOne({ moyasarPaymentId: data.id });
      if (payment) {
        payment.status = 'canceled';
        await payment.save();
      }
      console.log(`Moyasar payment ${data.id} voided`);
    } catch (error) {
      console.error('Error handling payment voided:', error);
    }
  }

  /**
   * Create or update subscription after successful payment
   */
  async createOrUpdateSubscription(userId, paymentPlanId, paymentData) {
    try {
      const plan = await PaymentPlan.findById(paymentPlanId);
      if (!plan) {
        console.log('Payment plan not found for subscription creation');
        return;
      }

      const amount = paymentData.amount / 100;
      const isYearly = amount >= plan.yearlyPrice * 0.9;
      const billingCycle = paymentData.metadata?.billingCycle || (isYearly ? 'yearly' : 'monthly');

      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      let subscription = await Subscription.findOne({
        userId: userId,
        paymentPlanId: paymentPlanId,
        status: { $in: ['active', 'trialing'] }
      });

      if (subscription) {
        subscription.currentPeriodEnd = periodEnd;
        subscription.status = 'active';
        subscription.latestPaymentId = paymentData.id;
        await subscription.save();
      } else {
        await Subscription.create({
          userId: userId,
          subscriptionId: `moyasar_sub_${paymentData.id}`,
          customerId: `moyasar_user_${userId}`,
          priceId: `moyasar_price_${paymentPlanId}`,
          paymentGateway: 'moyasar',
          paymentPlanId: paymentPlanId,
          status: 'active',
          currency: paymentData.currency || 'SAR',
          unitAmount: paymentData.amount,
          billingCycle: billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          metadata: {
            moyasarPaymentId: paymentData.id
          }
        });
      }

      const user = await User.findById(userId);
      if (user) {
        user.subscriptionStatus = 'active';
        user.currentPlanId = paymentPlanId;
        await user.save();
      }

      console.log(`Subscription created/updated for user ${userId}`);
    } catch (error) {
      console.error('Error creating/updating subscription:', error);
    }
  }

  // ==================== FREE PLAN ACTIVATION ====================

  /**
   * Activate a free plan (no payment required)
   */
  async activateFreePlan(userId, paymentPlanId, billingCycle = 'monthly') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = await PaymentPlan.findById(paymentPlanId);
      if (!plan) {
        throw new Error('Payment plan not found');
      }

      // Verify it's actually a free plan
      const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      if (price > 0) {
        throw new Error('This is not a free plan. Payment is required.');
      }

      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Cancel any existing active subscriptions first
      await Subscription.updateMany(
        { userId: userId, status: 'active' },
        { status: 'canceled', canceledAt: new Date() }
      );

      // Create new subscription for free plan
      const subscription = await Subscription.create({
        userId: userId,
        subscriptionId: `free_plan_${userId}_${Date.now()}`,
        customerId: `user_${userId}`,
        priceId: `free_price_${paymentPlanId}`,
        paymentGateway: 'free',
        paymentPlanId: paymentPlanId,
        status: 'active',
        currency: plan.currency || 'SAR',
        unitAmount: 0,
        billingCycle: billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: {
          activationType: 'free_plan',
          activatedAt: now.toISOString()
        }
      });

      // Update user's plan
      user.subscriptionStatus = 'active';
      user.currentPlanId = paymentPlanId;
      await user.save();

      console.log(`Free plan activated for user ${userId}`);

      return {
        success: true,
        subscription: {
          id: subscription._id,
          status: subscription.status,
          plan: {
            id: plan._id,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            currency: plan.currency || 'SAR'
          },
          billingCycle: subscription.billingCycle,
          unitAmount: 0,
          currency: subscription.currency,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysRemaining: Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
        }
      };
    } catch (error) {
      console.error('Error activating free plan:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  verifyWebhookSignature(payload, signature) {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('MOYASAR_WEBHOOK_SECRET not configured');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }

  mapMoyasarStatus(moyasarStatus) {
    const statusMap = {
      'initiated': 'pending',
      'paid': 'succeeded',
      'failed': 'failed',
      'authorized': 'pending',
      'captured': 'succeeded',
      'refunded': 'refunded',
      'voided': 'canceled'
    };
    return statusMap[moyasarStatus] || 'pending';
  }

  /**
   * Map Moyasar payment method type to valid Payment model enum
   * Moyasar types: creditcard, stcpay, applepay, etc.
   * Model enum: card, bank_account, wallet
   */
  mapPaymentMethodType(moyasarType) {
    const typeMap = {
      'creditcard': 'card',
      'credit_card': 'card',
      'debitcard': 'card',
      'debit_card': 'card',
      'mada': 'card',
      'visa': 'card',
      'mastercard': 'card',
      'stcpay': 'wallet',
      'applepay': 'wallet',
      'apple_pay': 'wallet',
      'googlepay': 'wallet',
      'google_pay': 'wallet',
      'sadad': 'bank_account',
      'bank_transfer': 'bank_account'
    };
    return typeMap[moyasarType?.toLowerCase()] || 'card';
  }
}

module.exports = new MoyasarService();
