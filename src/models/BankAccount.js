// src/models/BankAccount.js
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: false,
        index: true
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
        maxlength: [100, 'Account name cannot exceed 100 characters']
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{10,20}$/.test(v);
            },
            message: 'Account number must be between 10-20 digits'
        }
    },
    iban: {
        type: String,
        required: [true, 'IBAN is required'],
        trim: true,
        uppercase: true,
        validate: {
            validator: function(v) {
                // Basic IBAN validation for Saudi Arabia
                return /^SA[0-9]{22}$/.test(v.replace(/\s/g, ''));
            },
            message: 'Invalid IBAN format. Saudi IBAN should be SA followed by 22 digits'
        }
    },
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
        enum: [
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
        ]
    },
    bankCode: {
        type: String,
        required: [true, 'Bank code is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{2,3}$/.test(v);
            },
            message: 'Bank code must be 2-3 digits'
        }
    },
    branchName: {
        type: String,
        trim: true,
        maxlength: [100, 'Branch name cannot exceed 100 characters']
    },
    branchCode: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[0-9]{3,4}$/.test(v);
            },
            message: 'Branch code must be 3-4 digits'
        }
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        enum: ['SAR', 'USD', 'EUR', 'AED'],
        default: 'SAR'
    },
    accountType: {
        type: String,
        required: [true, 'Account type is required'],
        enum: ['checking', 'savings', 'business', 'investment'],
        default: 'business'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'suspended'],
        default: 'pending'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    lastTransaction: {
        type: Date,
        default: null
    },
    verificationStatus: {
        type: String,
        enum: ['verified', 'pending', 'failed'],
        default: 'pending'
    },
    verificationDocuments: [{
        documentType: {
            type: String,
            enum: ['bank_statement', 'account_certificate', 'iban_certificate']
        },
        documentUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        swiftCode: String,
        routingNumber: String,
        correspondentBank: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
bankAccountSchema.index({ userId: 1, isDefault: 1 });
bankAccountSchema.index({ userId: 1, status: 1 });
// Account number should be unique per user (same account number can exist for different users)
bankAccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });
// IBAN is globally unique (international banking standard)
bankAccountSchema.index({ iban: 1 }, { unique: true });

// Ensure only one default account per user
bankAccountSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Virtual for masked account number
bankAccountSchema.virtual('maskedAccountNumber').get(function() {
    if (!this.accountNumber) return '';
    const num = this.accountNumber;
    return num.slice(0, 4) + '*'.repeat(num.length - 8) + num.slice(-4);
});

// Method to get bank details by bank name
bankAccountSchema.statics.getBankCode = function(bankName) {
    const bankCodes = {
        'Saudi National Bank': '10',
        'Al Rajhi Bank': '80',
        'Riyad Bank': '20',
        'Banque Saudi Fransi': '55',
        'Saudi British Bank (SABB)': '45',
        'Arab National Bank': '05',
        'Bank AlJazira': '65',
        'Alinma Bank': '71',
        'Bank Albilad': '15',
        'Saudi Investment Bank': '30'
    };
    return bankCodes[bankName] || null;
};

// Method to validate IBAN checksum (basic implementation)
bankAccountSchema.methods.validateIBAN = function() {
    const iban = this.iban.replace(/\s/g, '');
    if (iban.length !== 24 || !iban.startsWith('SA')) {
        return false;
    }

    // Move first 4 characters to end and replace letters with numbers
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, char => (char.charCodeAt(0) - 55).toString());

    // Calculate mod 97
    let remainder = '';
    for (let i = 0; i < numeric.length; i += 7) {
        remainder = (remainder + numeric.slice(i, i + 7)) % 97;
    }

    return remainder === 1;
};

// Pre-save middleware to validate IBAN
bankAccountSchema.pre('save', function(next) {
    if (this.isModified('iban') && !this.validateIBAN()) {
        return next(new Error('Invalid IBAN checksum'));
    }
    next();
});

module.exports = mongoose.model('BankAccount', bankAccountSchema);