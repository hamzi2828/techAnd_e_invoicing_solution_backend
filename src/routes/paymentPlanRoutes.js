const express = require('express');
const paymentPlanController = require('../controllers/paymentPlanController');
const auth = require('../../middleware/auth');
const {
  validatePaymentPlanId,
  validateCreatePaymentPlan,
  validateUpdatePaymentPlan,
  validatePaymentPlanQueryParams,
  validateBulkPaymentPlanOrderUpdate,
  validatePaymentPlanDuplicate
} = require('../../middleware/validations/paymentPlanValidation');

const router = express.Router();

// Public routes (no authentication required)
router.get('/plans/active', paymentPlanController.getActivePaymentPlans);
router.get('/plans/featured', paymentPlanController.getFeaturedPaymentPlans);
router.get('/plans/popular', paymentPlanController.getPopularPaymentPlan);
router.get('/plans/stats', paymentPlanController.getPaymentPlanStats);
router.get('/plans/search', paymentPlanController.searchPaymentPlans);
router.get('/plans/:id', validatePaymentPlanId, paymentPlanController.getPaymentPlanById);

// Protected routes (authentication required)
router.get('/plans', validatePaymentPlanQueryParams, paymentPlanController.getAllPaymentPlans);
router.post('/plans', validateCreatePaymentPlan, paymentPlanController.createPaymentPlan);
router.put('/plans/:id', validatePaymentPlanId, validateUpdatePaymentPlan, paymentPlanController.updatePaymentPlan);
router.delete('/plans/:id', validatePaymentPlanId, paymentPlanController.deletePaymentPlan);
router.patch('/plans/:id/toggle-status', validatePaymentPlanId, paymentPlanController.togglePaymentPlanStatus);
router.patch('/plans/:id/set-popular', validatePaymentPlanId, paymentPlanController.setPopularPaymentPlan);
router.post('/plans/:id/duplicate', validatePaymentPlanId, validatePaymentPlanDuplicate, paymentPlanController.duplicatePaymentPlan);

// Bulk operations
router.patch('/plans/order', validateBulkPaymentPlanOrderUpdate, paymentPlanController.updatePaymentPlansOrder);

module.exports = router;