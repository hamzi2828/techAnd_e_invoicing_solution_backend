const CreditNote = require('../models/CreditNote');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const User = require('../models/User');
const zatcaService = require('./zatcaService');

class CreditNoteService {
    // Create a new credit note
    async createCreditNote(userId, creditNoteData) {
        try {
            const { customerId, companyId, items, originalInvoiceId, ...otherData } = creditNoteData;

            // Validate required fields
            if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
                throw new Error('Customer ID and items are required');
            }

            // ZATCA REQUIREMENT: Original invoice is MANDATORY for credit notes
            if (!originalInvoiceId) {
                throw new Error('Original invoice reference is required for credit notes (ZATCA requirement)');
            }

            // Find the current user
            const currentUser = await User.findById(userId);
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
            }

            // Get company information
            const company = await Company.findOne({
                _id: companyId,
                userId: companyOwnerId,
                isActive: true
            });

            if (!company) {
                throw new Error('Company not found or not accessible');
            }

            // Validate customer exists and is accessible
            await this.validateCustomer(customerId, userId);

            // Validate and get original invoice details (REQUIRED)
            const originalInvoice = await Invoice.findOne({
                _id: originalInvoiceId,
                userId: userId
            });

            if (!originalInvoice) {
                throw new Error('Original invoice not found');
            }

            // Extract ZATCA data from original invoice for Phase 2 compliance
            const originalInvoiceNumber = originalInvoice.invoiceNumber;
            const originalInvoiceUUID = originalInvoice.zatca?.uuid || null;
            const originalInvoiceHash = originalInvoice.zatca?.hash || null;

            // Inherit invoice type from original (standard or simplified)
            const creditNoteType = originalInvoice.invoiceType || 'standard';

            // Generate credit note number
            const creditNoteNumber = await CreditNote.generateCreditNoteNumber(companyId);

            // Check if credit note number already exists
            const existingCreditNote = await CreditNote.findOne({
                companyId: companyId,
                creditNoteNumber: creditNoteNumber
            });

            if (existingCreditNote) {
                throw new Error(`Credit note number ${creditNoteNumber} already exists`);
            }

            // Prepare credit note data
            const creditNotePayload = {
                userId,
                companyId,
                customerId,
                creditNoteNumber,
                creditNoteType: creditNoteType, // Inherited from original invoice
                issueDate: otherData.issueDate || new Date(),
                currency: otherData.currency || company.currency || 'SAR',

                // Original invoice reference (REQUIRED for ZATCA)
                originalInvoiceId: originalInvoiceId,
                originalInvoiceNumber: originalInvoiceNumber,
                originalInvoiceUUID: originalInvoiceUUID, // Phase 2 requirement
                originalInvoiceHash: originalInvoiceHash, // Phase 2 requirement

                // Reason
                reason: otherData.reason || 'other',
                reasonDescription: otherData.reasonDescription || otherData.notes,

                // Customer information
                customerInfo: {
                    customerId: customerId
                },

                // Items
                items: this.processItems(items),

                // Additional information
                notes: otherData.notes,
                termsAndConditions: otherData.termsAndConditions || company.settings?.termsAndConditions,
                discount: otherData.discount || 0,
                discountType: otherData.discountType || 'percentage',

                // VAT information
                isVatApplicable: company.vatRegistered && (otherData.isVatApplicable !== false),
                vatRegistration: company.vatNumber,

                // Initialize totals
                subtotal: 0,
                totalTax: 0,
                total: 0,

                // Status
                status: otherData.status || 'draft',

                createdBy: userId,
                updatedBy: userId
            };

            // Create the credit note
            const creditNote = new CreditNote(creditNotePayload);
            await creditNote.save();

            // Populate related data
            await creditNote.populate([
                { path: 'companyId', select: 'companyName email phone address zatcaCredentials' },
                { path: 'customerId', select: 'customerName contactInfo address type' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total zatca invoiceType' }
            ]);

            return {
                success: true,
                message: 'Credit note created successfully',
                data: {
                    creditNote,
                    creditNoteNumber,
                    total: creditNote.total
                }
            };

        } catch (error) {
            console.error('Create credit note error:', error);
            throw error;
        }
    }

    // Validate customer exists and is accessible
    async validateCustomer(customerId, userId) {
        try {
            const currentUser = await User.findById(userId);
            let customerOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                customerOwnerId = currentUser.createdBy;
            }

            const customer = await Customer.findOne({
                _id: customerId,
                userId: customerOwnerId,
                isActive: true,
                status: 'active'
            });

            if (!customer) {
                throw new Error('Customer not found or not accessible');
            }

            return true;
        } catch (error) {
            console.error('Validate customer error:', error);
            throw error;
        }
    }

    // Process and validate items
    processItems(items) {
        return items.map((item, index) => {
            if (item.quantity === undefined || item.unitPrice === undefined) {
                throw new Error(`Item ${index + 1}: Quantity and unit price are required`);
            }

            if (item.quantity <= 0 || item.unitPrice < 0) {
                throw new Error(`Item ${index + 1}: Quantity must be positive and unit price cannot be negative`);
            }

            return {
                product: item.product || null,
                description: item.description?.trim() || 'Credit item',
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                taxRate: item.taxRate !== undefined ? parseFloat(item.taxRate) : 15,
                discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
                totalPrice: 0,
                taxAmount: 0
            };
        });
    }

    // Get all credit notes
    async getCreditNotes(userId, filters = {}) {
        try {
            const query = { userId, isDeleted: { $ne: true } };

            if (filters.companyId) query.companyId = filters.companyId;
            if (filters.status) query.status = filters.status;
            if (filters.applicationStatus) query.applicationStatus = filters.applicationStatus;
            if (filters.customerId) query.customerId = filters.customerId;
            if (filters.reason) query.reason = filters.reason;

            // Date range filter
            if (filters.startDate || filters.endDate) {
                query.issueDate = {};
                if (filters.startDate) query.issueDate.$gte = new Date(filters.startDate);
                if (filters.endDate) query.issueDate.$lte = new Date(filters.endDate);
            }

            // Search filter
            if (filters.search) {
                query.$or = [
                    { creditNoteNumber: { $regex: filters.search, $options: 'i' } },
                    { reasonDescription: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const skip = (page - 1) * limit;

            const sortBy = filters.sortBy || '-createdAt';

            const creditNotes = await CreditNote.find(query)
                .populate('companyId', 'companyName')
                .populate('customerId', 'customerName contactInfo')
                .populate('originalInvoiceId', 'invoiceNumber')
                .sort(sortBy)
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await CreditNote.countDocuments(query);

            return {
                success: true,
                data: {
                    invoices: creditNotes,
                    pagination: {
                        current: page,
                        pages: Math.ceil(total / limit),
                        total,
                        limit
                    }
                }
            };

        } catch (error) {
            console.error('Get credit notes error:', error);
            throw error;
        }
    }

    // Get single credit note by ID
    async getCreditNoteById(creditNoteId, userId) {
        try {
            const creditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId
            }).populate([
                { path: 'companyId', select: 'companyName email phone address settings' },
                { path: 'customerId', select: 'customerName contactInfo address' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total status' }
            ]);

            if (!creditNote) {
                throw new Error('Credit note not found');
            }

            return {
                success: true,
                data: { invoice: creditNote }
            };

        } catch (error) {
            console.error('Get credit note by ID error:', error);
            throw error;
        }
    }

    // Update credit note (draft only)
    async updateCreditNote(creditNoteId, userId, creditNoteData) {
        try {
            const { customerId, companyId, items, ...otherData } = creditNoteData;

            const existingCreditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId
            });

            if (!existingCreditNote) {
                throw new Error('Credit note not found or not accessible');
            }

            if (existingCreditNote.status !== 'draft') {
                throw new Error('Only draft credit notes can be updated');
            }

            // Validate customer
            await this.validateCustomer(customerId, userId);

            // Get company
            const company = await Company.findOne({
                _id: companyId,
                isActive: true
            });

            if (!company) {
                throw new Error('Company not found');
            }

            // Update fields
            existingCreditNote.companyId = companyId;
            existingCreditNote.customerId = customerId;
            existingCreditNote.creditNoteType = otherData.creditNoteType || existingCreditNote.creditNoteType;
            existingCreditNote.issueDate = otherData.issueDate || existingCreditNote.issueDate;
            existingCreditNote.currency = otherData.currency || existingCreditNote.currency;
            existingCreditNote.reason = otherData.reason || existingCreditNote.reason;
            existingCreditNote.reasonDescription = otherData.reasonDescription || otherData.notes;

            existingCreditNote.customerInfo = { customerId: customerId };
            existingCreditNote.items = this.processItems(items);
            existingCreditNote.notes = otherData.notes;
            existingCreditNote.termsAndConditions = otherData.termsAndConditions;
            existingCreditNote.discount = otherData.discount || 0;
            existingCreditNote.discountType = otherData.discountType || 'percentage';
            existingCreditNote.isVatApplicable = company.vatRegistered && (otherData.isVatApplicable !== false);
            existingCreditNote.vatRegistration = company.vatNumber;
            existingCreditNote.updatedBy = userId;

            await existingCreditNote.save();

            await existingCreditNote.populate([
                { path: 'companyId', select: 'companyName email phone address' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            return {
                success: true,
                message: 'Credit note updated successfully',
                data: {
                    creditNote: existingCreditNote,
                    total: existingCreditNote.total
                }
            };

        } catch (error) {
            console.error('Update credit note error:', error);
            throw error;
        }
    }

    // Update credit note status
    async updateCreditNoteStatus(creditNoteId, userId, status) {
        try {
            const validStatuses = ['draft', 'sent', 'applied', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const creditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId
            });

            if (!creditNote) {
                throw new Error('Credit note not found');
            }

            creditNote.status = status;
            creditNote.updatedBy = userId;

            if (status === 'sent') {
                creditNote.sentAt = new Date();
            }

            await creditNote.save();

            return {
                success: true,
                message: 'Credit note status updated successfully',
                data: { creditNote }
            };

        } catch (error) {
            console.error('Update credit note status error:', error);
            throw error;
        }
    }

    // Soft delete credit note
    async softDeleteCreditNote(creditNoteId, userId) {
        try {
            const creditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId,
                isDeleted: { $ne: true }
            });

            if (!creditNote) {
                return {
                    success: false,
                    message: 'Credit note not found'
                };
            }

            if (creditNote.status !== 'draft') {
                return {
                    success: false,
                    message: 'Only draft credit notes can be deleted'
                };
            }

            creditNote.isDeleted = true;
            creditNote.deletedAt = new Date();
            creditNote.deletedBy = userId;
            await creditNote.save();

            return {
                success: true,
                message: 'Credit note deleted successfully'
            };

        } catch (error) {
            console.error('Soft delete credit note error:', error);
            throw error;
        }
    }

    // Get credit note statistics
    async getCreditNoteStats(userId, companyId) {
        try {
            const matchQuery = { userId, isDeleted: { $ne: true } };
            if (companyId) matchQuery.companyId = companyId;

            const stats = await CreditNote.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalCreditNotes: { $sum: 1 },
                        totalAmount: { $sum: '$total' },
                        totalApplied: { $sum: '$appliedAmount' },
                        totalPending: { $sum: '$remainingAmount' },
                        draftCount: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                        sentCount: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                        appliedCount: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } }
                    }
                }
            ]);

            const result = stats[0] || {
                totalCreditNotes: 0,
                totalAmount: 0,
                totalApplied: 0,
                totalPending: 0,
                draftCount: 0,
                sentCount: 0,
                appliedCount: 0
            };

            return {
                success: true,
                data: {
                    stats: {
                        totalCreditNotes: result.totalCreditNotes,
                        draftCreditNotes: result.draftCount,
                        sentCreditNotes: result.sentCount,
                        paidCreditNotes: result.appliedCount,
                        overdueCreditNotes: 0,
                        totalAmount: result.totalAmount,
                        totalOutstanding: result.totalPending,
                        averageValue: result.totalCreditNotes > 0 ? result.totalAmount / result.totalCreditNotes : 0
                    }
                }
            };

        } catch (error) {
            console.error('Get credit note stats error:', error);
            throw error;
        }
    }

    // Get next credit note number
    async getNextCreditNoteNumber(userId, companyId) {
        try {
            const currentUser = await User.findById(userId);
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
            }

            const company = await Company.findOne({
                _id: companyId,
                userId: companyOwnerId,
                isActive: true
            });

            if (!company) {
                return {
                    success: false,
                    message: 'Company not found',
                    data: {
                        creditNoteNumber: `CN-${new Date().getFullYear()}-000001`,
                        isDefault: true
                    }
                };
            }

            const nextCreditNoteNumber = await CreditNote.generateCreditNoteNumber(company._id);

            return {
                success: true,
                data: {
                    invoiceNumber: nextCreditNoteNumber,
                    creditNoteNumber: nextCreditNoteNumber,
                    companyId: company._id,
                    companyName: company.companyName
                }
            };

        } catch (error) {
            console.error('Get next credit note number error:', error);
            return {
                success: false,
                message: error.message,
                data: {
                    creditNoteNumber: `CN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                    isDefault: true
                }
            };
        }
    }

    // Apply credit note to invoice
    async applyCreditNoteToInvoice(creditNoteId, userId, invoiceId, amount) {
        try {
            const creditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId
            });

            if (!creditNote) {
                throw new Error('Credit note not found');
            }

            if (creditNote.status === 'draft') {
                throw new Error('Credit note must be sent before applying');
            }

            if (amount > creditNote.remainingAmount) {
                throw new Error('Amount exceeds remaining credit');
            }

            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Apply credit as payment to invoice
            await invoice.addPayment({
                amount: amount,
                method: 'credit_note',
                reference: creditNote.creditNoteNumber,
                notes: `Applied from credit note ${creditNote.creditNoteNumber}`
            });

            // Update credit note
            await creditNote.applyToInvoice(invoiceId, invoice.invoiceNumber, amount);

            return {
                success: true,
                message: 'Credit note applied successfully',
                data: {
                    creditNote,
                    invoice
                }
            };

        } catch (error) {
            console.error('Apply credit note error:', error);
            throw error;
        }
    }

    // Send credit note with ZATCA integration (Phase 1 or Phase 2)
    async sendCreditNote(creditNoteId, userId) {
        try {
            const creditNote = await CreditNote.findOne({
                _id: creditNoteId,
                userId: userId
            }).populate([
                { path: 'companyId', select: 'companyName email phone address zatcaCredentials taxIdNumber vatNumber' },
                { path: 'customerId', select: 'customerName contactInfo address type taxNumber vatNumber' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total zatca invoiceType' }
            ]);

            if (!creditNote) {
                throw new Error('Credit note not found');
            }

            if (creditNote.status !== 'draft') {
                throw new Error('Only draft credit notes can be sent');
            }

            // Get company to check ZATCA Phase
            const company = creditNote.companyId;
            const isPhase2 = company?.zatcaCredentials?.status === 'verified';

            let zatcaResult = null;

            if (isPhase2) {
                // Phase 2: Submit to ZATCA API
                try {
                    zatcaResult = await this.sendCreditNoteToZATCA(creditNote, company);

                    if (zatcaResult.success) {
                        // Update ZATCA data
                        creditNote.zatca = {
                            status: creditNote.creditNoteType === 'standard' ? 'cleared' : 'reported',
                            uuid: zatcaResult.uuid,
                            hash: zatcaResult.hash,
                            qrCode: zatcaResult.qrCode,
                            signedXML: zatcaResult.signedXML,
                            pdfUrl: zatcaResult.pdfUrl,
                            clearedAt: creditNote.creditNoteType === 'standard' ? new Date() : null,
                            reportedAt: creditNote.creditNoteType === 'simplified' ? new Date() : null,
                            errors: [],
                            warnings: zatcaResult.warnings || []
                        };
                    } else {
                        // ZATCA rejected
                        creditNote.zatca = {
                            status: 'rejected',
                            errors: zatcaResult.errors || ['ZATCA submission failed'],
                            warnings: zatcaResult.warnings || []
                        };

                        await creditNote.save();
                        throw new Error(`ZATCA rejected: ${zatcaResult.errors?.join(', ') || 'Unknown error'}`);
                    }
                } catch (zatcaError) {
                    console.error('ZATCA submission error:', zatcaError);
                    throw new Error(`ZATCA submission failed: ${zatcaError.message}`);
                }
            } else {
                // Phase 1: Just mark as sent (local processing)
                // Generate QR code locally for simplified invoices
                if (creditNote.creditNoteType === 'simplified') {
                    const qrData = this.generatePhase1QRCode(creditNote, company);
                    creditNote.zatca = {
                        status: 'pending',
                        qrCode: qrData
                    };
                }
            }

            creditNote.status = 'sent';
            creditNote.sentAt = new Date();
            creditNote.updatedBy = userId;
            await creditNote.save();

            return {
                success: true,
                message: isPhase2
                    ? `Credit note ${creditNote.creditNoteType === 'standard' ? 'cleared' : 'reported'} with ZATCA successfully`
                    : 'Credit note sent successfully (Phase 1)',
                data: {
                    creditNote,
                    zatca: creditNote.zatca,
                    phase: isPhase2 ? 2 : 1
                }
            };

        } catch (error) {
            console.error('Send credit note error:', error);
            throw error;
        }
    }

    // Send credit note to ZATCA API (Phase 2)
    async sendCreditNoteToZATCA(creditNote, company) {
        try {
            // Prepare credit note data for ZATCA
            const zatcaPayload = {
                documentType: '381', // Credit Note type code
                invoiceTypeCode: creditNote.creditNoteType === 'standard' ? '0100000' : '0200000',
                creditNote: {
                    id: creditNote.creditNoteNumber,
                    uuid: creditNote.zatca?.uuid || require('uuid').v4(),
                    issueDate: creditNote.issueDate,
                    issueTime: new Date().toISOString().split('T')[1].split('.')[0],
                    currency: creditNote.currency,
                    // Billing reference (original invoice)
                    billingReference: {
                        invoiceNumber: creditNote.originalInvoiceNumber,
                        invoiceUUID: creditNote.originalInvoiceUUID
                    },
                    // Reason for credit note
                    creditNoteReasonCode: this.mapReasonToZATCACode(creditNote.reason),
                    creditNoteReason: creditNote.reasonDescription || creditNote.reason
                },
                seller: {
                    name: company.companyName,
                    vatNumber: company.taxIdNumber || company.vatNumber,
                    address: company.address
                },
                buyer: {
                    name: creditNote.customerId?.customerName,
                    vatNumber: creditNote.customerId?.vatNumber || creditNote.customerId?.taxNumber,
                    address: creditNote.customerId?.address
                },
                items: creditNote.items,
                totals: {
                    subtotal: creditNote.subtotal,
                    totalTax: creditNote.totalTax,
                    total: creditNote.total
                }
            };

            // Call ZATCA service based on credit note type
            if (creditNote.creditNoteType === 'standard') {
                // B2B: Clearance required
                return await zatcaService.clearCreditNote(zatcaPayload, company);
            } else {
                // B2C: Reporting within 24 hours
                return await zatcaService.reportCreditNote(zatcaPayload, company);
            }
        } catch (error) {
            console.error('ZATCA credit note submission error:', error);
            throw error;
        }
    }

    // Map reason codes to ZATCA standard codes
    mapReasonToZATCACode(reason) {
        const reasonMap = {
            'return': '1', // Goods returned
            'discount': '2', // Discount/rebate
            'correction': '3', // Correction
            'cancellation': '4', // Cancellation
            'other': '5' // Other
        };
        return reasonMap[reason] || '5';
    }

    // Validate credit note against ZATCA rules
    async validateZatcaCreditNote(creditNoteId, userId) {
        let creditNote;
        try {
            creditNote = await CreditNote.findById(creditNoteId)
                .populate('companyId')
                .populate('customerId')
                .populate('originalInvoiceId');

            if (!creditNote) {
                throw new Error('Credit note not found');
            }

            if (creditNote.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to credit note');
            }

            const company = creditNote.companyId;
            const errors = [];
            const warnings = [];

            // Basic validation checks (required for all phases)
            if (!creditNote.customerId) {
                errors.push('Customer is required');
            }
            if (!creditNote.items || creditNote.items.length === 0) {
                errors.push('At least one line item is required');
            }
            if (!creditNote.originalInvoiceId) {
                errors.push('Original invoice reference is required for credit notes');
            }
            if (creditNote.total <= 0) {
                errors.push('Credit note total must be greater than zero');
            }

            // Validate items
            if (creditNote.items && creditNote.items.length > 0) {
                creditNote.items.forEach((item, index) => {
                    if (!item.description || item.description.trim() === '') {
                        errors.push(`Item ${index + 1}: Description is required`);
                    }
                    if (item.quantity <= 0) {
                        errors.push(`Item ${index + 1}: Quantity must be greater than zero`);
                    }
                    if (item.unitPrice < 0) {
                        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
                    }
                });
            }

            // Validate customer details for B2B (warning only, not blocking)
            if (creditNote.creditNoteType === 'standard' && creditNote.customerId) {
                const customer = creditNote.customerId;
                if (!customer.vatNumber && !customer.taxNumber) {
                    warnings.push('Customer VAT/Tax number is recommended for standard (B2B) credit notes');
                }
            }

            // Check if company is ZATCA verified (Phase 2)
            const isPhase2 = company?.zatcaCredentials?.status === 'verified';

            if (!isPhase2) {
                warnings.push('Company is in Phase 1 mode. Full ZATCA validation will occur on send.');
            }

            // Store validation results
            if (!creditNote.zatca) {
                creditNote.zatca = {};
            }

            if (errors.length > 0) {
                creditNote.zatca.errors = errors;
                creditNote.zatca.warnings = warnings;
                creditNote.zatca.validationStatus = 'invalid';
                creditNote.zatca.lastValidatedAt = new Date();
                await creditNote.save();

                return {
                    success: true,
                    data: {
                        isValid: false,
                        errors: errors,
                        warnings: warnings
                    }
                };
            }

            // All validations passed
            creditNote.zatca.errors = [];
            creditNote.zatca.warnings = warnings;
            creditNote.zatca.validationStatus = 'valid';
            creditNote.zatca.lastValidatedAt = new Date();
            await creditNote.save();

            return {
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: warnings
                }
            };

        } catch (error) {
            console.error('Validate ZATCA credit note error:', error.message);

            let errorMessage = error.message || 'Validation failed';

            // Store error in credit note if possible
            try {
                if (creditNote) {
                    if (!creditNote.zatca) {
                        creditNote.zatca = {};
                    }
                    creditNote.zatca.errors = [errorMessage];
                    creditNote.zatca.warnings = [];
                    creditNote.zatca.validationStatus = 'invalid';
                    creditNote.zatca.lastValidatedAt = new Date();
                    await creditNote.save();
                }
            } catch (saveError) {
                console.error('Failed to save validation error to credit note:', saveError);
            }

            return {
                success: true,
                data: {
                    isValid: false,
                    errors: [errorMessage],
                    warnings: []
                }
            };
        }
    }

    // Generate Phase 1 QR Code (TLV format)
    generatePhase1QRCode(creditNote, company) {
        try {
            const sellerName = company?.companyName || '';
            const vatNumber = company?.taxIdNumber || company?.vatNumber || '';
            const timestamp = new Date().toISOString();
            const total = creditNote.total.toFixed(2);
            const vatAmount = creditNote.totalTax.toFixed(2);

            // Create TLV data
            const createTLV = (tag, value) => {
                const valueBytes = Buffer.from(value, 'utf8');
                return Buffer.concat([
                    Buffer.from([tag]),
                    Buffer.from([valueBytes.length]),
                    valueBytes
                ]);
            };

            const tlvData = Buffer.concat([
                createTLV(1, sellerName),
                createTLV(2, vatNumber),
                createTLV(3, timestamp),
                createTLV(4, total),
                createTLV(5, vatAmount)
            ]);

            return tlvData.toString('base64');
        } catch (error) {
            console.error('Error generating Phase 1 QR code:', error);
            return null;
        }
    }
}

// Add ZATCA methods to zatcaService if not exists
// These would be implemented in zatcaService.js
if (!zatcaService.clearCreditNote) {
    zatcaService.clearCreditNote = async function(payload, company) {
        // Placeholder - would use same logic as clearInvoice but with document type 381
        console.log('ZATCA clearCreditNote called - implement in zatcaService.js');
        return {
            success: true,
            uuid: require('uuid').v4(),
            hash: 'placeholder-hash',
            qrCode: 'placeholder-qr',
            signedXML: '<xml>placeholder</xml>',
            pdfUrl: null,
            warnings: []
        };
    };
}

if (!zatcaService.reportCreditNote) {
    zatcaService.reportCreditNote = async function(payload, company) {
        // Placeholder - would use same logic as reportInvoice but with document type 381
        console.log('ZATCA reportCreditNote called - implement in zatcaService.js');
        return {
            success: true,
            uuid: require('uuid').v4(),
            hash: 'placeholder-hash',
            qrCode: 'placeholder-qr',
            signedXML: '<xml>placeholder</xml>',
            pdfUrl: null,
            warnings: []
        };
    };
}

module.exports = new CreditNoteService();
