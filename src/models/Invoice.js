const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },

    // Invoice Details
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    invoiceType: {
        type: String,
        enum: ['standard', 'simplified', 'credit_note', 'debit_note'],
        default: 'standard',
        required: true
    },
    // ZATCA Invoice Type Code
    // SI = Simplified Tax Invoice (B2C)
    // CI = Tax Invoice (B2B)
    // SP = Simplified Prepayment (B2C)
    // CP = Prepayment (B2B)
    // SD = Simplified Debit Note (B2C)
    // CD = Tax Debit Note (B2B)
    // SN = Simplified Credit Note (B2C)
    // CN = Tax Credit Note (B2B)
    zatcaInvoiceTypeCode: {
        type: String,
        enum: ['SI', 'CI', 'SP', 'CP', 'SD', 'CD', 'SN', 'CN'],
        required: false // Optional for backward compatibility
    },
    invoiceDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    currency: {
        type: String,
        enum: ['SAR', 'USD', 'EUR', 'AED'],
        default: 'SAR'
    },
    paymentTerms: {
        type: String,
        default: '30'
    },

    // Customer Information (reference only - retrieve details from Customer model)
    customerInfo: {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        }
    },

    // Invoice Items
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            index: true,
            required: false // Optional - for linking to product catalog
        },
        description: {
            type: String,
            required: true // Required - manual or from product
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 15,
            min: 0,
            max: 100
        },
        taxAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        // ZATCA VAT Category Code
        // S = Standard Rate (15%)
        // Z = Zero Rate (0%)
        // E = Exempt (0%)
        // O = Not Subject to VAT (0%)
        vatCategoryCode: {
            type: String,
            enum: ['S', 'Z', 'E', 'O'],
            default: 'S'
        },
        // Tax Exemption Reason Code (required for Z, E, O categories)
        taxExemptionReasonCode: {
            type: String,
            required: false
        },
        // Tax Exemption Reason Text
        taxExemptionReasonText: {
            type: String,
            required: false
        }
    }],

    // Financial Summary
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    totalTax: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },

    // Status
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'refunded'],
        default: 'unpaid'
    },

    // Payment Details
    payments: [{
        amount: Number,
        date: Date,
        method: String,
        reference: String,
        notes: String
    }],
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    remainingAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Additional Information
    notes: String,
    termsAndConditions: String,

    // Compliance
    isVatApplicable: {
        type: Boolean,
        default: true
    },
    vatRegistration: String,

    // ZATCA E-Invoicing Integration
    zatca: {
        status: {
            type: String,
            enum: ['pending', 'cleared', 'reported', 'rejected'],
            default: 'pending'
        },
        uuid: String,              // ZATCA Invoice UUID
        hash: String,              // Invoice Hash from ZATCA
        qrCode: String,            // QR Code data for invoice
        signedXML: String,         // Signed XML content (base64)
        pdfUrl: String,            // PDF/A-3 file URL
        clearedAt: Date,           // When ZATCA cleared/reported
        reportedAt: Date,          // When reported to ZATCA
        errors: [String],          // ZATCA validation errors
        warnings: [String],        // ZATCA warnings
        validationStatus: {        // Validation status before submission
            type: String,
            enum: ['pending', 'valid', 'invalid'],
            default: 'pending'
        },
        lastValidatedAt: Date,      // When last validated

        // Hash Chain Tracking
        hashChainNumber: {
            type: Number,
            default: null
        },
        previousInvoiceHash: {
            type: String,
            default: null
        },
        // Invoice Category for separate hash chain sequences
        invoiceCategory: {
            type: String,
            enum: ['B2B', 'B2C'],
            default: null
        }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: Date,
    viewedAt: Date,
    paidAt: Date,

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
// Note: userId, companyId, customerId already have index: true in schema definition
// Note: invoiceNumber already has unique: true (creates index)
invoiceSchema.index({ userId: 1, status: 1 }); // Compound index for common query
invoiceSchema.index({ companyId: 1, invoiceDate: -1 }); // Compound index
invoiceSchema.index({ customerId: 1, status: 1 }); // Compound index
invoiceSchema.index({ dueDate: 1, paymentStatus: 1 });
invoiceSchema.index({ createdAt: -1 });

// Virtual for formatted invoice number
invoiceSchema.virtual('formattedInvoiceNumber').get(function() {
    return this.invoiceNumber;
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
    if (this.paymentStatus === 'paid' || this.status === 'paid') {
        return 0;
    }
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual for invoice age
invoiceSchema.virtual('invoiceAge').get(function() {
    const today = new Date();
    const invoiceDate = new Date(this.invoiceDate);
    const diffTime = today - invoiceDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
    // Calculate subtotal and tax
    let subtotal = 0;
    let totalTax = 0;

    this.items.forEach(item => {
        const itemTotal = item.quantity * item.unitPrice;
        item.totalPrice = itemTotal;

        if (this.isVatApplicable) {
            const taxAmount = (itemTotal * item.taxRate) / 100;
            item.taxAmount = taxAmount;
            totalTax += taxAmount;
        } else {
            item.taxAmount = 0;
        }

        subtotal += itemTotal;
    });

    this.subtotal = subtotal;
    this.totalTax = totalTax;

    // Apply discount
    let discountAmount = 0;
    if (this.discount > 0) {
        if (this.discountType === 'percentage') {
            discountAmount = (subtotal * this.discount) / 100;
        } else {
            discountAmount = this.discount;
        }
    }

    // Calculate final total
    this.total = subtotal + totalTax - discountAmount;
    this.remainingAmount = this.total - this.paidAmount;

    // Update status based on payment
    if (this.paidAmount >= this.total) {
        this.paymentStatus = 'paid';
        if (this.status !== 'cancelled') {
            this.status = 'paid';
        }
        this.paidAt = this.paidAt || new Date();
    } else if (this.paidAmount > 0) {
        this.paymentStatus = 'partial';
    } else {
        this.paymentStatus = 'unpaid';

        // Check if overdue
        if (this.dueDate < new Date() && this.status !== 'paid' && this.status !== 'cancelled') {
            this.status = 'overdue';
        }
    }

    next();
});

// Static method to generate next invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(companyId) {
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);

    if (!company) {
        throw new Error('Company not found');
    }

    const prefix = company.settings?.invoiceNumberPrefix || 'INV';
    const currentYear = new Date().getFullYear();

    // Find the last invoice for this company with the highest invoice number
    // Sort by invoiceNumber descending to get the highest number (zero-padding ensures correct string sorting)
    const lastInvoice = await this.findOne({
        companyId: companyId,
        invoiceNumber: { $regex: `^${prefix}-${currentYear}-\\d{6}$` }
    }).sort({ invoiceNumber: -1 });

    let nextNumber = 1;
    if (lastInvoice) {
        // Extract the numeric part from the invoice number
        const parts = lastInvoice.invoiceNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    return `${prefix}-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
};

// Method to add payment
invoiceSchema.methods.addPayment = function(paymentData) {
    this.payments.push({
        amount: paymentData.amount,
        date: paymentData.date || new Date(),
        method: paymentData.method,
        reference: paymentData.reference,
        notes: paymentData.notes
    });

    this.paidAmount += paymentData.amount;
    return this.save();
};

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
    return this.dueDate < new Date() && this.paymentStatus !== 'paid';
};

// Method to mark as sent
invoiceSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    return this.save();
};

// Method to mark as viewed
invoiceSchema.methods.markAsViewed = function() {
    if (this.status === 'sent') {
        this.status = 'viewed';
    }
    this.viewedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Invoice', invoiceSchema);