const quotationService = require('../services/quotationService');

class QuotationController {
    // Create a new quotation
    async createQuotation(req, res) {
        try {
            const userId = req.user._id;
            console.log(req.body);
            const result = await quotationService.createQuotation(userId, req.body);

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create quotation error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create quotation'
            });
        }
    }

    // Get all quotations for a user/company with filters
    async getQuotations(req, res) {
        try {
            const userId = req.user._id;
            const filters = req.query;

            const result = await quotationService.getQuotations(userId, filters);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get quotations error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get quotations'
            });
        }
    }

    // Get a single quotation by ID
    async getQuotationById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await quotationService.getQuotationById(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get quotation by ID error:', error);
            if (error.message === 'Quotation not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get quotation'
            });
        }
    }

    // Update quotation (draft only)
    async updateQuotation(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await quotationService.updateQuotation(id, userId, req.body);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update quotation error:', error);
            if (error.message === 'Quotation not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Only draft quotations')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update quotation'
            });
        }
    }

    // Delete quotation (soft delete)
    async deleteQuotation(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            // Get the existing quotation
            const existingResult = await quotationService.getQuotationById(id, userId);
            if (!existingResult.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            // Soft delete the quotation
            const result = await quotationService.softDeleteQuotation(id, userId);
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: result.message || 'Failed to delete quotation'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Quotation deleted successfully'
            });

        } catch (error) {
            console.error('Delete quotation error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete quotation'
            });
        }
    }

    // Update quotation status
    async updateQuotationStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await quotationService.updateQuotationStatus(id, userId, status);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update quotation status error:', error);
            if (error.message === 'Quotation not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update quotation status'
            });
        }
    }

    // Send quotation
    async sendQuotation(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await quotationService.sendQuotation(id, userId);
            return res.status(200).json({
                success: true,
                message: 'Quotation sent successfully',
                data: result.data
            });

        } catch (error) {
            console.error('Send quotation error:', error);
            if (error.message === 'Quotation not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to send quotation'
            });
        }
    }

    // Convert quotation to invoice
    async convertToInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await quotationService.convertToInvoice(id, userId);
            return res.status(200).json({
                success: true,
                message: 'Quotation converted to invoice successfully',
                data: result.data
            });

        } catch (error) {
            console.error('Convert to invoice error:', error);
            if (error.message === 'Quotation not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Only accepted quotations')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('already been converted')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to convert quotation to invoice'
            });
        }
    }

    // Get quotation statistics
    async getQuotationStats(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.query;

            const result = await quotationService.getQuotationStats(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get quotation stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get quotation statistics'
            });
        }
    }

    // Get next quotation number
    async getNextQuoteNumber(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const result = await quotationService.getNextQuoteNumber(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get next quote number error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get next quotation number'
            });
        }
    }

    // Get quotation preview data
    async getQuotationPreview(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await quotationService.getQuotationById(id, userId);
            if (!result.success) {
                return res.status(404).json(result);
            }

            // Return quotation data formatted for preview
            const quotation = result.data.quotation;
            return res.status(200).json({
                success: true,
                data: {
                    quotation: {
                        ...quotation.toObject(),
                        company: quotation.companyId,
                        customer: quotation.customerId
                    }
                }
            });

        } catch (error) {
            console.error('Get quotation preview error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get quotation preview'
            });
        }
    }
}

module.exports = new QuotationController();
