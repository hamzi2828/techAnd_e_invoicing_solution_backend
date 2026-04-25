const DebitNote = require('../models/DebitNote');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const User = require('../models/User');
const zatcaService = require('./zatcaService');

class DebitNoteService {
    // Create a new debit note
    async createDebitNote(userId, debitNoteData) {
        try {
            const { customerId, companyId, items, originalInvoiceId, ...otherData } = debitNoteData;

            // Validate required fields
            if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
                throw new Error('Customer ID and items are required');
            }

            if (!otherData.reason) {
                throw new Error('Reason for debit note is required');
            }

            // ZATCA REQUIREMENT: Original invoice is MANDATORY for debit notes
            if (!originalInvoiceId) {
                throw new Error('Original invoice reference is required for debit notes (ZATCA requirement)');
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

            // Validate customer
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
            const debitNoteType = originalInvoice.invoiceType || 'standard';

            // Generate debit note number
            const debitNoteNumber = await DebitNote.generateDebitNoteNumber(companyId);

            // Check if already exists
            const existingDebitNote = await DebitNote.findOne({
                companyId: companyId,
                debitNoteNumber: debitNoteNumber
            });

            if (existingDebitNote) {
                throw new Error(`Debit note number ${debitNoteNumber} already exists`);
            }

            // Set due date
            const dueDate = otherData.dueDate
                ? new Date(otherData.dueDate)
                : new Date(Date.now() + (company.settings?.defaultDueDays || 30) * 24 * 60 * 60 * 1000);

            // Prepare debit note data
            const debitNotePayload = {
                userId,
                companyId,
                customerId,
                debitNoteNumber,
                debitNoteType: debitNoteType, // Inherited from original invoice
                issueDate: otherData.issueDate || new Date(),
                dueDate,
                currency: otherData.currency || company.currency || 'SAR',
                paymentTerms: otherData.paymentTerms || 'Net 30',

                // Original invoice reference (REQUIRED for ZATCA)
                originalInvoiceId: originalInvoiceId,
                originalInvoiceNumber: originalInvoiceNumber,
                originalInvoiceUUID: originalInvoiceUUID, // Phase 2 requirement
                originalInvoiceHash: originalInvoiceHash, // Phase 2 requirement

                // Reason
                reason: otherData.reason,
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

                createdBy: userId,
                updatedBy: userId
            };

            // Create the debit note
            const debitNote = new DebitNote(debitNotePayload);
            await debitNote.save();

            // Populate related data
            await debitNote.populate([
                { path: 'companyId', select: 'companyName email phone address zatcaCredentials' },
                { path: 'customerId', select: 'customerName contactInfo address type' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total zatca invoiceType' }
            ]);

            return {
                success: true,
                message: 'Debit note created successfully',
                data: {
                    debitNote,
                    debitNoteNumber,
                    total: debitNote.total,
                    dueDate: debitNote.dueDate
                }
            };

        } catch (error) {
            console.error('Create debit note error:', error);
            throw error;
        }
    }

    // Validate customer
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

    // Process items
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
                description: item.description?.trim() || 'Additional charge',
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                taxRate: item.taxRate !== undefined ? parseFloat(item.taxRate) : 15,
                discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
                totalPrice: 0,
                taxAmount: 0
            };
        });
    }

    // Get all debit notes
    async getDebitNotes(userId, filters = {}) {
        try {
            const query = { userId, isDeleted: { $ne: true } };

            if (filters.companyId) query.companyId = filters.companyId;
            if (filters.status) query.status = filters.status;
            if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
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
                    { debitNoteNumber: { $regex: filters.search, $options: 'i' } },
                    { reasonDescription: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const skip = (page - 1) * limit;

            const sortBy = filters.sortBy || '-createdAt';

            const debitNotes = await DebitNote.find(query)
                .populate('companyId', 'companyName')
                .populate('customerId', 'customerName contactInfo')
                .populate('originalInvoiceId', 'invoiceNumber')
                .sort(sortBy)
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await DebitNote.countDocuments(query);

            return {
                success: true,
                data: {
                    invoices: debitNotes, // Keep as 'invoices' for frontend compatibility
                    pagination: {
                        current: page,
                        pages: Math.ceil(total / limit),
                        total,
                        limit
                    }
                }
            };

        } catch (error) {
            console.error('Get debit notes error:', error);
            throw error;
        }
    }

    // Get single debit note by ID
    async getDebitNoteById(debitNoteId, userId) {
        try {
            const debitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId
            }).populate([
                { path: 'companyId', select: 'companyName email phone address settings zatcaCredentials' },
                { path: 'customerId', select: 'customerName contactInfo address' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total status' }
            ]);

            if (!debitNote) {
                throw new Error('Debit note not found');
            }

            return {
                success: true,
                data: { invoice: debitNote } // Keep as 'invoice' for frontend compatibility
            };

        } catch (error) {
            console.error('Get debit note by ID error:', error);
            throw error;
        }
    }

    // Update debit note (draft only)
    async updateDebitNote(debitNoteId, userId, debitNoteData) {
        try {
            const { customerId, companyId, items, ...otherData } = debitNoteData;

            const existingDebitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId
            });

            if (!existingDebitNote) {
                throw new Error('Debit note not found or not accessible');
            }

            if (existingDebitNote.status !== 'draft') {
                throw new Error('Only draft debit notes can be updated');
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

            // Set due date
            const dueDate = otherData.dueDate
                ? new Date(otherData.dueDate)
                : existingDebitNote.dueDate;

            // Update fields
            existingDebitNote.companyId = companyId;
            existingDebitNote.customerId = customerId;
            existingDebitNote.debitNoteType = otherData.debitNoteType || existingDebitNote.debitNoteType;
            existingDebitNote.issueDate = otherData.issueDate || existingDebitNote.issueDate;
            existingDebitNote.dueDate = dueDate;
            existingDebitNote.currency = otherData.currency || existingDebitNote.currency;
            existingDebitNote.paymentTerms = otherData.paymentTerms || existingDebitNote.paymentTerms;
            existingDebitNote.reason = otherData.reason || existingDebitNote.reason;
            existingDebitNote.reasonDescription = otherData.reasonDescription || otherData.notes;

            existingDebitNote.customerInfo = { customerId: customerId };
            existingDebitNote.items = this.processItems(items);
            existingDebitNote.notes = otherData.notes;
            existingDebitNote.termsAndConditions = otherData.termsAndConditions;
            existingDebitNote.discount = otherData.discount || 0;
            existingDebitNote.discountType = otherData.discountType || 'percentage';
            existingDebitNote.isVatApplicable = company.vatRegistered && (otherData.isVatApplicable !== false);
            existingDebitNote.vatRegistration = company.vatNumber;
            existingDebitNote.updatedBy = userId;

            await existingDebitNote.save();

            await existingDebitNote.populate([
                { path: 'companyId', select: 'companyName email phone address' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            return {
                success: true,
                message: 'Debit note updated successfully',
                data: {
                    debitNote: existingDebitNote,
                    total: existingDebitNote.total,
                    dueDate: existingDebitNote.dueDate
                }
            };

        } catch (error) {
            console.error('Update debit note error:', error);
            throw error;
        }
    }

    // Update debit note status
    async updateDebitNoteStatus(debitNoteId, userId, status) {
        try {
            const validStatuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const debitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId
            });

            if (!debitNote) {
                throw new Error('Debit note not found');
            }

            debitNote.status = status;
            debitNote.updatedBy = userId;

            if (status === 'sent') {
                debitNote.sentAt = new Date();
            }

            await debitNote.save();

            return {
                success: true,
                message: 'Debit note status updated successfully',
                data: { debitNote }
            };

        } catch (error) {
            console.error('Update debit note status error:', error);
            throw error;
        }
    }

    // Soft delete debit note
    async softDeleteDebitNote(debitNoteId, userId) {
        try {
            const debitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId,
                isDeleted: { $ne: true }
            });

            if (!debitNote) {
                return {
                    success: false,
                    message: 'Debit note not found'
                };
            }

            if (debitNote.status !== 'draft') {
                return {
                    success: false,
                    message: 'Only draft debit notes can be deleted'
                };
            }

            debitNote.isDeleted = true;
            debitNote.deletedAt = new Date();
            debitNote.deletedBy = userId;
            await debitNote.save();

            return {
                success: true,
                message: 'Debit note deleted successfully'
            };

        } catch (error) {
            console.error('Soft delete debit note error:', error);
            throw error;
        }
    }

    // Add payment to debit note
    async addPayment(debitNoteId, userId, paymentData) {
        try {
            const debitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId
            });

            if (!debitNote) {
                throw new Error('Debit note not found');
            }

            if (paymentData.amount <= 0) {
                throw new Error('Payment amount must be positive');
            }

            if (paymentData.amount > debitNote.remainingAmount) {
                throw new Error('Payment amount cannot exceed remaining amount');
            }

            await debitNote.addPayment(paymentData);

            return {
                success: true,
                message: 'Payment added successfully',
                data: { debitNote }
            };

        } catch (error) {
            console.error('Add payment error:', error);
            throw error;
        }
    }

    // Get debit note statistics
    async getDebitNoteStats(userId, companyId) {
        try {
            const matchQuery = { userId, isDeleted: { $ne: true } };
            if (companyId) matchQuery.companyId = mongoose.Types.ObjectId(companyId);

            const stats = await DebitNote.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalDebitNotes: { $sum: 1 },
                        totalAmount: { $sum: '$total' },
                        totalPaid: { $sum: '$paidAmount' },
                        totalPending: { $sum: '$remainingAmount' },
                        draftCount: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                        sentCount: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
                    }
                }
            ]);

            const result = stats[0] || {
                totalDebitNotes: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                draftCount: 0,
                sentCount: 0,
                paidCount: 0,
                overdueCount: 0
            };

            return {
                success: true,
                data: {
                    stats: {
                        totalDebitNotes: result.totalDebitNotes,
                        draftDebitNotes: result.draftCount,
                        sentDebitNotes: result.sentCount,
                        paidDebitNotes: result.paidCount,
                        overdueDebitNotes: result.overdueCount,
                        totalAmount: result.totalAmount,
                        totalOutstanding: result.totalPending,
                        averageValue: result.totalDebitNotes > 0 ? result.totalAmount / result.totalDebitNotes : 0
                    }
                }
            };

        } catch (error) {
            console.error('Get debit note stats error:', error);
            throw error;
        }
    }

    // Get next debit note number
    async getNextDebitNoteNumber(userId, companyId) {
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
                        debitNoteNumber: `DN-${new Date().getFullYear()}-000001`,
                        isDefault: true
                    }
                };
            }

            const nextDebitNoteNumber = await DebitNote.generateDebitNoteNumber(company._id);

            return {
                success: true,
                data: {
                    invoiceNumber: nextDebitNoteNumber, // Keep for frontend compatibility
                    debitNoteNumber: nextDebitNoteNumber,
                    companyId: company._id,
                    companyName: company.companyName
                }
            };

        } catch (error) {
            console.error('Get next debit note number error:', error);
            return {
                success: false,
                message: error.message,
                data: {
                    debitNoteNumber: `DN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                    isDefault: true
                }
            };
        }
    }

    // Send debit note with ZATCA integration (Phase 1 or Phase 2)
    async sendDebitNote(debitNoteId, userId) {
        try {
            const debitNote = await DebitNote.findOne({
                _id: debitNoteId,
                userId: userId
            }).populate([
                { path: 'companyId', select: 'companyName email phone address zatcaCredentials taxIdNumber vatNumber' },
                { path: 'customerId', select: 'customerName contactInfo address type taxNumber vatNumber' },
                { path: 'originalInvoiceId', select: 'invoiceNumber total zatca invoiceType' }
            ]);

            if (!debitNote) {
                throw new Error('Debit note not found');
            }

            if (debitNote.status !== 'draft') {
                throw new Error('Only draft debit notes can be sent');
            }

            // Get company to check ZATCA Phase
            const company = debitNote.companyId;
            const isPhase2 = company?.zatcaCredentials?.status === 'verified';

            let zatcaResult = null;

            if (isPhase2) {
                // Phase 2: Submit to ZATCA API
                try {
                    zatcaResult = await this.sendDebitNoteToZATCA(debitNote, company);

                    if (zatcaResult.success) {
                        // Update ZATCA data
                        debitNote.zatca = {
                            status: debitNote.debitNoteType === 'standard' ? 'cleared' : 'reported',
                            uuid: zatcaResult.uuid,
                            hash: zatcaResult.hash,
                            qrCode: zatcaResult.qrCode,
                            signedXML: zatcaResult.signedXML,
                            pdfUrl: zatcaResult.pdfUrl,
                            clearedAt: debitNote.debitNoteType === 'standard' ? new Date() : null,
                            reportedAt: debitNote.debitNoteType === 'simplified' ? new Date() : null,
                            errors: [],
                            warnings: zatcaResult.warnings || []
                        };
                    } else {
                        // ZATCA rejected
                        debitNote.zatca = {
                            status: 'rejected',
                            errors: zatcaResult.errors || ['ZATCA submission failed'],
                            warnings: zatcaResult.warnings || []
                        };

                        await debitNote.save();
                        throw new Error(`ZATCA rejected: ${zatcaResult.errors?.join(', ') || 'Unknown error'}`);
                    }
                } catch (zatcaError) {
                    console.error('ZATCA submission error:', zatcaError);
                    throw new Error(`ZATCA submission failed: ${zatcaError.message}`);
                }
            } else {
                // Phase 1: Just mark as sent (local processing)
                // Generate QR code locally for simplified invoices
                if (debitNote.debitNoteType === 'simplified') {
                    const qrData = this.generatePhase1QRCode(debitNote, company);
                    debitNote.zatca = {
                        status: 'pending',
                        qrCode: qrData
                    };
                }
            }

            debitNote.status = 'sent';
            debitNote.sentAt = new Date();
            debitNote.updatedBy = userId;
            await debitNote.save();

            return {
                success: true,
                message: isPhase2
                    ? `Debit note ${debitNote.debitNoteType === 'standard' ? 'cleared' : 'reported'} with ZATCA successfully`
                    : 'Debit note sent successfully (Phase 1)',
                data: {
                    debitNote,
                    zatca: debitNote.zatca,
                    phase: isPhase2 ? 2 : 1
                }
            };

        } catch (error) {
            console.error('Send debit note error:', error);
            throw error;
        }
    }

    // Send debit note to ZATCA API (Phase 2)
    async sendDebitNoteToZATCA(debitNote, company) {
        try {
            // Prepare debit note data for ZATCA
            const zatcaPayload = {
                documentType: '383', // Debit Note type code
                invoiceTypeCode: debitNote.debitNoteType === 'standard' ? '0100000' : '0200000',
                debitNote: {
                    id: debitNote.debitNoteNumber,
                    uuid: debitNote.zatca?.uuid || require('uuid').v4(),
                    issueDate: debitNote.issueDate,
                    issueTime: new Date().toISOString().split('T')[1].split('.')[0],
                    dueDate: debitNote.dueDate,
                    currency: debitNote.currency,
                    // Billing reference (original invoice)
                    billingReference: {
                        invoiceNumber: debitNote.originalInvoiceNumber,
                        invoiceUUID: debitNote.originalInvoiceUUID
                    },
                    // Reason for debit note
                    debitNoteReasonCode: this.mapReasonToZATCACode(debitNote.reason),
                    debitNoteReason: debitNote.reasonDescription || debitNote.reason
                },
                seller: {
                    name: company.companyName,
                    vatNumber: company.taxIdNumber || company.vatNumber,
                    address: company.address
                },
                buyer: {
                    name: debitNote.customerId?.customerName,
                    vatNumber: debitNote.customerId?.vatNumber || debitNote.customerId?.taxNumber,
                    address: debitNote.customerId?.address
                },
                items: debitNote.items,
                totals: {
                    subtotal: debitNote.subtotal,
                    totalTax: debitNote.totalTax,
                    total: debitNote.total
                }
            };

            // Call ZATCA service based on debit note type
            if (debitNote.debitNoteType === 'standard') {
                // B2B: Clearance required
                return await zatcaService.clearDebitNote(zatcaPayload, company);
            } else {
                // B2C: Reporting within 24 hours
                return await zatcaService.reportDebitNote(zatcaPayload, company);
            }
        } catch (error) {
            console.error('ZATCA debit note submission error:', error);
            throw error;
        }
    }

    // Map reason codes to ZATCA standard codes
    mapReasonToZATCACode(reason) {
        const reasonMap = {
            'additional_charge': '1', // Additional charges
            'price_adjustment': '2', // Price adjustment
            'correction': '3', // Correction
            'service_fee': '4', // Service fee
            'other': '5' // Other
        };
        return reasonMap[reason] || '5';
    }

    // Validate debit note against ZATCA rules
    async validateZatcaDebitNote(debitNoteId, userId) {
        let debitNote;
        try {
            debitNote = await DebitNote.findById(debitNoteId)
                .populate('companyId')
                .populate('customerId')
                .populate('originalInvoiceId');

            if (!debitNote) {
                throw new Error('Debit note not found');
            }

            if (debitNote.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to debit note');
            }

            const company = debitNote.companyId;
            const errors = [];
            const warnings = [];

            // Basic validation checks (required for all phases)
            if (!debitNote.customerId) {
                errors.push('Customer is required');
            }
            if (!debitNote.items || debitNote.items.length === 0) {
                errors.push('At least one line item is required');
            }
            if (!debitNote.originalInvoiceId) {
                errors.push('Original invoice reference is required for debit notes');
            }
            if (debitNote.total <= 0) {
                errors.push('Debit note total must be greater than zero');
            }

            // Validate items
            if (debitNote.items && debitNote.items.length > 0) {
                debitNote.items.forEach((item, index) => {
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

            // Validate customer details for B2B (warning only)
            if (debitNote.debitNoteType === 'standard' && debitNote.customerId) {
                const customer = debitNote.customerId;
                if (!customer.vatNumber && !customer.taxNumber) {
                    warnings.push('Customer VAT/Tax number is recommended for standard (B2B) debit notes');
                }
            }

            // Check if company is ZATCA verified (Phase 2)
            const isPhase2 = company?.zatcaCredentials?.status === 'verified';

            if (!isPhase2) {
                warnings.push('Company is in Phase 1 mode. Full ZATCA validation will occur on send.');
            }

            // Store validation results
            if (!debitNote.zatca) {
                debitNote.zatca = {};
            }

            if (errors.length > 0) {
                debitNote.zatca.errors = errors;
                debitNote.zatca.warnings = warnings;
                debitNote.zatca.validationStatus = 'invalid';
                debitNote.zatca.lastValidatedAt = new Date();
                await debitNote.save();

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
            debitNote.zatca.errors = [];
            debitNote.zatca.warnings = warnings;
            debitNote.zatca.validationStatus = 'valid';
            debitNote.zatca.lastValidatedAt = new Date();
            await debitNote.save();

            return {
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: warnings
                }
            };

        } catch (error) {
            console.error('Validate ZATCA debit note error:', error.message);

            let errorMessage = error.message || 'Validation failed';

            // Store error in debit note if possible
            try {
                if (debitNote) {
                    if (!debitNote.zatca) {
                        debitNote.zatca = {};
                    }
                    debitNote.zatca.errors = [errorMessage];
                    debitNote.zatca.warnings = [];
                    debitNote.zatca.validationStatus = 'invalid';
                    debitNote.zatca.lastValidatedAt = new Date();
                    await debitNote.save();
                }
            } catch (saveError) {
                console.error('Failed to save validation error to debit note:', saveError);
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
    generatePhase1QRCode(debitNote, company) {
        try {
            const sellerName = company?.companyName || '';
            const vatNumber = company?.taxIdNumber || company?.vatNumber || '';
            const timestamp = new Date().toISOString();
            const total = debitNote.total.toFixed(2);
            const vatAmount = debitNote.totalTax.toFixed(2);

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
if (!zatcaService.clearDebitNote) {
    zatcaService.clearDebitNote = async function(payload, company) {
        // Placeholder - would use same logic as clearInvoice but with document type 383
        console.log('ZATCA clearDebitNote called - implement in zatcaService.js');
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

if (!zatcaService.reportDebitNote) {
    zatcaService.reportDebitNote = async function(payload, company) {
        // Placeholder - would use same logic as reportInvoice but with document type 383
        console.log('ZATCA reportDebitNote called - implement in zatcaService.js');
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

module.exports = new DebitNoteService();
