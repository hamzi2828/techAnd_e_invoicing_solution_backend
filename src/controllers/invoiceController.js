const invoiceService = require('../services/invoiceService');
const { incrementUsage, decrementUsage } = require('../../middleware/planMiddleware');

class InvoiceController {
    // Create a new invoice (main endpoint for /admin/sales/create-invoice)
    async createInvoice(req, res) {
        try {
            const userId = req.user._id;
            console.log(req.body);
            const result = await invoiceService.createInvoice(userId, req.body);

            // ==================== INCREMENT USAGE ====================
            // Track invoice creation in the usage tracker for plan limits
            await incrementUsage(req, 'invoice', 1);

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create invoice error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create invoice'
            });
        }
    }

    // Get all invoices for a user/company with filters
    async getInvoices(req, res) {
        try {
            const userId = req.user._id;
            const filters = req.query;

            const result = await invoiceService.getInvoices(userId, filters);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get invoices error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get invoices'
            });
        }
    }

    // Get a single invoice by ID
    async getInvoiceById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.getInvoiceById(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get invoice by ID error:', error);
            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get invoice'
            });
        }
    }

    // Get customers for invoice creation
    async getCustomersForInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.query;

            const result = await invoiceService.getCustomersForInvoice(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customers for invoice error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customers'
            });
        }
    }

    // Update invoice status
    async updateInvoiceStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await invoiceService.updateInvoiceStatus(id, userId, status);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update invoice status error:', error);
            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update invoice status'
            });
        }
    }

    // Add payment to invoice
    async addPayment(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const paymentData = req.body;

            const result = await invoiceService.addPayment(id, userId, paymentData);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Add payment error:', error);
            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to add payment'
            });
        }
    }

    // Get invoice statistics
    async getInvoiceStats(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.query;

            const result = await invoiceService.getInvoiceStats(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get invoice stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get invoice statistics'
            });
        }
    }

    // Get next invoice number
    async getNextInvoiceNumber(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const result = await invoiceService.getNextInvoiceNumber(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get next invoice number error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get next invoice number'
            });
        }
    }

    // Check ZATCA API health
    async checkZatcaHealth(req, res) {
        try {
            const zatcaService = require('../services/zatcaService');
            const health = await zatcaService.checkAPIHealth();

            return res.status(health.healthy ? 200 : 503).json({
                success: health.healthy,
                message: health.message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            return res.status(503).json({
                success: false,
                message: 'Unable to check ZATCA API health',
                error: error.message
            });
        }
    }

    // Send invoice with ZATCA integration (mark as sent and submit to ZATCA)
    async sendInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.sendInvoiceWithZatca(id, userId);
            return res.status(200).json({
                success: true,
                message: result.message || 'Invoice sent successfully and cleared by ZATCA',
                data: result.data
            });

        } catch (error) {
            console.error('Send invoice error:', error);

            // Handle specific error codes
            if (error.code === 'ZATCA_API_SERVER_ERROR') {
                return res.status(503).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    technical: error.technical,
                    suggestion: 'The ZATCA service provider is experiencing technical issues. Please try again later or contact support.'
                });
            }

            if (error.code === 'ZATCA_VALIDATION_ERROR') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    validationErrors: error.validationErrors
                });
            }

            if (error.message === 'Invoice not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message && error.message.includes('not ZATCA verified')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message && error.message.includes('validation failed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    errors: error.errors || []
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to send invoice'
            });
        }
    }

    // Update invoice (for draft invoices)
    async updateInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            // Update the invoice using service
            const result = await invoiceService.updateInvoice(id, userId, req.body);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update invoice error:', error);

            // Handle specific error cases
            if (error.message === 'Invoice not found or not accessible') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'Only draft invoices can be updated') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update invoice'
            });
        }
    }

    // Delete invoice (soft delete)
    async deleteInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            // First get the existing invoice
            const existingResult = await invoiceService.getInvoiceById(id, userId);
            if (!existingResult.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            // Soft delete the invoice
            const result = await invoiceService.softDeleteInvoice(id, userId);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message || 'Failed to delete invoice'
                });
            }

            // ==================== DECREMENT USAGE ====================
            // Reduce invoice count in usage tracker after successful deletion
            await decrementUsage(req, 'invoice', 1);

            return res.status(200).json({
                success: true,
                message: 'Invoice deleted successfully'
            });

        } catch (error) {
            console.error('Delete invoice error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete invoice'
            });
        }
    }

    // Get invoice preview data
    async getInvoicePreview(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.getInvoiceById(id, userId);
            if (!result.success) {
                return res.status(404).json(result);
            }

            // Return invoice data formatted for preview
            const invoice = result.data.invoice;
            return res.status(200).json({
                success: true,
                data: {
                    invoice: {
                        ...invoice.toObject(),
                        company: invoice.companyId,
                        customer: invoice.customerId
                    }
                }
            });

        } catch (error) {
            console.error('Get invoice preview error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get invoice preview'
            });
        }
    }

    // ========== ZATCA-Specific Methods ==========

    /**
     * Validate invoice against ZATCA rules before sending
     * POST /api/invoices/:id/zatca/validate
     */
    async validateInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.validateZatcaInvoice(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Validate invoice error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to validate invoice',
                errors: error.errors || []
            });
        }
    }

    /**
     * Download PDF/A-3 with embedded XML
     * GET /api/invoices/:id/zatca/pdf
     */
    async downloadZatcaPDF(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.getZatcaPDF(id, userId);

            if (!result.success || !result.data.pdfUrl) {
                return res.status(404).json({
                    success: false,
                    message: 'PDF not found or not yet generated'
                });
            }

            // Redirect to PDF URL
            return res.redirect(result.data.pdfUrl);

        } catch (error) {
            console.error('Download ZATCA PDF error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to download PDF'
            });
        }
    }

    /**
     * Get ZATCA QR Code
     * GET /api/invoices/:id/zatca/qrcode
     */
    async getZatcaQRCode(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.getZatcaQRCode(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get ZATCA QR code error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get QR code'
            });
        }
    }

    /**
     * Regenerate PDF on-the-fly with correct VAT categories
     * GET /api/invoices/:id/download-pdf
     */
    async downloadPDF(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await invoiceService.regeneratePDF(id, userId);

            if (!result.success || !result.data.pdfBase64) {
                return res.status(404).json({
                    success: false,
                    message: 'Failed to generate PDF'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    pdfBase64: result.data.pdfBase64,
                    invoiceNumber: result.data.invoiceNumber
                }
            });

        } catch (error) {
            console.error('Download PDF error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to download PDF'
            });
        }
    }

    // ========== Hash Chain Methods ==========

    /**
     * Get hash chain history for a company
     * GET /api/invoices/hash-chain/:companyId
     */
    async getHashChainHistory(req, res) {
        try {
            const hashChainService = require('../services/hashChainService');
            const Company = require('../models/Company');
            const userId = req.user._id;
            const { companyId } = req.params;
            const { page, limit } = req.query;

            // Verify user has access to this company
            const company = await Company.findOne({ _id: companyId, userId });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found or access denied'
                });
            }

            const result = await hashChainService.getHashChainHistory(companyId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            });

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Get hash chain history error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get hash chain history'
            });
        }
    }

    /**
     * Verify hash chain integrity for a company
     * GET /api/invoices/hash-chain/:companyId/verify
     */
    async verifyHashChainIntegrity(req, res) {
        try {
            const hashChainService = require('../services/hashChainService');
            const Company = require('../models/Company');
            const userId = req.user._id;
            const { companyId } = req.params;

            // Verify user has access to this company
            const company = await Company.findOne({ _id: companyId, userId });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found or access denied'
                });
            }

            const result = await hashChainService.verifyHashChainIntegrity(companyId);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Verify hash chain integrity error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to verify hash chain integrity'
            });
        }
    }

    /**
     * Get current hash chain state for a company
     * GET /api/invoices/hash-chain/:companyId/state
     */
    async getHashChainState(req, res) {
        try {
            const hashChainService = require('../services/hashChainService');
            const Company = require('../models/Company');
            const userId = req.user._id;
            const { companyId } = req.params;

            // Verify user has access to this company
            const company = await Company.findOne({ _id: companyId, userId });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found or access denied'
                });
            }

            const result = await hashChainService.getHashChainState(companyId);

            return res.status(200).json({
                success: true,
                data: {
                    companyId: companyId,
                    companyName: company.companyName,
                    ...result
                }
            });

        } catch (error) {
            console.error('Get hash chain state error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get hash chain state'
            });
        }
    }

    /**
     * Fix/Sync hash chain for a specific company
     * POST /api/invoices/hash-chain/:companyId/fix
     */
    async fixHashChainForCompany(req, res) {
        try {
            const hashChainService = require('../services/hashChainService');
            const Company = require('../models/Company');
            const userId = req.user._id;
            const { companyId } = req.params;

            // Verify user has access to this company
            const company = await Company.findOne({ _id: companyId, userId });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found or access denied'
                });
            }

            const result = await hashChainService.fixHashChainForCompany(companyId);

            return res.status(200).json({
                success: true,
                data: {
                    companyId: companyId,
                    companyName: company.companyName,
                    ...result
                }
            });

        } catch (error) {
            console.error('Fix hash chain error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to fix hash chain'
            });
        }
    }

    /**
     * Fix hash chain for all verified companies
     * POST /api/invoices/hash-chain/fix-all
     */
    async fixHashChainForAllCompanies(req, res) {
        try {
            const hashChainService = require('../services/hashChainService');

            const result = await hashChainService.fixHashChainForAllCompanies();

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Fix all hash chains error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to fix hash chains'
            });
        }
    }
}

module.exports = new InvoiceController();