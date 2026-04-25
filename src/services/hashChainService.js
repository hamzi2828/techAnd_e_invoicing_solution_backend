const mongoose = require('mongoose');
const Company = require('../models/Company');
const HashChainHistory = require('../models/HashChainHistory');

// Default PIH for first invoice (SHA256("0") base64 encoded)
// ZATCA requires this specific value for the first invoice in a sequence
const DEFAULT_FIRST_INVOICE_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==';

class HashChainService {
    /**
     * Get the next hash chain data for a company with atomic increment
     * Uses findOneAndUpdate with $inc for thread-safe operation
     * Supports separate hash chains for B2B and B2C invoices
     *
     * @param {ObjectId} companyId - Company ID
     * @param {string} invoiceCategory - 'B2B' for Standard/Cleared or 'B2C' for Simplified/Reported
     * @returns {Promise<{hashChainNumber: number, previousInvoiceHash: string, isFirstInvoice: boolean, invoiceCategory: string}>}
     */
    async getNextHashChainData(companyId, invoiceCategory = 'B2B') {
        // Validate invoice category
        if (!['B2B', 'B2C'].includes(invoiceCategory)) {
            throw new Error('Invalid invoice category. Must be B2B or B2C');
        }

        // Determine which fields to use based on invoice category
        const counterField = invoiceCategory === 'B2B'
            ? 'zatcaCredentials.hashChainCounterB2B'
            : 'zatcaCredentials.hashChainCounterB2C';
        const updateField = invoiceCategory === 'B2B'
            ? 'zatcaCredentials.lastHashChainUpdateB2B'
            : 'zatcaCredentials.lastHashChainUpdateB2C';
        const pihField = invoiceCategory === 'B2B'
            ? 'previousInvoiceHashB2B'
            : 'previousInvoiceHashB2C';

        // Use findOneAndUpdate with $inc for atomic operation
        // This ensures no two invoices get the same hash chain number
        const company = await Company.findOneAndUpdate(
            { _id: companyId },
            {
                $inc: { [counterField]: 1 },
                $set: { [updateField]: new Date() }
            },
            {
                new: true,
                select: 'zatcaCredentials'
            }
        );

        if (!company) {
            throw new Error('Company not found');
        }

        // Get the appropriate counter and PIH based on invoice category
        const hashChainNumber = invoiceCategory === 'B2B'
            ? (company.zatcaCredentials?.hashChainCounterB2B || 1)
            : (company.zatcaCredentials?.hashChainCounterB2C || 1);

        const previousInvoiceHash = invoiceCategory === 'B2B'
            ? (company.zatcaCredentials?.previousInvoiceHashB2B || DEFAULT_FIRST_INVOICE_PIH)
            : (company.zatcaCredentials?.previousInvoiceHashB2C || DEFAULT_FIRST_INVOICE_PIH);

        // Debug logging
        console.log('=== Hash Chain Debug ===');
        console.log('Company ID:', companyId);
        console.log('Invoice Category:', invoiceCategory);
        console.log('Hash Chain Number:', hashChainNumber);
        console.log('Previous Invoice Hash:', previousInvoiceHash.substring(0, 30) + '...');
        console.log('========================');

        return {
            hashChainNumber,
            previousInvoiceHash,
            isFirstInvoice: hashChainNumber === 1,
            invoiceCategory
        };
    }

    /**
     * Update hash chain after successful ZATCA submission
     * Updates company's previousInvoiceHash and creates history record
     * Supports separate hash chains for B2B and B2C invoices
     *
     * @param {Object} params - Parameters
     * @param {ObjectId} params.companyId - Company ID
     * @param {ObjectId} params.invoiceId - Invoice ID
     * @param {string} params.invoiceNumber - Invoice number
     * @param {string} params.zatcaUuid - ZATCA UUID
     * @param {number} params.hashChainNumber - Hash chain number used
     * @param {string} params.previousInvoiceHash - PIH used for this invoice
     * @param {string} params.invoiceHash - This invoice's hash (becomes next PIH)
     * @param {string} params.submissionType - 'cleared' or 'reported'
     * @param {string} params.invoiceCategory - 'B2B' or 'B2C'
     * @param {ObjectId} params.userId - User who submitted
     * @param {Array} params.warnings - Any ZATCA warnings
     * @returns {Promise<{success: boolean, historyEntry: Object}>}
     */
    async updateHashChainAfterSubmission(params) {
        const {
            companyId,
            invoiceId,
            invoiceNumber,
            zatcaUuid,
            hashChainNumber,
            previousInvoiceHash,
            invoiceHash,
            submissionType,
            invoiceCategory = 'B2B',
            userId,
            warnings = []
        } = params;

        console.log('=== Updating Hash Chain After Submission ===');
        console.log('Company ID:', companyId);
        console.log('Invoice Number:', invoiceNumber);
        console.log('Invoice Category:', invoiceCategory);
        console.log('Hash Chain Number:', hashChainNumber);
        console.log('Invoice Hash:', invoiceHash?.substring(0, 30) + '...');

        try {
            // Determine which PIH field to update based on invoice category
            const pihField = invoiceCategory === 'B2B'
                ? 'zatcaCredentials.previousInvoiceHashB2B'
                : 'zatcaCredentials.previousInvoiceHashB2C';

            // 1. Update company's previousInvoiceHash for next invoice (category-specific)
            const updateResult = await Company.findByIdAndUpdate(
                companyId,
                {
                    $set: {
                        [pihField]: invoiceHash
                    }
                },
                { new: true }
            );

            console.log(`Company update result - ${pihField} set:`, !!updateResult?.zatcaCredentials);

            // 2. Create history record for audit trail
            const historyEntry = new HashChainHistory({
                companyId,
                invoiceId,
                hashChainNumber,
                previousInvoiceHash,
                invoiceHash,
                invoiceNumber,
                zatcaUuid,
                submissionType,
                invoiceCategory,
                zatcaStatus: warnings.length > 0 ? 'warning' : 'success',
                zatcaWarnings: warnings,
                submittedBy: userId,
                submittedAt: new Date()
            });

            await historyEntry.save();

            console.log(`Hash chain updated: Company ${companyId}, Category ${invoiceCategory}, Chain #${hashChainNumber}, Invoice ${invoiceNumber}`);
            console.log('===========================================');

            return {
                success: true,
                historyEntry
            };

        } catch (error) {
            console.error('Hash chain update error:', error);
            throw error;
        }
    }

    /**
     * Rollback hash chain counter on failed submission
     * Only decrements if the counter matches the one we incremented
     * Supports separate hash chains for B2B and B2C invoices
     *
     * @param {ObjectId} companyId - Company ID
     * @param {number} hashChainNumber - The number to rollback
     * @param {string} invoiceCategory - 'B2B' or 'B2C'
     * @returns {Promise<boolean>} - Whether rollback was successful
     */
    async rollbackHashChainOnFailure(companyId, hashChainNumber, invoiceCategory = 'B2B') {
        try {
            // Determine which counter field to use based on invoice category
            const counterField = invoiceCategory === 'B2B'
                ? 'zatcaCredentials.hashChainCounterB2B'
                : 'zatcaCredentials.hashChainCounterB2C';

            // Only rollback if the counter matches what we incremented
            const result = await Company.findOneAndUpdate(
                {
                    _id: companyId,
                    [counterField]: hashChainNumber
                },
                {
                    $inc: { [counterField]: -1 }
                }
            );

            if (result) {
                console.log(`Hash chain rolled back: Company ${companyId}, Category ${invoiceCategory}, from #${hashChainNumber} to #${hashChainNumber - 1}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Hash chain rollback error:', error);
            return false;
        }
    }

    /**
     * Get hash chain history for a company with pagination
     * Supports filtering by invoice category (B2B/B2C)
     *
     * @param {ObjectId} companyId - Company ID
     * @param {Object} options - Pagination and filter options
     * @param {number} options.page - Page number (default 1)
     * @param {number} options.limit - Items per page (default 20)
     * @param {string} options.invoiceCategory - Optional: 'B2B' or 'B2C' to filter by category
     * @returns {Promise<{history: Array, pagination: Object}>}
     */
    async getHashChainHistory(companyId, options = {}) {
        const { page = 1, limit = 20, invoiceCategory = null } = options;
        const skip = (page - 1) * limit;

        const query = { companyId };
        if (invoiceCategory) {
            query.invoiceCategory = invoiceCategory;
        }

        const [history, total] = await Promise.all([
            HashChainHistory.find(query)
                .sort({ invoiceCategory: 1, hashChainNumber: -1 })
                .skip(skip)
                .limit(limit)
                .populate('invoiceId', 'invoiceNumber invoiceDate total currency')
                .populate('submittedBy', 'firstName lastName email')
                .lean(),
            HashChainHistory.countDocuments(query)
        ]);

        return {
            history,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                limit
            }
        };
    }

    /**
     * Verify hash chain integrity for a company
     * Checks for gaps in sequence and PIH mismatches
     * Supports separate verification for B2B and B2C chains
     *
     * @param {ObjectId} companyId - Company ID
     * @param {string} invoiceCategory - Optional: 'B2B' or 'B2C' to verify specific chain, or null for both
     * @returns {Promise<{isValid: boolean, issues: Array, totalEntries: number, b2bEntries: number, b2cEntries: number}>}
     */
    async verifyHashChainIntegrity(companyId, invoiceCategory = null) {
        const issues = [];
        const results = { b2bEntries: 0, b2cEntries: 0 };

        // Verify specific category or both
        const categoriesToVerify = invoiceCategory ? [invoiceCategory] : ['B2B', 'B2C'];

        for (const category of categoriesToVerify) {
            const history = await HashChainHistory.find({ companyId, invoiceCategory: category })
                .sort({ hashChainNumber: 1 })
                .lean();

            if (category === 'B2B') results.b2bEntries = history.length;
            if (category === 'B2C') results.b2cEntries = history.length;

            let expectedPIH = DEFAULT_FIRST_INVOICE_PIH;

            for (let i = 0; i < history.length; i++) {
                const entry = history[i];

                // Check sequential numbering (no gaps)
                if (entry.hashChainNumber !== i + 1) {
                    issues.push({
                        type: 'SEQUENCE_GAP',
                        category: category,
                        message: `[${category}] Expected chain number ${i + 1}, found ${entry.hashChainNumber}`,
                        expected: i + 1,
                        actual: entry.hashChainNumber,
                        invoiceNumber: entry.invoiceNumber,
                        invoiceId: entry.invoiceId
                    });
                }

                // Check PIH chain continuity
                if (entry.previousInvoiceHash !== expectedPIH) {
                    issues.push({
                        type: 'PIH_MISMATCH',
                        category: category,
                        message: `[${category}] PIH mismatch at chain number ${entry.hashChainNumber}`,
                        hashChainNumber: entry.hashChainNumber,
                        expectedPIH: expectedPIH.substring(0, 20) + '...',
                        actualPIH: entry.previousInvoiceHash.substring(0, 20) + '...',
                        invoiceNumber: entry.invoiceNumber,
                        invoiceId: entry.invoiceId
                    });
                }

                // Update expected PIH for next iteration
                expectedPIH = entry.invoiceHash;
            }

            // Check if company counter matches history count for this category
            const company = await Company.findById(companyId)
                .select('zatcaCredentials')
                .lean();

            if (company) {
                const counterField = category === 'B2B' ? 'hashChainCounterB2B' : 'hashChainCounterB2C';
                const pihField = category === 'B2B' ? 'previousInvoiceHashB2B' : 'previousInvoiceHashB2C';

                const counter = company.zatcaCredentials?.[counterField] || 0;
                if (counter !== history.length) {
                    issues.push({
                        type: 'COUNTER_MISMATCH',
                        category: category,
                        message: `[${category}] Company counter (${counter}) does not match history count (${history.length})`,
                        companyCounter: counter,
                        historyCount: history.length
                    });
                }

                // Check if company's stored PIH matches last history entry
                if (history.length > 0) {
                    const lastEntry = history[history.length - 1];
                    const companyPIH = company.zatcaCredentials?.[pihField];
                    if (companyPIH && companyPIH !== lastEntry.invoiceHash) {
                        issues.push({
                            type: 'STORED_PIH_MISMATCH',
                            category: category,
                            message: `[${category}] Company stored PIH does not match last invoice hash`,
                            storedPIH: companyPIH.substring(0, 20) + '...',
                            expectedPIH: lastEntry.invoiceHash.substring(0, 20) + '...'
                        });
                    }
                }
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            totalEntries: results.b2bEntries + results.b2cEntries,
            b2bEntries: results.b2bEntries,
            b2cEntries: results.b2cEntries
        };
    }

    /**
     * Get current hash chain state for a company
     * Returns separate state for B2B and B2C chains
     *
     * @param {ObjectId} companyId - Company ID
     * @param {string} invoiceCategory - Optional: 'B2B' or 'B2C' to get specific chain state
     * @returns {Promise<Object>} - Hash chain state for both or specific category
     */
    async getHashChainState(companyId, invoiceCategory = null) {
        const company = await Company.findById(companyId)
            .select('zatcaCredentials')
            .lean();

        if (!company) {
            throw new Error('Company not found');
        }

        const b2bState = {
            currentCounter: company.zatcaCredentials?.hashChainCounterB2B || 0,
            lastPIH: company.zatcaCredentials?.previousInvoiceHashB2B || null,
            lastUpdated: company.zatcaCredentials?.lastHashChainUpdateB2B || null,
            isFirstInvoice: !company.zatcaCredentials?.previousInvoiceHashB2B
        };

        const b2cState = {
            currentCounter: company.zatcaCredentials?.hashChainCounterB2C || 0,
            lastPIH: company.zatcaCredentials?.previousInvoiceHashB2C || null,
            lastUpdated: company.zatcaCredentials?.lastHashChainUpdateB2C || null,
            isFirstInvoice: !company.zatcaCredentials?.previousInvoiceHashB2C
        };

        if (invoiceCategory === 'B2B') {
            return { ...b2bState, invoiceCategory: 'B2B' };
        } else if (invoiceCategory === 'B2C') {
            return { ...b2cState, invoiceCategory: 'B2C' };
        }

        // Return both states
        return {
            b2b: b2bState,
            b2c: b2cState
        };
    }

    /**
     * Get default PIH for first invoice
     * @returns {string} - Default PIH (SHA256("0") base64 encoded)
     */
    getDefaultFirstInvoicePIH() {
        return DEFAULT_FIRST_INVOICE_PIH;
    }

    /**
     * Peek at the next hash chain data without incrementing
     * Used for validation/preview purposes only
     * Supports separate B2B and B2C chains
     *
     * @param {ObjectId} companyId - Company ID
     * @param {string} invoiceCategory - 'B2B' or 'B2C'
     * @returns {Promise<{hashChainNumber: number, previousInvoiceHash: string, isFirstInvoice: boolean, invoiceCategory: string}>}
     */
    async peekNextHashChainData(companyId, invoiceCategory = 'B2B') {
        const company = await Company.findById(companyId)
            .select('zatcaCredentials')
            .lean();

        if (!company) {
            throw new Error('Company not found');
        }

        const counterField = invoiceCategory === 'B2B' ? 'hashChainCounterB2B' : 'hashChainCounterB2C';
        const pihField = invoiceCategory === 'B2B' ? 'previousInvoiceHashB2B' : 'previousInvoiceHashB2C';

        const currentCounter = company.zatcaCredentials?.[counterField] || 0;
        const nextNumber = currentCounter + 1;
        const previousInvoiceHash = company.zatcaCredentials?.[pihField] || DEFAULT_FIRST_INVOICE_PIH;

        return {
            hashChainNumber: nextNumber,
            previousInvoiceHash,
            isFirstInvoice: currentCounter === 0,
            invoiceCategory
        };
    }

    /**
     * Get hash chain entry for a specific invoice
     *
     * @param {ObjectId} invoiceId - Invoice ID
     * @returns {Promise<Object|null>}
     */
    async getHashChainEntryByInvoice(invoiceId) {
        return await HashChainHistory.findOne({ invoiceId })
            .populate('companyId', 'companyName')
            .lean();
    }

    /**
     * Fix/Sync hash chain for a company
     * This method will:
     * 1. Find all cleared/reported invoices for the company
     * 2. Sort them by clearedAt date
     * 3. Assign sequential hash chain numbers (separate for B2B and B2C)
     * 4. Update company's hashChainCounter and previousInvoiceHash for both categories
     * 5. Create/Update HashChainHistory entries with invoiceCategory
     *
     * @param {ObjectId} companyId - Company ID
     * @returns {Promise<{success: boolean, fixed: Object, message: string}>}
     */
    async fixHashChainForCompany(companyId) {
        const Invoice = require('../models/Invoice');

        console.log('=== Fixing Hash Chain for Company ===');
        console.log('Company ID:', companyId);

        try {
            // 1. Find all cleared/reported invoices for this company, sorted by clearedAt
            const invoices = await Invoice.find({
                companyId: companyId,
                $or: [
                    { 'zatca.status': 'cleared' },
                    { 'zatca.status': 'reported' },
                    { status: 'sent' }
                ]
            })
            .sort({ 'zatca.clearedAt': 1, createdAt: 1 })
            .lean();

            console.log(`Found ${invoices.length} cleared/reported invoices`);

            if (invoices.length === 0) {
                // Reset company's hash chain counters for both B2B and B2C
                await Company.findByIdAndUpdate(companyId, {
                    $set: {
                        'zatcaCredentials.hashChainCounterB2B': 0,
                        'zatcaCredentials.previousInvoiceHashB2B': null,
                        'zatcaCredentials.lastHashChainUpdateB2B': null,
                        'zatcaCredentials.hashChainCounterB2C': 0,
                        'zatcaCredentials.previousInvoiceHashB2C': null,
                        'zatcaCredentials.lastHashChainUpdateB2C': null,
                        // Legacy fields
                        'zatcaCredentials.hashChainCounter': 0,
                        'zatcaCredentials.previousInvoiceHash': null
                    }
                });

                return {
                    success: true,
                    fixed: { b2b: 0, b2c: 0, total: 0 },
                    message: 'No invoices to fix. Counters reset to 0.'
                };
            }

            // 2. Delete existing hash chain history for this company (we'll recreate it)
            await HashChainHistory.deleteMany({ companyId });
            console.log('Cleared existing hash chain history');

            // 3. Separate invoices into B2B and B2C categories
            const b2bInvoices = invoices.filter(inv => {
                const isB2B = ['CI', 'CP', 'CD', 'CN'].includes(inv.zatcaInvoiceTypeCode) ||
                              (!inv.zatcaInvoiceTypeCode && inv.invoiceType === 'standard') ||
                              inv.zatca?.status === 'cleared';
                return isB2B;
            });

            const b2cInvoices = invoices.filter(inv => {
                const isB2C = ['SI', 'SP', 'SD', 'SN'].includes(inv.zatcaInvoiceTypeCode) ||
                              inv.invoiceType === 'simplified' ||
                              inv.zatca?.status === 'reported';
                return isB2C && !b2bInvoices.includes(inv);
            });

            console.log(`B2B invoices: ${b2bInvoices.length}, B2C invoices: ${b2cInvoices.length}`);

            // 4. Process B2B invoices
            let previousHashB2B = DEFAULT_FIRST_INVOICE_PIH;
            let chainNumberB2B = 0;

            for (const invoice of b2bInvoices) {
                chainNumberB2B++;
                const invoiceHash = invoice.zatca?.hash || `generated-hash-b2b-${chainNumberB2B}`;

                console.log(`Processing B2B invoice ${chainNumberB2B}: ${invoice.invoiceNumber}`);

                // Update invoice with correct hash chain number
                await Invoice.findByIdAndUpdate(invoice._id, {
                    $set: {
                        'zatca.hashChainNumber': chainNumberB2B,
                        'zatca.previousInvoiceHash': previousHashB2B,
                        'zatca.invoiceCategory': 'B2B'
                    }
                });

                // Create history entry
                const historyEntry = new HashChainHistory({
                    companyId: companyId,
                    invoiceId: invoice._id,
                    hashChainNumber: chainNumberB2B,
                    previousInvoiceHash: previousHashB2B,
                    invoiceHash: invoiceHash,
                    invoiceNumber: invoice.invoiceNumber,
                    zatcaUuid: invoice.zatca?.uuid || `uuid-b2b-${chainNumberB2B}`,
                    submissionType: 'cleared',
                    invoiceCategory: 'B2B',
                    zatcaStatus: 'success',
                    zatcaWarnings: [],
                    submittedAt: invoice.zatca?.clearedAt || invoice.createdAt,
                    submittedBy: invoice.userId
                });

                await historyEntry.save();
                previousHashB2B = invoiceHash;
            }

            // 5. Process B2C invoices
            let previousHashB2C = DEFAULT_FIRST_INVOICE_PIH;
            let chainNumberB2C = 0;

            for (const invoice of b2cInvoices) {
                chainNumberB2C++;
                const invoiceHash = invoice.zatca?.hash || `generated-hash-b2c-${chainNumberB2C}`;

                console.log(`Processing B2C invoice ${chainNumberB2C}: ${invoice.invoiceNumber}`);

                // Update invoice with correct hash chain number
                await Invoice.findByIdAndUpdate(invoice._id, {
                    $set: {
                        'zatca.hashChainNumber': chainNumberB2C,
                        'zatca.previousInvoiceHash': previousHashB2C,
                        'zatca.invoiceCategory': 'B2C'
                    }
                });

                // Create history entry
                const historyEntry = new HashChainHistory({
                    companyId: companyId,
                    invoiceId: invoice._id,
                    hashChainNumber: chainNumberB2C,
                    previousInvoiceHash: previousHashB2C,
                    invoiceHash: invoiceHash,
                    invoiceNumber: invoice.invoiceNumber,
                    zatcaUuid: invoice.zatca?.uuid || `uuid-b2c-${chainNumberB2C}`,
                    submissionType: 'reported',
                    invoiceCategory: 'B2C',
                    zatcaStatus: 'success',
                    zatcaWarnings: [],
                    submittedAt: invoice.zatca?.clearedAt || invoice.createdAt,
                    submittedBy: invoice.userId
                });

                await historyEntry.save();
                previousHashB2C = invoiceHash;
            }

            // 6. Update company's hash chain counters and previousInvoiceHash for both categories
            await Company.findByIdAndUpdate(companyId, {
                $set: {
                    'zatcaCredentials.hashChainCounterB2B': chainNumberB2B,
                    'zatcaCredentials.previousInvoiceHashB2B': chainNumberB2B > 0 ? previousHashB2B : null,
                    'zatcaCredentials.lastHashChainUpdateB2B': chainNumberB2B > 0 ? new Date() : null,
                    'zatcaCredentials.hashChainCounterB2C': chainNumberB2C,
                    'zatcaCredentials.previousInvoiceHashB2C': chainNumberB2C > 0 ? previousHashB2C : null,
                    'zatcaCredentials.lastHashChainUpdateB2C': chainNumberB2C > 0 ? new Date() : null,
                    // Legacy fields (total)
                    'zatcaCredentials.hashChainCounter': chainNumberB2B + chainNumberB2C,
                    'zatcaCredentials.lastHashChainUpdate': new Date()
                }
            });

            const totalFixed = chainNumberB2B + chainNumberB2C;
            console.log(`Fixed ${totalFixed} invoices (B2B: ${chainNumberB2B}, B2C: ${chainNumberB2C})`);
            console.log('=====================================');

            return {
                success: true,
                fixed: { b2b: chainNumberB2B, b2c: chainNumberB2C, total: totalFixed },
                message: `Successfully fixed hash chain. B2B: ${chainNumberB2B} invoices (next #${chainNumberB2B + 1}), B2C: ${chainNumberB2C} invoices (next #${chainNumberB2C + 1})`
            };

        } catch (error) {
            console.error('Fix hash chain error:', error);
            throw error;
        }
    }

    /**
     * Fix hash chain for all companies
     * @returns {Promise<{success: boolean, results: Array}>}
     */
    async fixHashChainForAllCompanies() {
        const companies = await Company.find({
            'zatcaCredentials.status': 'verified'
        }).select('_id companyName');

        console.log(`Found ${companies.length} verified companies to fix`);

        const results = [];
        for (const company of companies) {
            try {
                const result = await this.fixHashChainForCompany(company._id);
                results.push({
                    companyId: company._id,
                    companyName: company.companyName,
                    ...result
                });
            } catch (error) {
                results.push({
                    companyId: company._id,
                    companyName: company.companyName,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            results
        };
    }
}

module.exports = new HashChainService();
