// middleware/validations/bankAccountValidation.js
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg,
            value: err.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: extractedErrors
        });
    }

    next();
};

const validateBankAccount = [
    body('accountName')
        .notEmpty()
        .withMessage('Account name is required')
        .isLength({ max: 100 })
        .withMessage('Account name cannot exceed 100 characters')
        .trim(),

    body('accountNumber')
        .notEmpty()
        .withMessage('Account number is required')
        .matches(/^[0-9]{10,20}$/)
        .withMessage('Account number must be between 10-20 digits')
        .trim(),

    body('iban')
        .notEmpty()
        .withMessage('IBAN is required')
        .matches(/^SA[0-9]{22}$/)
        .withMessage('Invalid IBAN format. Saudi IBAN should be SA followed by 22 digits')
        .trim(),

    body('bankName')
        .notEmpty()
        .withMessage('Bank name is required')
        .isIn([
            'Saudi National Bank',
            'Al Rajhi Bank',
            'Riyad Bank',
            'Banque Saudi Fransi',
            'Saudi British Bank (SABB)',
            'Arab National Bank',
            'Bank AlJazira',
            'Alinma Bank',
            'Bank Albilad',
            'Saudi Investment Bank'
        ])
        .withMessage('Invalid bank name'),

    body('bankCode')
        .optional()
        .matches(/^[0-9]{2,3}$/)
        .withMessage('Bank code must be 2-3 digits'),

    body('branchName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Branch name cannot exceed 100 characters')
        .trim(),

    body('branchCode')
        .optional()
        .matches(/^[0-9]{3,4}$/)
        .withMessage('Branch code must be 3-4 digits'),

    body('currency')
        .notEmpty()
        .withMessage('Currency is required')
        .isIn(['SAR', 'USD', 'EUR', 'AED'])
        .withMessage('Invalid currency'),

    body('accountType')
        .notEmpty()
        .withMessage('Account type is required')
        .isIn(['checking', 'savings', 'business', 'investment'])
        .withMessage('Invalid account type'),

    validate
];

const validateBankAccountUpdate = [
    body('accountName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Account name cannot exceed 100 characters')
        .trim(),

    body('accountNumber')
        .optional()
        .matches(/^[0-9]{10,20}$/)
        .withMessage('Account number must be between 10-20 digits')
        .trim(),

    body('iban')
        .optional()
        .matches(/^SA[0-9]{22}$/)
        .withMessage('Invalid IBAN format. Saudi IBAN should be SA followed by 22 digits')
        .trim(),

    body('bankName')
        .optional()
        .isIn([
            'Saudi National Bank',
            'Al Rajhi Bank',
            'Riyad Bank',
            'Banque Saudi Fransi',
            'Saudi British Bank (SABB)',
            'Arab National Bank',
            'Bank AlJazira',
            'Alinma Bank',
            'Bank Albilad',
            'Saudi Investment Bank'
        ])
        .withMessage('Invalid bank name'),

    body('bankCode')
        .optional()
        .matches(/^[0-9]{2,3}$/)
        .withMessage('Bank code must be 2-3 digits'),

    body('branchName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Branch name cannot exceed 100 characters')
        .trim(),

    body('branchCode')
        .optional()
        .matches(/^[0-9]{3,4}$/)
        .withMessage('Branch code must be 3-4 digits'),

    body('currency')
        .optional()
        .isIn(['SAR', 'USD', 'EUR', 'AED'])
        .withMessage('Invalid currency'),

    body('accountType')
        .optional()
        .isIn(['checking', 'savings', 'business', 'investment'])
        .withMessage('Invalid account type'),

    validate
];

const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid account ID'),
    validate
];

const validateVerificationStatus = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['verified', 'pending', 'failed'])
        .withMessage('Invalid verification status'),

    body('adminNotes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Admin notes cannot exceed 500 characters')
        .trim(),

    validate
];

const validateIBAN = [
    body('iban')
        .notEmpty()
        .withMessage('IBAN is required')
        .trim(),
    validate
];

const validateQuery = [
    query('status')
        .optional()
        .isIn(['all', 'active', 'inactive', 'pending', 'suspended'])
        .withMessage('Invalid status filter'),

    query('currency')
        .optional()
        .isIn(['SAR', 'USD', 'EUR', 'AED'])
        .withMessage('Invalid currency filter'),

    query('accountType')
        .optional()
        .isIn(['checking', 'savings', 'business', 'investment'])
        .withMessage('Invalid account type filter'),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'accountName', 'bankName', 'balance'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Invalid sort order'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    validate
];

module.exports = {
    validate,
    validateBankAccount,
    validateBankAccountUpdate,
    validateObjectId,
    validateVerificationStatus,
    validateIBAN,
    validateQuery
};