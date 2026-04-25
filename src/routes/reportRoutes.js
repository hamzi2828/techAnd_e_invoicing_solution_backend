const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../../middleware/auth');

// Middleware to protect all report routes
router.use(protect);

// Sales Reports
router.get('/sales/overview', reportController.getSalesOverview);
router.get('/sales/monthly-revenue', reportController.getMonthlyRevenue);
router.get('/sales/invoice-distribution', reportController.getInvoiceDistribution);
router.get('/sales/top-customers', reportController.getTopCustomers);
router.get('/sales/top-products', reportController.getTopProducts);
router.post('/sales/export', reportController.exportSalesReport);

// Dashboard Reports
router.get('/dashboard/stats', reportController.getDashboardStats);

// Financial Reports
router.get('/financial/revenue-trend', reportController.getRevenueTrend);
router.get('/financial/payment-status', reportController.getPaymentStatus);

// Customer Reports
router.get('/customers/analytics', reportController.getCustomerAnalytics);
router.get('/customers/growth', reportController.getCustomerGrowth);

// Product Reports
router.get('/products/performance', reportController.getProductPerformance);
router.get('/products/inventory', reportController.getInventoryReport);

module.exports = router;
