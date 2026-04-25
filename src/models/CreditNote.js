const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
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

    // Credit Note Details
    creditNoteNumber: {
        type: String,
        required: true,
        unique: true
    },
    creditNoteType: {
        type: String,
        enum: ['standard', 'simplified'], // B2B or B2C
        default: 'standard',
        required: true
    },
    // ZATCA Credit Note Type Code
    // SN = Simplified Credit Note (B2C)
    // CN = Tax Credit Note (B2B)
    zatcaCreditNoteTypeCode: {
        type: String,
        enum: ['SN', 'CN'],
        required: false // Optional for backward compatibility
    },
    issueDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    currency: {
        type: String,
        enum: ['SAR', 'USD', 'EUR', 'AED'],
        default: 'SAR'
    },

    // Reference to Original Invoice (REQUIRED for ZATCA compliance)
    originalInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Original invoice reference is required for credit notes'],
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

    // Reason for Credit Note
    reason: {
        type: String,
        enum: ['return', 'discount', 'correction', 'cancellation', 'other'],
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

    // Credit Note Items
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
        enum: ['draft', 'sent', 'applied', 'cancelled'],
        default: 'draft'
    },
    applicationStatus: {
        type: String,
        enum: ['pending', 'partial', 'applied', 'refunded'],
        default: 'pending'
    },

    // Applied Amount (how much of credit note has been used)
    appliedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    remainingAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Applications (which invoices this credit note has been applied to)
    applications: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        invoiceNumber: String,
        amount: Number,
        date: Date,
        notes: String
    }],

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
    appliedAt: Date,

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
creditNoteSchema.index({ userId: 1, status: 1 });
creditNoteSchema.index({ companyId: 1, issueDate: -1 });
creditNoteSchema.index({ customerId: 1, status: 1 });
creditNoteSchema.index({ createdAt: -1 });

// Virtual for formatted credit note number
creditNoteSchema.virtual('formattedCreditNoteNumber').get(function() {
    return this.creditNoteNumber;
});

// Virtual for credit note age
creditNoteSchema.virtual('creditNoteAge').get(function() {
    const today = new Date();
    const issueDate = new Date(this.issueDate);
    const diffTime = today - issueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
creditNoteSchema.pre('save', function(next) {
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
    this.remainingAmount = this.total - this.appliedAmount;

    // Update application status
    if (this.appliedAmount >= this.total) {
        this.applicationStatus = 'applied';
        if (this.status !== 'cancelled') {
            this.status = 'applied';
        }
        this.appliedAt = this.appliedAt || new Date();
    } else if (this.appliedAmount > 0) {
        this.applicationStatus = 'partial';
    } else {
        this.applicationStatus = 'pending';
    }

    next();
});

// Static method to generate next credit note number
creditNoteSchema.statics.generateCreditNoteNumber = async function(companyId) {
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);

    if (!company) {
        throw new Error('Company not found');
    }

    const prefix = 'CN';
    const currentYear = new Date().getFullYear();

    // Find the last credit note for this company
    const lastCreditNote = await this.findOne({
        companyId: companyId,
        creditNoteNumber: { $regex: `^${prefix}-${currentYear}-\\d{6}$` }
    }).sort({ creditNoteNumber: -1 });

    let nextNumber = 1;
    if (lastCreditNote) {
        const parts = lastCreditNote.creditNoteNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    return `${prefix}-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
};

// Method to apply to invoice
creditNoteSchema.methods.applyToInvoice = function(invoiceId, invoiceNumber, amount, notes) {
    if (amount > this.remainingAmount) {
        throw new Error('Amount exceeds remaining credit');
    }

    this.applications.push({
        invoiceId: invoiceId,
        invoiceNumber: invoiceNumber,
        amount: amount,
        date: new Date(),
        notes: notes
    });

    this.appliedAmount += amount;
    return this.save();
};

// Method to mark as sent
creditNoteSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    return this.save();
};

module.exports = mongoose.model('CreditNote', creditNoteSchema);
