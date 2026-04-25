const express = require('express');
const multer = require('multer');
const invoiceController = require('../controllers/invoiceController');
const bulkImportController = require('../controllers/bulkImportController');
const { protect } = require('../../middleware/auth');
const { attachPlan, checkLimit } = require('../../middleware/planMiddleware');

const router = express.Router();

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    }
});

// Invoice Routes

// ========== Bulk Import Routes ==========

// GET /api/invoices/bulk-import/template/:companyId - Download import template
router.get('/bulk-import/template/:companyId', protect, bulkImportController.downloadTemplate);

// POST /api/invoices/bulk-import - Process bulk import
router.post('/bulk-import', protect, upload.single('file'), bulkImportController.processBulkImport);

// POST /api/invoices/bulk-import/validate - Validate import file without creating invoices
router.post('/bulk-import/validate', protect, upload.single('file'), bulkImportController.validateImportFile);

// GET /api/invoices/bulk-import/history - Get import history
router.get('/bulk-import/history', protect, bulkImportController.getImportHistory);

// ========== Standard Invoice Routes ==========

// GET /api/invoices - Get all invoices with pagination and filters
router.get('/', protect, invoiceController.getInvoices);

// GET /api/invoices/customers - Get customers for invoice creation
router.get('/customers', protect, invoiceController.getCustomersForInvoice);

// GET /api/invoices/stats - Get invoice statistics
router.get('/stats', protect, invoiceController.getInvoiceStats);

// GET /api/invoices/next-number/:companyId - Get next invoice number for a specific company
router.get('/next-number/:companyId', protect, invoiceController.getNextInvoiceNumber);

// POST /api/invoices - Create a new invoice (main endpoint for /admin/sales/create-invoice)
// attachPlan: loads user's plan and usage tracker into req.plan
// checkLimit('invoice'): verifies user hasn't exceeded their invoice limit
router.post('/', protect, attachPlan, checkLimit('invoice'), invoiceController.createInvoice);

// GET /api/invoices/:id - Get a single invoice by ID
router.get('/:id', protect, invoiceController.getInvoiceById);

// PUT /api/invoices/:id - Update an invoice (draft only)
router.put('/:id', protect, invoiceController.updateInvoice);

// DELETE /api/invoices/:id - Delete an invoice (draft only)
// attachPlan: needed to decrement usage counter after successful deletion
router.delete('/:id', protect, attachPlan, invoiceController.deleteInvoice);

// PATCH /api/invoices/:id/status - Update invoice status
router.patch('/:id/status', protect, invoiceController.updateInvoiceStatus);

// POST /api/invoices/:id/send - Send an invoice (with ZATCA integration)
router.post('/:id/send', protect, invoiceController.sendInvoice);

// POST /api/invoices/:id/payments - Add payment to invoice
router.post('/:id/payments', protect, invoiceController.addPayment);

// GET /api/invoices/:id/preview - Get invoice preview data
router.get('/:id/preview', protect, invoiceController.getInvoicePreview);

// ========== ZATCA E-Invoicing Routes ==========

// GET /api/invoices/zatca/health - Check ZATCA API health status
router.get('/zatca/health', protect, invoiceController.checkZatcaHealth);

// POST /api/invoices/:id/zatca/validate - Validate invoice against ZATCA rules
router.post('/:id/zatca/validate', protect, invoiceController.validateInvoice);

// GET /api/invoices/:id/zatca/pdf - Download PDF/A-3 with embedded XML
router.get('/:id/zatca/pdf', protect, invoiceController.downloadZatcaPDF);

// GET /api/invoices/:id/zatca/qrcode - Get ZATCA QR code
router.get('/:id/zatca/qrcode', protect, invoiceController.getZatcaQRCode);

// GET /api/invoices/:id/download-pdf - Download PDF with correct VAT categories (regenerated on-the-fly)
router.get('/:id/download-pdf', protect, invoiceController.downloadPDF);

// ========== Hash Chain Routes ==========

// GET /api/invoices/hash-chain/:companyId - Get hash chain history for a company
router.get('/hash-chain/:companyId', protect, invoiceController.getHashChainHistory);

// GET /api/invoices/hash-chain/:companyId/verify - Verify hash chain integrity
router.get('/hash-chain/:companyId/verify', protect, invoiceController.verifyHashChainIntegrity);

// GET /api/invoices/hash-chain/:companyId/state - Get current hash chain state
router.get('/hash-chain/:companyId/state', protect, invoiceController.getHashChainState);

// POST /api/invoices/hash-chain/:companyId/fix - Fix/sync hash chain for a company
router.post('/hash-chain/:companyId/fix', protect, invoiceController.fixHashChainForCompany);

// POST /api/invoices/hash-chain/fix-all - Fix hash chain for all companies
router.post('/hash-chain/fix-all', protect, invoiceController.fixHashChainForAllCompanies);

module.exports = router;