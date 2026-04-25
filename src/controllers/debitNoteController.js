const debitNoteService = require('../services/debitNoteService');

class DebitNoteController {
    // Create a new debit note
    async createDebitNote(req, res) {
        try {
            const userId = req.user._id;
            const result = await debitNoteService.createDebitNote(userId, req.body);
            return res.status(201).json(result);

        } catch (error) {
            console.error('Create debit note error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create debit note'
            });
        }
    }

    // Get all debit notes
    async getDebitNotes(req, res) {
        try {
            const userId = req.user._id;
            const filters = req.query;

            const result = await debitNoteService.getDebitNotes(userId, filters);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get debit notes error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get debit notes'
            });
        }
    }

    // Get a single debit note by ID
    async getDebitNoteById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await debitNoteService.getDebitNoteById(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get debit note by ID error:', error);
            if (error.message === 'Debit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get debit note'
            });
        }
    }

    // Get debit note statistics
    async getDebitNoteStats(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.query;

            const result = await debitNoteService.getDebitNoteStats(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get debit note stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get debit note statistics'
            });
        }
    }

    // Get next debit note number
    async getNextDebitNoteNumber(req, res) {
        try {
            const userId = req.user._id;
            const { companyId } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            const result = await debitNoteService.getNextDebitNoteNumber(userId, companyId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get next debit note number error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get next debit note number'
            });
        }
    }

    // Update debit note
    async updateDebitNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await debitNoteService.updateDebitNote(id, userId, req.body);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update debit note error:', error);

            if (error.message === 'Debit note not found or not accessible') {
                return res.status(404).json({
                    success: false,
                    message: 'Debit note not found'
                });
            }

            if (error.message === 'Only draft debit notes can be updated') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update debit note'
            });
        }
    }

    // Update debit note status
    async updateDebitNoteStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await debitNoteService.updateDebitNoteStatus(id, userId, status);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update debit note status error:', error);
            if (error.message === 'Debit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update debit note status'
            });
        }
    }

    // Delete debit note
    async deleteDebitNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await debitNoteService.softDeleteDebitNote(id, userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete debit note error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete debit note'
            });
        }
    }

    // Send debit note (mark as sent)
    async sendDebitNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await debitNoteService.sendDebitNote(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Send debit note error:', error);

            if (error.message === 'Debit note not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to send debit note'
            });
        }
    }

    // Add payment to debit note
    async addPayment(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const paymentData = req.body;

            const result = await debitNoteService.addPayment(id, userId, paymentData);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Add payment error:', error);
            if (error.message === 'Debit note not found') {
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

    // Validate debit note against ZATCA rules
    async validateDebitNote(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await debitNoteService.validateZatcaDebitNote(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Validate debit note error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to validate debit note',
                errors: error.errors || []
            });
        }
    }
}

module.exports = new DebitNoteController();
