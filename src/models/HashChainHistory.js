const mongoose = require('mongoose');

/**
 * HashChainHistory Schema
 *
 * Tracks the sequential hash chain for ZATCA invoice submissions per company.
 * Each submitted invoice gets a sequential hash chain number and uses the
 * previous invoice's hash (PIH) for ZATCA compliance.
 */
const hashChainHistorySchema = new mongoose.Schema({
    // Company Reference
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    // Invoice Reference
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },

    // Sequential Hash Chain Number (like invoice number, per company)
    hashChainNumber: {
        type: Number,
        required: true,
        min: 1
    },

    // Previous Invoice Hash (PIH) used for this invoice submission
    previousInvoiceHash: {
        type: String,
        required: true
    },

    // This invoice's hash (becomes PIH for next invoice)
    invoiceHash: {
        type: String,
        required: true
    },

    // Invoice Identification
    invoiceNumber: {
        type: String,
        required: true
    },

    // ZATCA UUID returned from submission
    zatcaUuid: {
        type: String,
        required: true
    },

    // Type of ZATCA submission
    submissionType: {
        type: String,
        enum: ['cleared', 'reported'],
        required: true
    },

    // Invoice Category (B2B = Standard/Cleared, B2C = Simplified/Reported)
    invoiceCategory: {
        type: String,
        enum: ['B2B', 'B2C'],
        required: true,
        index: true
    },

    // ZATCA Response Status
    zatcaStatus: {
        type: String,
        enum: ['success', 'warning', 'rejected'],
        default: 'success'
    },

    // Any warnings from ZATCA
    zatcaWarnings: [{
        type: String
    }],

    // Submission timestamp
    submittedAt: {
        type: Date,
        default: Date.now,
        required: true
    },

    // User who submitted
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound indexes for performance
hashChainHistorySchema.index({ companyId: 1, invoiceCategory: 1, hashChainNumber: -1 });
hashChainHistorySchema.index({ companyId: 1, invoiceId: 1 }, { unique: true });
hashChainHistorySchema.index({ companyId: 1, submittedAt: -1 });
hashChainHistorySchema.index({ companyId: 1, invoiceCategory: 1 });

/**
 * Static method to get latest hash chain entry for a company
 * @param {ObjectId} companyId - Company ID
 * @param {string} invoiceCategory - Optional: 'B2B' or 'B2C' to filter by category
 * @returns {Promise<Object|null>} Latest hash chain entry or null
 */
hashChainHistorySchema.statics.getLatestForCompany = async function(companyId, invoiceCategory = null) {
    const query = { companyId };
    if (invoiceCategory) {
        query.invoiceCategory = invoiceCategory;
    }
    return await this.findOne(query)
        .sort({ hashChainNumber: -1 })
        .lean();
};

/**
 * Static method to get hash chain entry by invoice ID
 * @param {ObjectId} invoiceId - Invoice ID
 * @returns {Promise<Object|null>} Hash chain entry or null
 */
hashChainHistorySchema.statics.getByInvoiceId = async function(invoiceId) {
    return await this.findOne({ invoiceId }).lean();
};

/**
 * Static method to count total submissions for a company
 * @param {ObjectId} companyId - Company ID
 * @returns {Promise<number>} Total count
 */
hashChainHistorySchema.statics.countByCompany = async function(companyId) {
    return await this.countDocuments({ companyId });
};

module.exports = mongoose.model('HashChainHistory', hashChainHistorySchema);
