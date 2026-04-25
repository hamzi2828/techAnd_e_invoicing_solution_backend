const express = require('express');
const posController = require('../controllers/posController');
const { protect } = require('../../middleware/auth');
const { attachPlan, requireFeature, checkLimit } = require('../../middleware/planMiddleware');
const { FEATURES } = require('../constants/planFeatures');

const router = express.Router();

// All POS routes require authentication and POS feature access
router.use(protect);
router.use(attachPlan);
router.use(requireFeature(FEATURES.POS_ACCESS)); // Returns 403 if not entitled

// POST /api/pos - Create a new POS order
router.post('/', checkLimit('invoice'), posController.createPOSOrder);

// GET /api/pos/summary/today - Get today's sales summary
router.get('/summary/today', posController.getTodaySummary);

// GET /api/pos/orders/recent - Get recent POS orders
router.get('/orders/recent', posController.getRecentOrders);

// GET /api/pos/orders/:id - Get a specific POS order
router.get('/orders/:id', posController.getOrderById);

module.exports = router;
