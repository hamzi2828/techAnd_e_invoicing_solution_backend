const express = require('express');
const customerController = require('../controllers/customerController');
const { protect } = require('../../middleware/auth');
const { attachPlan, checkLimit } = require('../../middleware/planMiddleware');
const router = express.Router();

// Customer CRUD Routes

// GET /api/customers - Get all customers with pagination and filters
router.get('/', protect, customerController.getCustomers);

// GET /api/customers/for-invoice - Get active customers for invoice creation
router.get('/for-invoice', protect, customerController.getCustomersForInvoice);

// GET /api/customers/search - Search customers
router.get('/search', protect, customerController.searchCustomers);

// GET /api/customers/stats - Get customer statistics
router.get('/stats', protect, customerController.getCustomerStats);

// GET /api/customers/export - Export customers
router.get('/export', protect, customerController.exportCustomers);

// GET /api/customers/:id - Get a single customer by ID
router.get('/:id', protect, customerController.getCustomerById);

// POST /api/customers - Create a new customer
// attachPlan: loads user's plan and usage tracker into req.plan
// checkLimit('customer'): verifies user hasn't exceeded their customer limit
router.post('/', protect, attachPlan, checkLimit('customer'), customerController.createCustomer);

// PUT /api/customers/:id - Update a customer
router.put('/:id', protect, customerController.updateCustomer);

// PATCH /api/customers/:id/status - Update customer status
router.patch('/:id/status', protect, customerController.updateCustomerStatus);

// DELETE /api/customers/:id - Soft delete a customer
// attachPlan: needed to decrement usage counter after successful deletion
router.delete('/:id', protect, attachPlan, customerController.deleteCustomer);

// GET /api/customers/:id/validate - Validate customer for invoice creation
router.get('/:id/validate', protect, customerController.validateCustomerForInvoice);

// GET /api/customers/:id/details - Get comprehensive customer details with history and metrics
router.get('/:id/details', protect, customerController.getCustomerDetails);

module.exports = router;