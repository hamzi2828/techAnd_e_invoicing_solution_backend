const creditNoteService = require('../services/creditNoteService');

class CreditNoteController {
    // Create a new credit note
    async createCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const result = await creditNoteService.createCreditNote(userId, req.body);
            return res.status(201).json(result);

        } catch (error) {
            console.error('Create credit note error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create credit note'
            });
        }
    }

    // Get all credit notes
    async getCreditNotes(req, res) {
        try {
            const userId = req.user._id;
            const filters = req.query;

            const result = await creditNoteService.getCreditNotes(userId, filters);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get credit notes error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get credit notes'
            });
        }
    }

    // Get a single credit note by ID
    async getCreditNoteById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await creditNoteService.getCreditNoteById(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get credit note by ID error:', error);
            if (error.message === 'Credit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get credit note'
            });
        }
    }

    // Get credit note statistics
    async getCreditNoteStats(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.query;

            const result = await creditNoteService.getCreditNoteStats(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get credit note stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get credit note statistics'
            });
        }
    }

    // Get next credit note number
    async getNextCreditNoteNumber(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const result = await creditNoteService.getNextCreditNoteNumber(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get next credit note number error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get next credit note number'
            });
        }
    }

    // Update credit note
    async updateCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await creditNoteService.updateCreditNote(id, userId, req.body);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update credit note error:', error);

            if (error.message === 'Credit note not found or not accessible') {
                return res.status(404).json({
                    success: false,
                    message: 'Credit note not found'
                });
            }

            if (error.message === 'Only draft credit notes can be updated') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update credit note'
            });
        }
    }

    // Update credit note status
    async updateCreditNoteStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await creditNoteService.updateCreditNoteStatus(id, userId, status);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update credit note status error:', error);
            if (error.message === 'Credit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update credit note status'
            });
        }
    }

    // Delete credit note
    async deleteCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await creditNoteService.softDeleteCreditNote(id, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete credit note error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete credit note'
            });
        }
    }

    // Send credit note (mark as sent)
    async sendCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await creditNoteService.sendCreditNote(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Send credit note error:', error);

            if (error.message === 'Credit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to send credit note'
            });
        }
    }

    // Apply credit note to invoice
    async applyCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { invoiceId, amount } = req.body;

            if (!invoiceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice ID is required'
                });
            }

            const result = await creditNoteService.applyCreditNoteToInvoice(id, userId, invoiceId, amount);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Apply credit note error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to apply credit note'
            });
        }
    }

    // Validate credit note against ZATCA rules
    async validateCreditNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await creditNoteService.validateZatcaCreditNote(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Validate credit note error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to validate credit note',
                errors: error.errors || []
            });
        }
    }
}

module.exports = new CreditNoteController();
