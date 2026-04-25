// src/controllers/bankAccountController.js
const bankAccountService = require('../services/bankAccountService');

const bankAccountController = {
    // POST /api/bank-accounts - Create a new bank account
    createBankAccount: async (req, res) => {
        try {
            const result = await bankAccountService.createBankAccount(req.user._id, req.body);
            return res.status(201).json(result);
        } catch (error) {
            console.error('Create bank account error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Error creating bank account'
            });
        }
    },

    // GET /api/bank-accounts - Get all bank accounts for the authenticated user
    getBankAccounts: async (req, res) => {
        try {
            const filters = {
                status: req.query.status,
                currency: req.query.currency,
                accountType: req.query.accountType,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await bankAccountService.getBankAccountsByUser(req.user._id, filters);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get bank accounts error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error fetching bank accounts'
            });
        }
    },

    // GET /api/bank-accounts/:id - Get a specific bank account
    getBankAccountById: async (req, res) => {
        try {
            const result = await bankAccountService.getBankAccountById(req.params.id, req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get bank account error:', error);
            const statusCode = error.message === 'Bank account not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error fetching bank account'
            });
        }
    },

    // PUT /api/bank-accounts/:id - Update a bank account
    updateBankAccount: async (req, res) => {
        try {
            const result = await bankAccountService.updateBankAccount(
                req.params.id,
                req.user._id,
                req.body
            );
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update bank account error:', error);
            const statusCode = error.message === 'Bank account not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error updating bank account'
            });
        }
    },

    // DELETE /api/bank-accounts/:id - Delete a bank account
    deleteBankAccount: async (req, res) => {
        try {
            const result = await bankAccountService.deleteBankAccount(req.params.id, req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Delete bank account error:', error);
            const statusCode = error.message === 'Bank account not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error deleting bank account'
            });
        }
    },

    // PUT /api/bank-accounts/:id/set-default - Set a bank account as default
    setDefaultBankAccount: async (req, res) => {
        try {
            const result = await bankAccountService.setDefaultBankAccount(req.params.id, req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Set default bank account error:', error);
            const statusCode = error.message === 'Bank account not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error setting default bank account'
            });
        }
    },

    // GET /api/bank-accounts/default - Get the default bank account
    getDefaultBankAccount: async (req, res) => {
        try {
            const result = await bankAccountService.getDefaultBankAccount(req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get default bank account error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error fetching default bank account'
            });
        }
    },

    // PUT /api/bank-accounts/:id/verification - Update verification status (admin only)
    updateVerificationStatus: async (req, res) => {
        try {
            // TODO: Add admin role check here
            // if (!req.user.role || !req.user.role.name.includes('admin')) {
            //     return res.status(403).json({
            //         success: false,
            //         message: 'Admin access required'
            //     });
            // }

            const { status, adminNotes } = req.body;
            const { targetUserId } = req.query; // For admin to update other user's accounts

            const userId = targetUserId || req.user._id;
            const result = await bankAccountService.updateVerificationStatus(
                req.params.id,
                userId,
                status,
                adminNotes
            );
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update verification status error:', error);
            const statusCode = error.message === 'Bank account not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error updating verification status'
            });
        }
    },

    // GET /api/bank-accounts/stats - Get bank account statistics
    getBankAccountStats: async (req, res) => {
        try {
            const result = await bankAccountService.getBankAccountStats(req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get bank account stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error fetching bank account statistics'
            });
        }
    },

    // POST /api/bank-accounts/validate-iban - Validate IBAN format
    validateIBAN: async (req, res) => {
        try {
            const { iban } = req.body;

            if (!iban) {
                return res.status(400).json({
                    success: false,
                    message: 'IBAN is required'
                });
            }

            const result = bankAccountService.validateIBAN(iban);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Validate IBAN error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error validating IBAN'
            });
        }
    },

    // GET /api/bank-accounts/saudi-banks - Get list of Saudi banks
    getSaudiBanks: async (req, res) => {
        try {
            const banks = bankAccountService.getSaudiBanks();
            return res.status(200).json({
                success: true,
                data: banks
            });
        } catch (error) {
            console.error('Get Saudi banks error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error fetching Saudi banks'
            });
        }
    },

    // GET /api/bank-accounts/currencies - Get supported currencies
    getSupportedCurrencies: async (req, res) => {
        try {
            const currencies = [
                { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
                { code: 'USD', name: 'US Dollar', symbol: '$' },
                { code: 'EUR', name: 'Euro', symbol: '€' },
                { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' }
            ];

            return res.status(200).json({
                success: true,
                data: currencies
            });
        } catch (error) {
            console.error('Get currencies error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error fetching currencies'
            });
        }
    }
};

module.exports = bankAccountController;