const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
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

    // Quotation Details
    quoteNumber: {
        type: String,
        required: true
        // Note: unique per company, enforced via compound index below
    },
    quoteDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    validUntil: {
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

    // Customer Information (cached for performance)
    customerInfo: {
        name: String,
        email: String,
        phone: String,
        taxId: String,
        address: {
            street: String,
            city: String,
            state: String,
            postalCode: String,
            country: String
        }
    },

    // Quotation Items
    items: [{
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
        enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
        default: 'draft'
    },

    // Conversion tracking
    convertedToInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    convertedAt: Date,

    // Additional Information
    notes: String,
    termsAndConditions: String,

    // Compliance
    isVatApplicable: {
        type: Boolean,
        default: true
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
    acceptedAt: Date,
    rejectedAt: Date,

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
quotationSchema.index({ userId: 1, status: 1 });
quotationSchema.index({ companyId: 1, quoteDate: -1 });
quotationSchema.index({ customerId: 1, status: 1 });
// Quote number must be unique PER COMPANY (not globally)
quotationSchema.index({ companyId: 1, quoteNumber: 1 }, { unique: true });
quotationSchema.index({ validUntil: 1, status: 1 });
quotationSchema.index({ createdAt: -1 });

// Virtual for formatted quote number
quotationSchema.virtual('formattedQuoteNumber').get(function() {
    return this.quoteNumber;
});

// Virtual for days until expiry
quotationSchema.virtual('daysUntilExpiry').get(function() {
    if (this.status === 'accepted' || this.status === 'rejected' || this.status === 'converted' || this.status === 'expired') {
        return 0;
    }
    const today = new Date();
    const validUntil = new Date(this.validUntil);
    const diffTime = validUntil - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual for quotation age
quotationSchema.virtual('quotationAge').get(function() {
    const today = new Date();
    const quoteDate = new Date(this.quoteDate);
    const diffTime = today - quoteDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
quotationSchema.pre('save', function(next) {
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

    // Check if expired
    if (this.validUntil < new Date() && this.status !== 'accepted' && this.status !== 'rejected' && this.status !== 'converted') {
        this.status = 'expired';
    }

    next();
});

// Static method to generate next quotation number
quotationSchema.statics.generateQuoteNumber = async function(companyId) {
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId);

    if (!company) {
        throw new Error('Company not found');
    }

    const prefix = company.settings?.quoteNumberPrefix || 'QUO';
    const currentYear = new Date().getFullYear();

    // Find the last quotation for this company with the highest quote number
    const lastQuotation = await this.findOne({
        companyId: companyId,
        quoteNumber: { $regex: `^${prefix}-${currentYear}-\\d{6}$` }
    }).sort({ quoteNumber: -1 });

    let nextNumber = 1;
    if (lastQuotation) {
        // Extract the numeric part from the quote number
        const parts = lastQuotation.quoteNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }

    return `${prefix}-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
};

// Method to check if quotation is expired
quotationSchema.methods.isExpired = function() {
    return this.validUntil < new Date() && this.status !== 'accepted' && this.status !== 'rejected' && this.status !== 'converted';
};

// Method to mark as sent
quotationSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    return this.save();
};

// Method to mark as viewed
quotationSchema.methods.markAsViewed = function() {
    if (this.status === 'sent') {
        this.status = 'viewed';
    }
    this.viewedAt = new Date();
    return this.save();
};

// Method to mark as accepted
quotationSchema.methods.markAsAccepted = function() {
    this.status = 'accepted';
    this.acceptedAt = new Date();
    return this.save();
};

// Method to mark as rejected
quotationSchema.methods.markAsRejected = function() {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    return this.save();
};

// Method to mark as converted to invoice
quotationSchema.methods.markAsConverted = function(invoiceId) {
    this.status = 'converted';
    this.convertedToInvoiceId = invoiceId;
    this.convertedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Quotation', quotationSchema);
