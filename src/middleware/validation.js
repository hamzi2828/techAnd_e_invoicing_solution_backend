// src/middleware/validation.js
const { body, validationResult } = require('express-validator');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// Company validation rules
const validateCompany = [
    body('companyName')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Company name must be between 2 and 200 characters'),

    body('companyNameAr')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Arabic company name cannot exceed 200 characters'),

    body('legalForm')
        .isIn([
            'Limited Liability Company',
            'Joint Stock Company',
            'Partnership',
            'Sole Proprietorship',
            'Branch of Foreign Company',
            'Professional Company'
        ])
        .withMessage('Invalid legal form'),

    body('commercialRegistrationNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Commercial registration number must be 10 digits'),

    body('taxIdNumber')
        .trim()
        .matches(/^3[0-9]{14}$/)
        .withMessage('Tax ID must start with 3 and be 15 digits'),

    body('vatNumber')
        .optional()
        .trim()
        .matches(/^3[0-9]{14}$/)
        .withMessage('VAT number must start with 3 and be 15 digits'),

    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please enter a valid email address'),

    body('phone')
        .trim()
        .matches(/^(\+966|0)?[5][0-9]{8}$/)
        .withMessage('Please enter a valid Saudi phone number'),

    body('website')
        .optional()
        .trim()
        .isURL()
        .withMessage('Website must be a valid URL'),

    body('address.street')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Street address must be between 5 and 200 characters'),

    body('address.district')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('District must be between 2 and 100 characters'),

    body('address.city')
        .isIn([
            'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar',
            'Dhahran', 'Jubail', 'Tabuk', 'Abha', 'Khamis Mushait',
            'Hail', 'Buraidah', 'Qassim', 'Jazan', 'Najran', 'Al-Ahsa',
            'Yanbu', 'Taif', 'Arar', 'Sakaka', 'Al-Baha'
        ])
        .withMessage('Invalid city selection'),

    body('address.province')
        .isIn([
            'Riyadh Province', 'Makkah Province', 'Madinah Province',
            'Eastern Province', 'Asir Province', 'Tabuk Province',
            'Qassim Province', 'Ha\'il Province', 'Jazan Province',
            'Najran Province', 'Al-Baha Province', 'Northern Borders Province',
            'Al-Jawf Province'
        ])
        .withMessage('Invalid province selection'),

    body('address.postalCode')
        .trim()
        .matches(/^[0-9]{5}$/)
        .withMessage('Postal code must be 5 digits'),

    body('industry')
        .isIn([
            'Technology', 'Healthcare', 'Education', 'Construction',
            'Manufacturing', 'Retail', 'Finance', 'Real Estate',
            'Transportation', 'Food & Beverage', 'Tourism',
            'Agriculture', 'Energy', 'Consulting', 'Other'
        ])
        .withMessage('Invalid industry selection'),

    body('establishedDate')
        .isISO8601()
        .toDate()
        .custom((value) => {
            if (new Date(value) > new Date()) {
                throw new Error('Established date cannot be in the future');
            }
            return true;
        }),

    body('employeeCount')
        .optional()
        .isIn(['1-10', '11-50', '51-200', '201-500', '500+'])
        .withMessage('Invalid employee count range'),

    body('currency')
        .optional()
        .isIn(['SAR', 'USD', 'EUR'])
        .withMessage('Invalid currency'),

    body('fiscalYearEnd')
        .optional()
        .isIn([
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ])
        .withMessage('Invalid fiscal year end month'),

    body('businessDescription')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Business description cannot exceed 1000 characters'),

    body('settings.invoiceNumberPrefix')
        .optional()
        .trim()
        .isLength({ max: 5 })
        .withMessage('Invoice prefix cannot exceed 5 characters'),

    body('settings.invoiceNumberStartFrom')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invoice start number must be at least 1'),

    body('settings.defaultDueDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Default due days must be between 1 and 365'),

    body('settings.termsAndConditions')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Terms and conditions cannot exceed 2000 characters'),

    body('zakatEligible')
        .optional()
        .isBoolean()
        .withMessage('Zakat eligible must be true or false'),

    body('vatRegistered')
        .optional()
        .isBoolean()
        .withMessage('VAT registered must be true or false'),

    body('vatRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('VAT rate must be between 0 and 100'),

    handleValidationErrors
];

// Document upload validation
const validateDocumentUpload = [
    body('documentType')
        .isIn([
            'commercial_registration',
            'tax_certificate',
            'vat_certificate',
            'bank_certificate',
            'authorized_signatory',
            'company_profile',
            'other'
        ])
        .withMessage('Invalid document type'),

    body('documentName')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Document name is required and must not exceed 200 characters'),

    body('documentUrl')
        .trim()
        .isURL()
        .withMessage('Document URL must be a valid URL'),

    handleValidationErrors
];

// Bank account validation (if not already exists)
const validateBankAccount = [
    body('accountName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Account name must be between 2 and 100 characters'),

    body('accountNumber')
        .trim()
        .matches(/^[0-9]{10,20}$/)
        .withMessage('Account number must be between 10-20 digits'),

    body('iban')
        .trim()
        .matches(/^SA[0-9]{22}$/)
        .withMessage('IBAN must be valid Saudi format (SA followed by 22 digits)'),

    body('bankName')
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
        .trim()
        .matches(/^[0-9]{2,3}$/)
        .withMessage('Bank code must be 2-3 digits'),

    body('branchName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Branch name cannot exceed 100 characters'),

    body('branchCode')
        .optional()
        .trim()
        .matches(/^[0-9]{3,4}$/)
        .withMessage('Branch code must be 3-4 digits'),

    body('currency')
        .isIn(['SAR', 'USD', 'EUR', 'AED'])
        .withMessage('Invalid currency'),

    body('accountType')
        .isIn(['checking', 'savings', 'business', 'investment'])
        .withMessage('Invalid account type'),

    handleValidationErrors
];

// Status update validation
const validateStatusUpdate = [
    body('status')
        .optional()
        .isIn(['draft', 'pending_verification', 'verified', 'suspended'])
        .withMessage('Invalid status'),

    body('verificationStatus')
        .optional()
        .isIn(['pending', 'verified', 'rejected'])
        .withMessage('Invalid verification status'),

    handleValidationErrors
];

// Batch update validation
const validateBatchUpdate = [
    body('companyIds')
        .isArray({ min: 1 })
        .withMessage('Company IDs must be a non-empty array'),

    body('companyIds.*')
        .isMongoId()
        .withMessage('Each company ID must be a valid MongoDB ObjectId'),

    body('updates')
        .isObject()
        .withMessage('Updates must be an object'),

    body('updates.status')
        .optional()
        .isIn(['draft', 'pending_verification', 'verified', 'suspended'])
        .withMessage('Invalid status'),

    body('updates.verificationStatus')
        .optional()
        .isIn(['pending', 'verified', 'rejected'])
        .withMessage('Invalid verification status'),

    handleValidationErrors
];

module.exports = {
    validateCompany,
    validateDocumentUpload,
    validateBankAccount,
    validateStatusUpdate,
    validateBatchUpdate,
    handleValidationErrors
};