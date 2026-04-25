const express = require('express');
const router = express.Router();
const moyasarController = require('../controllers/moyasar.controller');
const { protect } = require('../../middleware/auth');

// ==========================================
// PUBLIC ROUTES (no authentication required)
// ==========================================

// Webhook endpoint (called by Moyasar)
router.post('/webhook', moyasarController.handleWebhook);

// Get publishable key (needed to initialize payment form)
router.get('/publishable-key', moyasarController.getPublishableKey);

// Callback endpoint (redirect from Moyasar after payment)
router.get('/callback', moyasarController.handleCallback);

// Verify payment status (public for callback flow)
router.get('/verify/:paymentId', moyasarController.verifyPayment);

// Get payment details (public for callback verification)
router.get('/payment/:paymentId', moyasarController.getPayment);

// ==========================================
// PROTECTED ROUTES (require authentication)
// ==========================================
router.use(protect);

// Create a new payment
router.post('/create-payment', moyasarController.createPayment);

// Get payment form data for frontend embedding
router.post('/payment-form-data', moyasarController.getPaymentFormData);

// Process refund (admin only in production)
router.post('/refund', moyasarController.refundPayment);

// Get payment history
router.get('/history', moyasarController.getPaymentHistory);

module.exports = router;
