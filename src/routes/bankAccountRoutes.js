// src/routes/bankAccountRoutes.js
const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const { protect } = require('../../middleware/auth');
const {
    validateBankAccount,
    validateBankAccountUpdate,
    validateObjectId,
    validateVerificationStatus,
    validateIBAN,
    validateQuery
} = require('../../middleware/validations/bankAccountValidation');

// Public routes (utility endpoints)
router.get('/saudi-banks', bankAccountController.getSaudiBanks);
router.get('/currencies', bankAccountController.getSupportedCurrencies);
router.post('/validate-iban', validateIBAN, bankAccountController.validateIBAN);

// Protected routes (authentication required)
router.use(protect);

// CRUD operations
router.post('/', validateBankAccount, bankAccountController.createBankAccount);
router.get('/', validateQuery, bankAccountController.getBankAccounts);
router.get('/stats', bankAccountController.getBankAccountStats);
router.get('/default', bankAccountController.getDefaultBankAccount);
router.get('/:id', validateObjectId, bankAccountController.getBankAccountById);
router.put('/:id', validateObjectId, validateBankAccountUpdate, bankAccountController.updateBankAccount);
router.delete('/:id', validateObjectId, bankAccountController.deleteBankAccount);

// Special operations
router.put('/:id/set-default', validateObjectId, bankAccountController.setDefaultBankAccount);
router.put('/:id/verification', validateObjectId, validateVerificationStatus, bankAccountController.updateVerificationStatus);

module.exports = router;