const express = require('express');
const quotationController = require('../controllers/quotationController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Quotation Routes

// GET /api/quotations - Get all quotations with pagination and filters
router.get('/', protect, quotationController.getQuotations);

// GET /api/quotations/stats - Get quotation statistics
router.get('/stats', protect, quotationController.getQuotationStats);

// GET /api/quotations/next-number/:companyId - Get next quotation number for a specific company
router.get('/next-number/:companyId', protect, quotationController.getNextQuoteNumber);

// POST /api/quotations - Create a new quotation
router.post('/', protect, quotationController.createQuotation);

// GET /api/quotations/:id - Get a single quotation by ID
router.get('/:id', protect, quotationController.getQuotationById);

// PUT /api/quotations/:id - Update a quotation (draft only)
router.put('/:id', protect, quotationController.updateQuotation);

// DELETE /api/quotations/:id - Delete a quotation (draft only)
router.delete('/:id', protect, quotationController.deleteQuotation);

// PATCH /api/quotations/:id/status - Update quotation status
router.patch('/:id/status', protect, quotationController.updateQuotationStatus);

// POST /api/quotations/:id/send - Send a quotation
router.post('/:id/send', protect, quotationController.sendQuotation);

// POST /api/quotations/:id/convert - Convert quotation to invoice
router.post('/:id/convert', protect, quotationController.convertToInvoice);

// GET /api/quotations/:id/preview - Get quotation preview data
router.get('/:id/preview', protect, quotationController.getQuotationPreview);

module.exports = router;
