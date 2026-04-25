// src/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    // System fields
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

    // Basic Information
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    customerType: {
        type: String,
        default: 'company'
    },
    commercialRegistrationNumber: {
        type: String,
        trim: true,
        sparse: true
    },
    industry: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Website must be a valid URL'
        }
    },
    customerGroup: {
        type: String,
        default: 'Regular'
    },

    // Contact Information
    contactInfo: {
        email: {
            type: String,
            trim: true,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
                },
                message: 'Invalid email format'
            }
        },
        phone: {
            type: String,
            trim: true
        },
        contactPerson: {
            type: String,
            trim: true
        }
    },

    // Address Information
    address: {
        street: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        postalCode: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            default: 'SA'
        },
        buildingNumber: {
            type: String,
            trim: true
        },
        district: {
            type: String,
            trim: true
        },
        addressAdditionalNumber: {
            type: String,
            trim: true
        }
    },

    // Compliance Information
    complianceInfo: {
        taxId: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    return !v || /^[0-9]{15}$/.test(v);
                },
                message: 'Tax ID must be 15 digits'
            }
        },
        businessLicense: {
            type: String,
            trim: true
        },
        sanctionScreened: {
            type: Boolean,
            default: false
        },
        screenedAt: {
            type: Date
        },
        riskRating: {
            type: String,
            default: 'medium'
        }
    },

    // Banking Information
    bankInfo: {
        bankName: {
            type: String,
            trim: true,
            default: 'Not specified'
        },
        accountNumber: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    return !v || v === '' || /^[0-9]{10,20}$/.test(v);
                },
                message: 'Account number must be between 10-20 digits'
            }
        },
        iban: {
            type: String,
            trim: true,
            uppercase: true,
            validate: {
                validator: function(v) {
                    if (!v || v === '') return true;
                    const cleanIban = v.replace(/\s/g, '');
                    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(cleanIban);
                },
                message: 'Invalid IBAN format'
            }
        },
        swiftCode: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    return !v || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
                },
                message: 'Invalid SWIFT code format'
            }
        },
        currency: {
            type: String,
            default: 'SAR'
        }
    },

    // Payment Limits
    paymentLimits: {
        dailyLimit: {
            type: Number,
            default: 100000,
            min: 0
        },
        monthlyLimit: {
            type: Number,
            default: 1000000,
            min: 0
        },
        perTransactionLimit: {
            type: Number,
            default: 50000,
            min: 0
        }
    },

    // Status Information
    status: {
        type: String,
        default: 'pending'
    },
    verificationStatus: {
        type: String,
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // Additional Information
    tags: [{
        type: String,
        trim: true
    }],
    referenceNumber: {
        type: String,
        trim: true,
        sparse: true
    },
    source: {
        type: String,
        default: 'Other'
    },
    assignedTo: {
        type: String,
        trim: true
    },
    priority: {
        type: String,
        default: 'Normal'
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },

    // Payment Methods (for future use)
    paymentMethods: [{
        method: {
            type: String
        },
        isPreferred: {
            type: Boolean,
            default: false
        },
        metadata: mongoose.Schema.Types.Mixed
    }],

    // Financial tracking
    lastPaymentDate: Date,
    totalPaymentsReceived: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Soft Delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
customerSchema.index({ userId: 1, status: 1 });
customerSchema.index({ userId: 1, isActive: 1 });
customerSchema.index({ 'bankInfo.accountNumber': 1, 'bankInfo.bankName': 1 });
customerSchema.index({ 'bankInfo.iban': 1 });
customerSchema.index({ customerName: 1 });
customerSchema.index({ 'contactInfo.email': 1 });
customerSchema.index({ userId: 1, customerName: 1 });
customerSchema.index({ 'complianceInfo.taxId': 1 });

// Virtual for masked account number
customerSchema.virtual('maskedAccountNumber').get(function() {
    const accountNumber = this.bankInfo?.accountNumber;
    if (!accountNumber) return '';
    return accountNumber.slice(0, 4) + '*'.repeat(accountNumber.length - 8) + accountNumber.slice(-4);
});

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    if (!addr) return '';
    return [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
        .filter(Boolean)
        .join(', ');
});

// Method to validate IBAN based on country
customerSchema.methods.validateIBAN = function() {
    const iban = this.bankInfo?.iban;
    if (!iban || iban === '') return true;

    const cleanIban = iban.replace(/\s/g, '');
    const countryCode = cleanIban.slice(0, 2);

    const ibanLengths = {
        'SA': 24, 'AE': 23, 'KW': 30, 'QA': 29,
        'BH': 22, 'OM': 23, 'US': 0, 'GB': 22, 'DE': 22
    };

    const expectedLength = ibanLengths[countryCode];
    if (!expectedLength || cleanIban.length !== expectedLength) {
        return false;
    }

    // Basic checksum validation for IBAN
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, char => (char.charCodeAt(0) - 55).toString());

    let remainder = '';
    for (let i = 0; i < numeric.length; i += 7) {
        remainder = (remainder + numeric.slice(i, i + 7)) % 97;
    }

    return remainder === 1;
};

// Pre-save middleware
customerSchema.pre('save', async function(next) {
    // Handle payment limits - convert string to number if needed
    if (this.paymentLimits) {
        if (typeof this.paymentLimits.dailyLimit === 'string') {
            this.paymentLimits.dailyLimit = parseFloat(this.paymentLimits.dailyLimit) || 0;
        }
        if (typeof this.paymentLimits.monthlyLimit === 'string') {
            this.paymentLimits.monthlyLimit = parseFloat(this.paymentLimits.monthlyLimit) || 0;
        }
        if (typeof this.paymentLimits.perTransactionLimit === 'string') {
            this.paymentLimits.perTransactionLimit = parseFloat(this.paymentLimits.perTransactionLimit) || 0;
        }
    }

    // Validate IBAN
    if (this.isModified('bankInfo.iban') && !this.validateIBAN()) {
        return next(new Error('Invalid IBAN checksum'));
    }

    // Set address country based on main country if not explicitly set
    if (this.address && !this.address.country && this.address.country !== this.country) {
        this.address.country = this.address.country || 'SA';
    }

    // Auto-generate reference number if not provided
    if (!this.referenceNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        this.referenceNumber = `CUST-${timestamp}-${random}`.toUpperCase();
    }

    next();
});

// Method to check if customer can receive payment
customerSchema.methods.canReceivePayment = function(amount) {
    if (!this.isActive || this.status !== 'active' || this.verificationStatus !== 'verified') {
        return false;
    }

    if (amount > this.paymentLimits.perTransactionLimit) {
        return false;
    }

    return true;
};

// Method to record payment
customerSchema.methods.recordPayment = async function(amount) {
    this.lastPaymentDate = new Date();
    this.totalPaymentsReceived += amount;
    this.paymentCount += 1;
    await this.save();
};

module.exports = mongoose.model('Customer', customerSchema);