// src/models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Basic Company Information
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    companyNameAr: {
        type: String,
        trim: true,
        maxlength: [200, 'Arabic company name cannot exceed 200 characters']
    },
    legalForm: {
        type: String,
        required: [true, 'Legal form is required'],
    },

    // Registration Details
    commercialRegistrationNumber: {
        type: String,
        required: [true, 'Commercial registration number is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[0-9]{10}$/.test(v);
            },
            message: 'Commercial registration number must be 10 digits'
        }
    },
    taxIdNumber: {
        type: String,
        required: [true, 'Tax ID number is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^3[0-9]{14}$/.test(v);
            },
            message: 'Tax ID must start with 3 and be 15 digits'
        }
    },
    vatNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^3[0-9]{14}$/.test(v);
            },
            message: 'VAT number must start with 3 and be 15 digits'
        }
    },

    // Contact Information
    email: {
        type: String,
        required: [true, 'Company email is required'],
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return /^(\+966|0)?[5][0-9]{8}$/.test(v.replace(/\s/g, ''));
            },
            message: 'Please enter a valid Saudi phone number'
        }
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

    // Address Information
    address: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        district: {
            type: String,
            required: [true, 'District is required'],
            trim: true,
            maxlength: [100, 'District cannot exceed 100 characters']
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
            enum: [
                'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar',
                'Dhahran', 'Jubail', 'Tabuk', 'Abha', 'Khamis Mushait',
                'Hail', 'Buraidah', 'Qassim', 'Jazan', 'Najran', 'Al-Ahsa',
                'Yanbu', 'Taif', 'Arar', 'Sakaka', 'Al-Baha'
            ]
        },
        province: {
            type: String,
            required: [true, 'Province is required'],
            trim: true,
            enum: [
                'Riyadh Province', 'Makkah Province', 'Madinah Province',
                'Eastern Province', 'Asir Province', 'Tabuk Province',
                'Qassim Province', 'Ha\'il Province', 'Jazan Province',
                'Najran Province', 'Al-Baha Province', 'Northern Borders Province',
                'Al-Jawf Province'
            ]
        },
        postalCode: {
            type: String,
            required: [true, 'Postal code is required'],
            trim: true,
            validate: {
                validator: function(v) {
                    return /^[0-9]{5}$/.test(v);
                },
                message: 'Postal code must be 5 digits'
            }
        },
        country: {
            type: String,
            default: 'Saudi Arabia',
            enum: ['Saudi Arabia']
        }
    },

    // Business Details
    industry: {
        type: String,
        required: [true, 'Industry is required'],
        enum: [
            'Technology', 'Healthcare', 'Education', 'Construction',
            'Manufacturing', 'Retail', 'Finance', 'Real Estate',
            'Transportation', 'Tourism', 'Agriculture', 'Energy',
            'Consulting', 'Other'
        ]
    },
    businessDescription: {
        type: String,
        trim: true,
        maxlength: [1000, 'Business description cannot exceed 1000 characters']
    },
    establishedDate: {
        type: Date,
        required: [true, 'Establishment date is required']
    },
    employeeCount: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
        default: '1-10'
    },

    // Financial Information
    currency: {
        type: String,
        enum: ['SAR', 'USD', 'EUR'],
        default: 'SAR'
    },
    fiscalYearEnd: {
        type: String,
        enum: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        default: 'December'
    },

    // Status and Verification
    status: {
        type: String,
        enum: ['draft', 'pending_verification', 'verified', 'suspended'],
        default: 'draft'
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },

    // Documents
    documents: [{
        documentType: {
            type: String,
            enum: [
                'commercial_registration',
                'tax_certificate',
                'vat_certificate',
                'bank_certificate',
                'authorized_signatory',
                'company_profile',
                'other'
            ]
        },
        documentName: String,
        documentUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        }
    }],

    // Settings
    settings: {
        invoiceNumberPrefix: {
            type: String,
            default: 'INV',
            maxlength: [5, 'Invoice prefix cannot exceed 5 characters']
        },
        invoiceNumberStartFrom: {
            type: Number,
            default: 1,
            min: 1
        },
        defaultDueDays: {
            type: Number,
            default: 30,
            min: 1,
            max: 365
        },
        logoUrl: String,
        signature: String,
        termsAndConditions: {
            type: String,
            maxlength: [2000, 'Terms and conditions cannot exceed 2000 characters']
        },
        // Default theme gradient for all users under this company
        defaultGradientFrom: {
            type: String,
            default: '#1b1b7f'
        },
        defaultGradientTo: {
            type: String,
            default: '#4f46e5'
        }
    },

    // Compliance
    zakatEligible: {
        type: Boolean,
        default: false
    },
    vatRegistered: {
        type: Boolean,
        default: false
    },
    vatRate: {
        type: Number,
        default: 15,
        min: 0,
        max: 100
    },

    // ZATCA E-Invoicing Credentials - Multi-Environment Structure with Separate B2B/B2C
    zatcaCredentials: {
        // Current active environment for invoicing
        activeEnvironment: {
            type: String,
            enum: ['sandbox', 'simulation', 'production', null],
            default: null
        },

        // Current business type being onboarded (for tracking active flow)
        currentBusinessType: {
            type: String,
            enum: ['B2B', 'B2C', null],
            default: null
        },

        // Onboarding phase selection (Phase 1 = Generation, Phase 2 = Integration)
        onboardingPhase: {
            type: String,
            enum: ['phase1_generation', 'phase2_integration'],
            default: 'phase1_generation'
        },

        // Onboarding form details
        onboardingDetails: {
            sellerName: String,
            sellerNumber: String,
            totalAmount: Number,
            buyerDetails: {
                name: String,
                vatNumber: String,
                address: String
            },
            submittedAt: Date
        },

        // TLU (Token Lifecycle Unit) data
        tluData: {
            token: String,
            base64Encoded: String,
            tokenId: String,
            generatedAt: Date,
            expiresAt: Date,
            environment: {
                type: String,
                enum: ['sandbox', 'simulation', 'production']
            },
            attachedToAPI: {
                type: Boolean,
                default: false
            },
            attachedAt: Date
        },

        // Configuration keys for onboarding
        configurationKeys: [{
            keyId: {
                type: String,
                required: true
            },
            keyType: {
                type: String,
                enum: ['signing', 'encryption', 'authentication'],
                default: 'signing'
            },
            keyName: String,
            isActive: {
                type: Boolean,
                default: false
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            activatedAt: Date,
            expiresAt: Date
        }],

        // OTP verification data
        otpVerification: {
            phoneNumber: String,
            verified: {
                type: Boolean,
                default: false
            },
            verifiedAt: Date,
            attemptsCount: {
                type: Number,
                default: 0
            },
            cooldownUntil: Date
        },

        // API verification status
        apiVerificationStatus: {
            type: String,
            enum: ['not_verified', 'pending', 'verified', 'failed'],
            default: 'not_verified'
        },
        apiVerifiedAt: Date,
        lastAPICheckAt: Date,

        // Environment progression tracking (per business type)
        progression: {
            // B2B completed environments
            b2bCompletedEnvironments: [{
                type: String,
                enum: ['sandbox', 'simulation', 'production']
            }],
            // B2C completed environments
            b2cCompletedEnvironments: [{
                type: String,
                enum: ['sandbox', 'simulation', 'production']
            }],
            skippedEnvironments: [{
                type: String,
                enum: ['sandbox', 'simulation']
            }],
            // B2B production lock
            b2bProductionLocked: {
                type: Boolean,
                default: false
            },
            b2bProductionLockedAt: Date,
            // B2C production lock
            b2cProductionLocked: {
                type: Boolean,
                default: false
            },
            b2cProductionLockedAt: Date
        },

        // Per-environment credentials with nested B2B/B2C sub-objects
        // Structure: environments.sandbox.b2b, environments.sandbox.b2c, etc.
        environments: {
            sandbox: {
                // B2B (Standard Invoice - 0100000) credentials
                b2b: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                },
                // B2C (Simplified Invoice - 0200000) credentials
                b2c: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                }
            },
            simulation: {
                // B2B (Standard Invoice - 0100000) credentials
                b2b: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                },
                // B2C (Simplified Invoice - 0200000) credentials
                b2c: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                }
            },
            production: {
                // B2B (Standard Invoice - 0100000) credentials
                b2b: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                },
                // B2C (Simplified Invoice - 0200000) credentials
                b2c: {
                    status: {
                        type: String,
                        enum: ['not_started', 'csr_generated', 'compliance', 'test_invoices_submitted', 'verified'],
                        default: 'not_started'
                    },
                    csr: String,
                    privateKey: String,
                    complianceCertificate: String,
                    complianceSecret: String,
                    complianceRequestId: String,
                    productionCSID: String,
                    productionSecret: String,
                    onboardedAt: Date,
                    createdAt: Date,
                    updatedAt: Date,
                    hashChainCounter: { type: Number, default: 0, min: 0 },
                    previousInvoiceHash: { type: String, default: null }
                }
            }
        },

        // Onboarding history for audit trail
        history: [{
            environment: {
                type: String,
                enum: ['sandbox', 'simulation', 'production', 'all']
            },
            action: {
                type: String,
                enum: ['csr_generated', 'compliance_obtained', 'test_invoices_submitted', 'production_csid_obtained', 'environment_skipped', 'environment_activated', 'migrated_from_legacy', 'onboarding_reset', 'business_type_enabled', 'b2b_csr_generated', 'b2b_compliance_obtained', 'b2b_test_invoices_submitted', 'b2b_production_csid_obtained', 'b2c_csr_generated', 'b2c_compliance_obtained', 'b2c_test_invoices_submitted', 'b2c_production_csid_obtained']
            },
            businessType: {
                type: String,
                enum: ['B2B', 'B2C', null]
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            metadata: {
                type: mongoose.Schema.Types.Mixed
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
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
// Note: userId already has index: true in schema definition
// Note: commercialRegistrationNumber and taxIdNumber already have unique: true (creates index)
companySchema.index({ email: 1 });
companySchema.index({ status: 1 });
companySchema.index({ verificationStatus: 1 });

// Ensure only one active company per user (if needed)
companySchema.index({ userId: 1, isActive: 1 });
companySchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default company per user
companySchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Virtual for full company name
companySchema.virtual('fullCompanyName').get(function() {
    if (this.companyNameAr) {
        return `${this.companyName} (${this.companyNameAr})`;
    }
    return this.companyName;
});

// Virtual for full address
companySchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    return `${addr.street}, ${addr.district}, ${addr.city}, ${addr.province}, ${addr.postalCode}, ${addr.country}`;
});

// Method to check if company is ready for invoice generation
companySchema.methods.isReadyForInvoicing = function() {
    // Company must be active
    if (!this.isActive) {
        return false;
    }

    // Phase 1 companies can create invoices locally (no ZATCA verification needed)
    if (this.zatcaCredentials?.onboardingPhase === 'phase1_generation') {
        // Phase 1 just needs to have current business type set
        return this.zatcaCredentials?.currentBusinessType != null;
    }

    // Phase 2 companies need full ZATCA verification
    if (this.zatcaCredentials?.onboardingPhase === 'phase2_integration') {
        // Check if any environment has B2B or B2C verified status
        const envs = this.zatcaCredentials?.environments;
        if (envs) {
            const hasVerifiedEnv = Object.values(envs).some(env => {
                const b2bVerified = env?.b2b?.status === 'verified' || env?.b2b?.productionCSID;
                const b2cVerified = env?.b2c?.status === 'verified' || env?.b2c?.productionCSID;
                return b2bVerified || b2cVerified;
            });
            if (hasVerifiedEnv) {
                return true;
            }
        }
        return false;
    }

    // Default: require active environment
    return this.zatcaCredentials?.activeEnvironment != null;
};

// Method to get next invoice number
companySchema.methods.getNextInvoiceNumber = function() {
    const prefix = this.settings.invoiceNumberPrefix || 'INV';
    const startFrom = this.settings.invoiceNumberStartFrom || 1;
    // This would need to be implemented with invoice counting logic
    return `${prefix}-${String(startFrom).padStart(6, '0')}`;
};

// Static method to find company by registration number
companySchema.statics.findByRegistrationNumber = function(regNumber) {
    return this.findOne({ commercialRegistrationNumber: regNumber });
};

// Static method to find company by tax ID
companySchema.statics.findByTaxId = function(taxId) {
    return this.findOne({ taxIdNumber: taxId });
};

// Pre-save middleware to format phone number
companySchema.pre('save', function(next) {
    if (this.isModified('phone')) {
        // Remove spaces and ensure Saudi format
        let phone = this.phone.replace(/\s/g, '');
        if (phone.startsWith('05')) {
            phone = '+966' + phone.substring(1);
        } else if (phone.startsWith('5')) {
            phone = '+966' + phone;
        }
        this.phone = phone;
    }
    next();
});

// Pre-save middleware to uppercase certain fields
companySchema.pre('save', function(next) {
    if (this.isModified('commercialRegistrationNumber')) {
        this.commercialRegistrationNumber = this.commercialRegistrationNumber.toUpperCase();
    }
    if (this.isModified('taxIdNumber')) {
        this.taxIdNumber = this.taxIdNumber.toUpperCase();
    }
    if (this.isModified('vatNumber') && this.vatNumber) {
        this.vatNumber = this.vatNumber.toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Company', companySchema);