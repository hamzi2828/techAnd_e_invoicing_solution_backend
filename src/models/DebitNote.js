const mongoose = require('mongoose');

const debitNoteSchema = new mongoose.Schema({
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

    // Debit Note Details
    debitNoteNumber: {
        type: String,
        required: true,
        unique: true
    },
    debitNoteType: {
        type: String,
        enum: ['standard', 'simplified'], // B2B or B2C
        default: 'standard',
        required: true
    },
    // ZATCA Debit Note Type Code
    // SD = Simplified Debit Note (B2C)
    // CD = Tax Debit Note (B2B)
    zatcaDebitNoteTypeCode: {
        type: String,
        enum: ['SD', 'CD'],
        required: false // Optional for backward compatibility
    },
    issueDate: {
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
        default: 'Net 30'
    },

    // Reference to Original Invoice (REQUIRED for ZATCA compliance)
    originalInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Original invoice reference is required for debit notes'],
        index: true
    },
    originalInvoiceNumber: {
        type: String,
        required: [true, 'Original invoice number is required']
    },
    // Phase 2 ZATCA Requirements - UUID and Hash of original invoice
    originalInvoiceUUID: {
        type: String,
        // Required for Phase 2, will be populated from original invoice's zatca.uuid
    },
    originalInvoiceHash: {
        type: String,
        // Required for Phase 2, will be populated from original invoice's zatca.hash
    },

    // Reason for Debit Note
    reason: {
        type: String,
        enum: ['additional_charge', 'price_adjustment', 'correction', 'service_fee', 'other'],
        required: true
    },
    reasonDescription: {
        type: String
    },

    // Customer Information (reference only)
    customerInfo: {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        }
    },

    // Debit Note Items
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            index: true
        },
        description: {
            type: String,
            required: true
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
        enum: ['unpaid', 'partial', 'paid'],
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
        validationStatus: {
            type: String,
            enum: ['valid', 'invalid']
        },
        lastValidatedAt: Date,
        uuid: String,
        hash: String,
        qrCode: String,
        signedXML: String,
        pdfUrl: String,
        clearedAt: Date,
        reportedAt: Date,
        errors: [String],
        warnings: [String]
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
debitNoteSchema.index({ userId: 1, status: 1 });
debitNoteSchema.index({ companyId: 1, issueDate: -1 });
debitNoteSchema.index({ customerId: 1, status: 1 });
debitNoteSchema.index({ dueDate: 1, paymentStatus: 1 });
debitNoteSchema.index({ createdAt: -1 });

// Virtual for formatted debit note number
debitNoteSchema.virtual('formattedDebitNoteNumber').get(function() {
    return this.debitNoteNumber;
});

// Virtual for days overdue
debitNoteSchema.virtual('daysOverdue').get(function() {
    if (this.paymentStatus === 'paid' || this.status === 'paid') {
        return 0;
    }
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual for debit note age
debitNoteSchema.virtual('debitNoteAge').get(function() {
    const today = new Date();
    const issueDate = new Date(this.issueDate);
    const diffTime = today - issueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
debitNoteSchema.pre('save', function(next) {
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

// Static method to generate next debit note number
debitNoteSchema.statics.generateDebitNoteNumber = async function(companyId) {
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);

    if (!company) {
        throw new Error('Company not found');
    }

    const prefix = 'DN';
    const currentYear = new Date().getFullYear();

    // Find the last debit note for this company
    const lastDebitNote = await this.findOne({
        companyId: companyId,
        debitNoteNumber: { $regex: `^${prefix}-${currentYear}-\\d{6}$` }
    }).sort({ debitNoteNumber: -1 });

    let nextNumber = 1;
    if (lastDebitNote) {
        const parts = lastDebitNote.debitNoteNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    return `${prefix}-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
};

// Method to add payment
debitNoteSchema.methods.addPayment = function(paymentData) {
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

// Method to check if overdue
debitNoteSchema.methods.isOverdue = function() {
    return this.dueDate < new Date() && this.paymentStatus !== 'paid';
};

// Method to mark as sent
debitNoteSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    return this.save();
};

// Method to mark as viewed
debitNoteSchema.methods.markAsViewed = function() {
    if (this.status === 'sent') {
        this.status = 'viewed';
    }
    this.viewedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('DebitNote', debitNoteSchema);
