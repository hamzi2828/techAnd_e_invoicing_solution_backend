const moyasarService = require('../services/moyasarService');

class PaymentController {
  // ==================== PAYMENT ENDPOINTS ====================

  async createCheckoutSession(req, res) {
    try {
      const userId = req.user._id;
      const {
        paymentPlanId,
        amount,
        currency,
        successUrl,
        cancelUrl,
        metadata,
        billingCycle
      } = req.body;

      const result = await moyasarService.createCheckoutSession({
        userId,
        paymentPlanId,
        amount,
        currency,
        successUrl,
        cancelUrl,
        metadata,
        billingCycle
      });

      res.json(result);
    } catch (error) {
      console.error('Create checkout session error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create checkout session'
      });
    }
  }

  async createPayment(req, res) {
    try {
      const userId = req.user._id;
      const { amount, currency, description, callbackUrl, metadata, paymentPlanId } = req.body;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'Amount is required'
        });
      }

      const result = await moyasarService.createPayment({
        userId,
        amount,
        currency,
        description,
        callbackUrl,
        metadata,
        paymentPlanId
      });

      res.json(result);
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment'
      });
    }
  }

  async confirmPayment(req, res) {
    try {
      const { paymentId } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await moyasarService.confirmPayment(paymentId);
      res.json(result);
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to confirm payment'
      });
    }
  }

  async getPayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await moyasarService.getPayment(paymentId);
      res.json(result);
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment'
      });
    }
  }

  async getPaymentHistory(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const result = await moyasarService.getPaymentHistory(userId, parseInt(limit));
      res.json(result);
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment history'
      });
    }
  }

  async processRefund(req, res) {
    try {
      const { paymentId, amount } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await moyasarService.refundPayment(paymentId, amount);
      res.json(result);
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process refund'
      });
    }
  }

  async retryPayment(req, res) {
    try {
      const { paymentId } = req.body;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await moyasarService.retryPayment(paymentId);
      res.json(result);
    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retry payment'
      });
    }
  }

  // ==================== SUBSCRIPTION ENDPOINTS ====================

  async createSubscription(req, res) {
    try {
      const userId = req.user._id;
      const { paymentPlanId, billingCycle } = req.body;

      if (!paymentPlanId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Plan ID is required'
        });
      }

      const result = await moyasarService.createSubscription(userId, paymentPlanId, billingCycle);
      res.json(result);
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create subscription'
      });
    }
  }

  async activateFreePlan(req, res) {
    try {
      const userId = req.user._id;
      const { paymentPlanId, billingCycle = 'monthly' } = req.body;

      if (!paymentPlanId) {
        return res.status(400).json({
          success: false,
          message: 'Payment Plan ID is required'
        });
      }

      const result = await moyasarService.activateFreePlan(userId, paymentPlanId, billingCycle);
      res.json(result);
    } catch (error) {
      console.error('Activate free plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to activate free plan'
      });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID is required'
        });
      }

      const result = await moyasarService.cancelSubscription(subscriptionId);
      res.json(result);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel subscription'
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { subscriptionId, newPlanId } = req.body;

      if (!subscriptionId || !newPlanId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID and new plan ID are required'
        });
      }

      const result = await moyasarService.updateSubscription(subscriptionId, newPlanId);
      res.json(result);
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update subscription'
      });
    }
  }

  async getSubscription(req, res) {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID is required'
        });
      }

      const result = await moyasarService.getSubscription(subscriptionId);
      res.json(result);
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription'
      });
    }
  }

  async getCustomerSubscriptions(req, res) {
    try {
      const userId = req.user._id;
      const result = await moyasarService.getCustomerSubscriptions(userId);
      res.json(result);
    } catch (error) {
      console.error('Get customer subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscriptions'
      });
    }
  }

  // ==================== INVOICE ENDPOINTS ====================

  async getInvoices(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const result = await moyasarService.getInvoices(userId, parseInt(limit));
      res.json(result);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get invoices'
      });
    }
  }

  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID is required'
        });
      }

      const result = await moyasarService.getInvoice(invoiceId);
      res.json(result);
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get invoice'
      });
    }
  }

  async downloadInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID is required'
        });
      }

      const result = await moyasarService.downloadInvoice(invoiceId);
      res.json(result);
    } catch (error) {
      console.error('Download invoice error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download invoice'
      });
    }
  }

  // ==================== WEBHOOK & CONFIG ====================

  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-moyasar-signature'] || req.headers['moyasar-signature'];
      const payload = req.body;

      const result = await moyasarService.handleWebhook(payload, signature);
      res.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }

  async getConfig(req, res) {
    try {
      const publishableKey = moyasarService.getPublishableKey();

      res.json({
        success: true,
        publishableKey,
        currency: 'SAR',
        gateway: 'moyasar'
      });
    } catch (error) {
      console.error('Get config error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get config'
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  async getAllPayments(req, res) {
    try {
      const { page = 1, limit = 20, status, startDate, endDate } = req.query;
      const Payment = require('../models/Payment');

      const query = {};

      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const payments = await Payment.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('paymentPlanId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Payment.countDocuments(query);

      // Get payment stats
      const stats = await Payment.aggregate([
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] }
            },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            totalRefunded: { $sum: '$refundedAmount' }
          }
        }
      ]);

      res.json({
        success: true,
        payments: payments.map(p => ({
          id: p._id,
          moyasarId: p.moyasarPaymentId,
          customer: p.userId ? `${p.userId.firstName || ''} ${p.userId.lastName || ''}`.trim() || p.userId.email : 'Unknown',
          customerEmail: p.userId?.email,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          plan: p.paymentPlanId?.name || 'N/A',
          method: p.paymentMethod?.brand ? `${p.paymentMethod.brand} ****${p.paymentMethod.last4}` : p.paymentGateway,
          description: p.description,
          date: p.createdAt,
          paidAt: p.paidAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || {
          totalPayments: 0,
          totalAmount: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          totalRefunded: 0
        }
      });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payments'
      });
    }
  }

  async getPaymentStats(req, res) {
    try {
      const Payment = require('../models/Payment');
      const { startDate, endDate } = req.query;

      const matchCriteria = {};
      if (startDate || endDate) {
        matchCriteria.createdAt = {};
        if (startDate) matchCriteria.createdAt.$gte = new Date(startDate);
        if (endDate) matchCriteria.createdAt.$lte = new Date(endDate);
      }

      const stats = await Payment.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, '$amount', 0] } },
            successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
            pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            totalRefunded: { $sum: '$refundedAmount' }
          }
        }
      ]);

      res.json({
        success: true,
        stats: stats[0] || {
          totalPayments: 0,
          totalRevenue: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          totalRefunded: 0
        }
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment stats'
      });
    }
  }

  async adminAssignSubscription(req, res) {
    try {
      const { userId, planId, billingCycle = 'monthly' } = req.body;
      const adminId = req.user._id;

      // Validate inputs
      if (!userId || !planId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and Plan ID are required'
        });
      }

      const User = require('../models/User');
      const PaymentPlan = require('../models/PaymentPlan');
      const Subscription = require('../models/Subscription');

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify plan exists and is active
      const plan = await PaymentPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (!plan.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This plan is not active'
        });
      }

      // Calculate subscription period
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Cancel any existing active subscriptions
      await Subscription.updateMany(
        { userId: userId, status: 'active' },
        { status: 'canceled', canceledAt: now }
      );

      // Create new subscription
      const subscription = await Subscription.create({
        userId: userId,
        subscriptionId: `admin_assigned_${userId}_${Date.now()}`,
        customerId: `user_${userId}`,
        priceId: `plan_${planId}`,
        paymentGateway: 'admin_assigned',
        paymentPlanId: planId,
        status: 'active',
        currency: plan.currency || 'SAR',
        unitAmount: billingCycle === 'yearly' ? plan.yearlyPrice * 100 : plan.monthlyPrice * 100,
        billingCycle: billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: {
          assignedBy: adminId.toString(),
          assignedAt: now.toISOString(),
          assignmentType: 'admin_manual'
        }
      });

      // Update user's subscription status and plan
      user.subscriptionStatus = 'active';
      user.currentPlanId = planId;
      await user.save();

      // Update UsageTracker with new plan limits
      const UsageTracker = require('../models/UsageTracker');
      const usageTracker = await UsageTracker.getCurrentTracker(userId, user.assignedCompanyId);
      if (usageTracker) {
        await usageTracker.updateLimits(plan);
        console.log(`Updated UsageTracker limits for user ${userId} to ${plan.name} plan`);
      }

      console.log(`Admin ${adminId} assigned ${plan.name} plan to user ${userId}`);

      res.json({
        success: true,
        message: `Successfully assigned ${plan.name} plan to ${user.firstName} ${user.lastName}`,
        subscription: {
          id: subscription._id,
          status: subscription.status,
          plan: plan.name,
          billingCycle: subscription.billingCycle,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd
        }
      });
    } catch (error) {
      console.error('Admin assign subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign subscription'
      });
    }
  }
}

module.exports = new PaymentController();
