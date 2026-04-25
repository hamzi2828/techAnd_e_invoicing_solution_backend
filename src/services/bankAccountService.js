// src/services/bankAccountService.js
const BankAccount = require('../models/BankAccount');
const mongoose = require('mongoose');

const bankAccountService = {
    // Create a new bank account
    createBankAccount: async (userId, accountData) => {
        try {
            // Auto-generate bank code if not provided
            if (!accountData.bankCode && accountData.bankName) {
                accountData.bankCode = BankAccount.getBankCode(accountData.bankName);
            }

            // If this is the first account for the user, make it default
            const existingAccounts = await BankAccount.countDocuments({ userId });
            if (existingAccounts === 0) {
                accountData.isDefault = true;
            }

            const bankAccount = new BankAccount({
                ...accountData,
                userId
            });

            await bankAccount.save();
            return {
                success: true,
                message: 'Bank account created successfully',
                data: bankAccount
            };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`${field} already exists`);
            }
            throw error;
        }
    },

    // Get all bank accounts for a user
    getBankAccountsByUser: async (userId, filters = {}) => {
        try {
            const query = { userId };

            // Apply filters
            if (filters.status && filters.status !== 'all') {
                query.status = filters.status;
            }

            if (filters.currency) {
                query.currency = filters.currency;
            }

            if (filters.accountType) {
                query.accountType = filters.accountType;
            }

            if (filters.search) {
                query.$or = [
                    { accountName: { $regex: filters.search, $options: 'i' } },
                    { bankName: { $regex: filters.search, $options: 'i' } },
                    { iban: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const sortBy = filters.sortBy || 'createdAt';
            const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const skip = (page - 1) * limit;

            const [accounts, total] = await Promise.all([
                BankAccount.find(query)
                    .sort({ [sortBy]: sortOrder })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BankAccount.countDocuments(query)
            ]);

            return {
                success: true,
                data: {
                    accounts,
                    pagination: {
                        current: page,
                        total: Math.ceil(total / limit),
                        count: accounts.length,
                        totalRecords: total
                    }
                }
            };
        } catch (error) {
            throw error;
        }
    },

    // Get a specific bank account
    getBankAccountById: async (accountId, userId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                throw new Error('Invalid account ID');
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                userId
            });

            if (!account) {
                throw new Error('Bank account not found');
            }

            return {
                success: true,
                data: account
            };
        } catch (error) {
            throw error;
        }
    },

    // Update a bank account
    updateBankAccount: async (accountId, userId, updateData) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                throw new Error('Invalid account ID');
            }

            // Auto-generate bank code if bank name is updated
            if (updateData.bankName && !updateData.bankCode) {
                updateData.bankCode = BankAccount.getBankCode(updateData.bankName);
            }

            // Don't allow updating sensitive fields directly
            delete updateData.balance;
            delete updateData.lastTransaction;
            delete updateData.userId;

            const account = await BankAccount.findOneAndUpdate(
                { _id: accountId, userId },
                { ...updateData, updatedAt: new Date() },
                { new: true, runValidators: true }
            );

            if (!account) {
                throw new Error('Bank account not found');
            }

            return {
                success: true,
                message: 'Bank account updated successfully',
                data: account
            };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`${field} already exists`);
            }
            throw error;
        }
    },

    // Delete a bank account
    deleteBankAccount: async (accountId, userId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                throw new Error('Invalid account ID');
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                userId
            });

            if (!account) {
                throw new Error('Bank account not found');
            }

            // If deleting default account, set another as default
            if (account.isDefault) {
                const nextAccount = await BankAccount.findOne({
                    userId,
                    _id: { $ne: accountId }
                }).sort({ createdAt: 1 });

                if (nextAccount) {
                    nextAccount.isDefault = true;
                    await nextAccount.save();
                }
            }

            await BankAccount.findByIdAndDelete(accountId);

            return {
                success: true,
                message: 'Bank account deleted successfully'
            };
        } catch (error) {
            throw error;
        }
    },

    // Set default bank account
    setDefaultBankAccount: async (accountId, userId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                throw new Error('Invalid account ID');
            }

            // Remove default from all user accounts
            await BankAccount.updateMany(
                { userId },
                { isDefault: false }
            );

            // Set the specified account as default
            const account = await BankAccount.findOneAndUpdate(
                { _id: accountId, userId },
                { isDefault: true },
                { new: true }
            );

            if (!account) {
                throw new Error('Bank account not found');
            }

            return {
                success: true,
                message: 'Default bank account updated successfully',
                data: account
            };
        } catch (error) {
            throw error;
        }
    },

    // Get default bank account
    getDefaultBankAccount: async (userId) => {
        try {
            const account = await BankAccount.findOne({
                userId,
                isDefault: true,
                status: 'active'
            });

            return {
                success: true,
                data: account
            };
        } catch (error) {
            throw error;
        }
    },

    // Update account verification status
    updateVerificationStatus: async (accountId, userId, status, adminNotes = '') => {
        try {
            if (!mongoose.Types.ObjectId.isValid(accountId)) {
                throw new Error('Invalid account ID');
            }

            if (!['verified', 'pending', 'failed'].includes(status)) {
                throw new Error('Invalid verification status');
            }

            const account = await BankAccount.findOneAndUpdate(
                { _id: accountId, userId },
                {
                    verificationStatus: status,
                    ...(status === 'verified' && { status: 'active' })
                },
                { new: true }
            );

            if (!account) {
                throw new Error('Bank account not found');
            }

            return {
                success: true,
                message: 'Verification status updated successfully',
                data: account
            };
        } catch (error) {
            throw error;
        }
    },

    // Get bank accounts statistics
    getBankAccountStats: async (userId) => {
        try {
            const stats = await BankAccount.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: null,
                        totalAccounts: { $sum: 1 },
                        activeAccounts: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        pendingAccounts: {
                            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                        },
                        verifiedAccounts: {
                            $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] }
                        },
                        totalBalance: { $sum: '$balance' },
                        currencies: { $addToSet: '$currency' }
                    }
                }
            ]);

            const result = stats[0] || {
                totalAccounts: 0,
                activeAccounts: 0,
                pendingAccounts: 0,
                verifiedAccounts: 0,
                totalBalance: 0,
                currencies: []
            };

            return {
                success: true,
                data: result
            };
        } catch (error) {
            throw error;
        }
    },

    // Validate IBAN format
    validateIBAN: (iban) => {
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();

        if (!/^SA[0-9]{22}$/.test(cleanIban)) {
            return {
                valid: false,
                message: 'Invalid IBAN format. Saudi IBAN should be SA followed by 22 digits'
            };
        }

        // Basic checksum validation
        const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
        const numeric = rearranged.replace(/[A-Z]/g, char => (char.charCodeAt(0) - 55).toString());

        let remainder = '';
        for (let i = 0; i < numeric.length; i += 7) {
            remainder = (remainder + numeric.slice(i, i + 7)) % 97;
        }

        const isValid = remainder === 1;

        return {
            valid: isValid,
            message: isValid ? 'Valid IBAN' : 'Invalid IBAN checksum'
        };
    },

    // Get Saudi banks list
    getSaudiBanks: () => {
        return [
            { name: 'Saudi National Bank', code: '10' },
            { name: 'Al Rajhi Bank', code: '80' },
            { name: 'Riyad Bank', code: '20' },
            { name: 'Banque Saudi Fransi', code: '55' },
            { name: 'Saudi British Bank (SABB)', code: '45' },
            { name: 'Arab National Bank', code: '05' },
            { name: 'Bank AlJazira', code: '65' },
            { name: 'Alinma Bank', code: '71' },
            { name: 'Bank Albilad', code: '15' },
            { name: 'Saudi Investment Bank', code: '30' }
        ];
    }
};

module.exports = bankAccountService;