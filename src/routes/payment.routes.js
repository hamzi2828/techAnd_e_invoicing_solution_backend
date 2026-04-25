const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../../middleware/auth');

// ==================== PUBLIC ROUTES ====================

// Webhook endpoint (no auth required)
router.post('/webhook', paymentController.handleWebhook);

// Get Moyasar config/publishable key
router.get('/config', paymentController.getConfig);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// Payment operations
router.post('/checkout', paymentController.createCheckoutSession);
router.post('/create', paymentController.createPayment);
router.post('/confirm', paymentController.confirmPayment); 
router.get('/payment/:paymentId', paymentController.getPayment);
router.get('/history', paymentController.getPaymentHistory);
router.post('/refund', paymentController.processRefund);
router.post('/retry', paymentController.retryPayment);

// Subscription operations
router.post('/subscribe', paymentController.createSubscription);
router.post('/subscribe/free', paymentController.activateFreePlan);
router.post('/subscription/cancel', paymentController.cancelSubscription);
router.put('/subscription/update', paymentController.updateSubscription);
router.get('/subscription/:subscriptionId', paymentController.getSubscription);
router.get('/subscriptions', paymentController.getCustomerSubscriptions);

// Invoice operations
router.get('/invoices', paymentController.getInvoices);
router.get('/invoice/:invoiceId', paymentController.getInvoice);
router.get('/invoice/:invoiceId/download', paymentController.downloadInvoice);

// Admin operations
router.get('/admin/all', paymentController.getAllPayments);
router.get('/admin/stats', paymentController.getPaymentStats);
router.post('/admin/assign-subscription', paymentController.adminAssignSubscription);

module.exports = router;
