const moyasarService = require('../services/moyasarService');

class MoyasarController {
  /**
   * Create a new payment
   */
  async createPayment(req, res) {
    try {
      const userId = req.user._id;
      const {
        amount,
        currency,
        description,
        callbackUrl,
        metadata,
        paymentPlanId
      } = req.body;

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
      console.error('Create Moyasar payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment'
      });
    }
  }

  /**
   * Get payment form data for frontend
   */
  async getPaymentFormData(req, res) {
    try {
      const userId = req.user._id;
      const {
        amount,
        currency,
        description,
        callbackUrl,
        metadata,
        paymentPlanId
      } = req.body;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'Amount is required'
        });
      }

      const result = await moyasarService.createPaymentForm({
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
      console.error('Get payment form data error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment form data'
      });
    }
  }

  /**
   * Get publishable key
   */
  async getPublishableKey(req, res) {
    try {
      const publishableKey = moyasarService.getPublishableKey();
      res.json({
        success: true,
        publishableKey
      });
    } catch (error) {
      console.error('Get publishable key error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get publishable key'
      });
    }
  }

  /**
   * Get payment details
   */
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
      console.error('Get Moyasar payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment'
      });
    }
  }

  /**
   * Process refund
   */
  async refundPayment(req, res) {
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
      console.error('Refund Moyasar payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process refund'
      });
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const history = await moyasarService.getPaymentHistory(userId, parseInt(limit));
      res.json({
        success: true,
        payments: history
      });
    } catch (error) {
      console.error('Get Moyasar payment history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment history'
      });
    }
  }

  /**
   * Handle payment callback (redirect from Moyasar)
   */
  async handleCallback(req, res) {
    try {
      const { id, status, message } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      // Fetch the latest payment status from Moyasar
      const paymentDetails = await moyasarService.getPayment(id);

      res.json({
        success: paymentDetails.payment.status === 'paid',
        payment: paymentDetails.payment,
        message: message || (paymentDetails.payment.status === 'paid' ? 'Payment successful' : 'Payment not completed')
      });
    } catch (error) {
      console.error('Handle Moyasar callback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify payment'
      });
    }
  }

  /**
   * Handle webhook from Moyasar
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-moyasar-signature'];
      const payload = req.body;

      if (!payload || !payload.type) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook payload'
        });
      }

      const result = await moyasarService.handleWebhook(payload, signature);
      res.json(result);
    } catch (error) {
      console.error('Moyasar webhook error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(req, res) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment ID is required'
        });
      }

      const result = await moyasarService.getPayment(paymentId);

      // If payment is successful, trigger subscription creation if not already done
      if (result.payment.status === 'paid') {
        const metadata = result.payment.metadata || {};
        if (metadata.userId && metadata.paymentPlanId) {
          await moyasarService.createOrUpdateSubscription(
            metadata.userId,
            metadata.paymentPlanId,
            { id: paymentId, ...result.payment, amount: result.payment.amount * 100 }
          );
        }
      }

      res.json({
        success: result.payment.status === 'paid',
        verified: true,
        payment: result.payment
      });
    } catch (error) {
      console.error('Verify Moyasar payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify payment'
      });
    }
  }
}

module.exports = new MoyasarController();
