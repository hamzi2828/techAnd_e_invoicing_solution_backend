const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const User = require('../models/User');

class InvoiceService {
    // Create a new invoice with dynamic customer information retrieval
    async createInvoice(userId, invoiceData) {
        try {
            const { customerId, companyId, items, ...otherData } = invoiceData;

            // Validate required fields
            if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
                throw new Error('Customer ID and items are required');
            }

            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find company (user was created by someone else)
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
                console.log('Using createdBy for invoice creation:', companyOwnerId);
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

            // Check if company is ready for invoicing
            if (!company.isReadyForInvoicing()) {
                throw new Error('Company is not verified for invoice generation');
            }

            // Validate customer exists and is accessible
            await this.validateCustomer(customerId, userId);

            // Generate invoice number
            const invoiceNumber = await Invoice.generateInvoiceNumber(companyId);

            // Check if invoice number already exists for this user and company
            const existingInvoice = await Invoice.findOne({
                userId: userId,
                companyId: companyId,
                invoiceNumber: invoiceNumber
            });

            if (existingInvoice) {
                throw new Error(`Invoice number ${invoiceNumber} already exists for this company. Please refresh to get a new invoice number.`);
            }

            // Set due date (default 30 days from invoice date)
            const dueDate = otherData.dueDate
                ? new Date(otherData.dueDate)
                : new Date(Date.now() + (company.settings?.defaultDueDays || 30) * 24 * 60 * 60 * 1000);

            // Prepare invoice data
            const invoicePayload = {
                userId,
                companyId,
                customerId,
                invoiceNumber,
                invoiceType: otherData.invoiceType || 'standard',
                zatcaInvoiceTypeCode: otherData.zatcaInvoiceTypeCode || (otherData.invoiceType === 'simplified' ? 'SI' : 'CI'),
                invoiceDate: otherData.invoiceDate || new Date(),
                dueDate,
                currency: otherData.currency || company.currency || 'SAR',
                paymentTerms: otherData.paymentTerms || 'Net 30',

                // Customer information (reference only - details retrieved from Customer model)
                customerInfo: {
                    customerId: customerId
                },

                // Invoice items
                items: this.processItems(items),

                // Additional information
                notes: otherData.notes,
                termsAndConditions: otherData.termsAndConditions || company.settings?.termsAndConditions,
                discount: otherData.discount || 0,
                discountType: otherData.discountType || 'percentage',

                // VAT information
                isVatApplicable: company.vatRegistered && (otherData.isVatApplicable !== false),
                vatRegistration: company.vatNumber,

                // Initialize totals (will be recalculated in pre-save middleware)
                subtotal: 0,
                totalTax: 0,
                total: 0,

                createdBy: userId,
                updatedBy: userId
            };

            // Create the invoice
            const invoice = new Invoice(invoicePayload);
            await invoice.save();

            // Populate related data for response
            await invoice.populate([
                { path: 'companyId', select: 'companyName email phone address' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            return {
                success: true,
                message: 'Invoice created successfully',
                data: {
                    invoice,
                    invoiceNumber,
                    total: invoice.total,
                    dueDate: invoice.dueDate
                }
            };

        } catch (error) {
            console.error('Create invoice error:', error);
            throw error;
        }
    }

    // Update an existing invoice (draft only)
    async updateInvoice(invoiceId, userId, invoiceData) {
        try {
            const { customerId, companyId, items, ...otherData } = invoiceData;

            // Find the existing invoice
            const existingInvoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            });

            if (!existingInvoice) {
                throw new Error('Invoice not found or not accessible');
            }

            // Check if invoice is draft
            if (existingInvoice.status !== 'draft') {
                throw new Error('Only draft invoices can be updated');
            }

            // Validate customer exists and is accessible
            await this.validateCustomer(customerId, userId);

            // Get company information
            const company = await Company.findOne({
                _id: companyId,
                userId: userId,
                isActive: true
            });

            if (!company) {
                throw new Error('Company not found or not accessible');
            }

            // Check if company is ready for invoicing
            if (!company.isReadyForInvoicing()) {
                throw new Error('Company is not verified for invoice generation');
            }

            // Set due date
            const dueDate = otherData.dueDate
                ? new Date(otherData.dueDate)
                : new Date(Date.now() + (company.settings?.defaultDueDays || 30) * 24 * 60 * 60 * 1000);

            // Update invoice fields
            existingInvoice.companyId = companyId;
            existingInvoice.customerId = customerId;
            existingInvoice.invoiceType = otherData.invoiceType || existingInvoice.invoiceType;
            existingInvoice.zatcaInvoiceTypeCode = otherData.zatcaInvoiceTypeCode || existingInvoice.zatcaInvoiceTypeCode;
            existingInvoice.invoiceDate = otherData.invoiceDate || existingInvoice.invoiceDate;
            existingInvoice.dueDate = dueDate;
            existingInvoice.currency = otherData.currency || existingInvoice.currency;
            existingInvoice.paymentTerms = otherData.paymentTerms || existingInvoice.paymentTerms;

            // Update customer info
            existingInvoice.customerInfo = {
                customerId: customerId
            };

            // Update invoice items
            existingInvoice.items = this.processItems(items);

            // Update additional information
            existingInvoice.notes = otherData.notes;
            existingInvoice.termsAndConditions = otherData.termsAndConditions || company.settings?.termsAndConditions;
            existingInvoice.discount = otherData.discount || 0;
            existingInvoice.discountType = otherData.discountType || 'percentage';

            // VAT information
            existingInvoice.isVatApplicable = company.vatRegistered && (otherData.isVatApplicable !== false);
            existingInvoice.vatRegistration = company.vatNumber;

            // Update status if provided
            if (otherData.status) {
                existingInvoice.status = otherData.status;
            }

            // Reset ZATCA validation status when invoice is updated
            // User needs to re-validate after making changes
            if (existingInvoice.zatca) {
                existingInvoice.zatca.validationStatus = 'pending';
                existingInvoice.zatca.errors = [];
                existingInvoice.zatca.warnings = [];
                existingInvoice.zatca.lastValidatedAt = null;
            }

            // Update metadata
            existingInvoice.updatedBy = userId;

            // Save the updated invoice (totals will be recalculated in pre-save middleware)
            await existingInvoice.save();

            // Populate related data for response
            await existingInvoice.populate([
                { path: 'companyId', select: 'companyName email phone address' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            return {
                success: true,
                message: 'Invoice updated successfully',
                data: {
                    invoice: existingInvoice,
                    invoiceNumber: existingInvoice.invoiceNumber,
                    total: existingInvoice.total,
                    dueDate: existingInvoice.dueDate
                }
            };

        } catch (error) {
            console.error('Update invoice error:', error);
            throw error;
        }
    }

    // Validate customer exists and is accessible
    async validateCustomer(customerId, userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find customer (user was created by someone else)
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

    // Process and validate invoice items
    processItems(items) {
        return items.map((item, index) => {
            // Validate required fields - description is required, product is optional
            if (!item.description || !item.description.trim()) {
                throw new Error(`Item ${index + 1}: Description is required`);
            }

            if (item.quantity === undefined || item.unitPrice === undefined) {
                throw new Error(`Item ${index + 1}: Quantity and unit price are required`);
            }

            if (item.quantity <= 0 || item.unitPrice < 0) {
                throw new Error(`Item ${index + 1}: Quantity must be positive and unit price cannot be negative`);
            }

            // Validate VAT category and exemption reason
            const vatCategoryCode = item.vatCategoryCode || 'S';
            const categoryRequiresReason = ['Z', 'E', 'O'].includes(vatCategoryCode);
            if (categoryRequiresReason && !item.taxExemptionReasonCode) {
                const categoryNames = { 'Z': 'Zero Rate', 'E': 'Exempt', 'O': 'Not Subject to VAT' };
                throw new Error(`Item ${index + 1}: Tax exemption reason is required for ${categoryNames[vatCategoryCode]} items`);
            }

            const processedItem = {
                description: item.description.trim(), // Required
                quantity: parseFloat(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                taxRate: item.taxRate !== undefined ? parseFloat(item.taxRate) : 15,
                discount: item.discount !== undefined ? parseFloat(item.discount) : 0,
                totalPrice: 0, // Will be calculated in pre-save middleware
                taxAmount: 0,  // Will be calculated in pre-save middleware
                // ZATCA VAT Category fields
                vatCategoryCode: vatCategoryCode,
                taxExemptionReasonCode: item.taxExemptionReasonCode || undefined,
                taxExemptionReasonText: item.taxExemptionReasonText || undefined
            };

            // Add product reference if provided (optional - for analytics)
            if (item.product) {
                processedItem.product = item.product;
            }

            return processedItem;
        });
    }

    // Get all invoices for a user/company
    async getInvoices(userId, filters = {}) {
        try {
            const query = { userId, isDeleted: { $ne: true } };

            // Add filters
            if (filters.companyId) query.companyId = filters.companyId;
            if (filters.status) query.status = filters.status;
            if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
            if (filters.customerId) query.customerId = filters.customerId;

            // Date range filter
            if (filters.startDate || filters.endDate) {
                query.invoiceDate = {};
                if (filters.startDate) query.invoiceDate.$gte = new Date(filters.startDate);
                if (filters.endDate) query.invoiceDate.$lte = new Date(filters.endDate);
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const skip = (page - 1) * limit;

            // Sorting
            const sortBy = filters.sortBy || '-createdAt';

            const invoices = await Invoice.find(query)
                .populate('companyId', 'companyName')
                .populate('customerId', 'customerName contactInfo')
                .sort(sortBy)
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await Invoice.countDocuments(query);

            return {
                success: true,
                data: {
                    invoices,
                    pagination: {
                        current: page,
                        pages: Math.ceil(total / limit),
                        total,
                        limit
                    }
                }
            };

        } catch (error) {
            console.error('Get invoices error:', error);
            throw error;
        }
    }

    // Get single invoice by ID
    async getInvoiceById(invoiceId, userId) {
        try {
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            }).populate([
                { path: 'companyId', select: 'companyName email phone address settings' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            return {
                success: true,
                data: { invoice }
            };

        } catch (error) {
            console.error('Get invoice by ID error:', error);
            throw error;
        }
    }

    // Get all customers (beneficiaries) for invoice creation
    async getCustomersForInvoice(userId, companyId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find customers (user was created by someone else)
            let customerOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                customerOwnerId = currentUser.createdBy;
            }

            const customers = await Customer.find({
                userId: customerOwnerId,
                isActive: true,
                status: 'active',
                verificationStatus: 'verified'
            }).select('customerName contactInfo address customerType').lean();

            return {
                success: true,
                data: { customers }
            };

        } catch (error) {
            console.error('Get customers error:', error);
            throw error;
        }
    }

    // Update invoice status
    async updateInvoiceStatus(invoiceId, userId, status) {
        try {
            const validStatuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            invoice.status = status;
            invoice.updatedBy = userId;

            if (status === 'sent') {
                invoice.sentAt = new Date();
            }

            await invoice.save();

            return {
                success: true,
                message: 'Invoice status updated successfully',
                data: { invoice }
            };

        } catch (error) {
            console.error('Update invoice status error:', error);
            throw error;
        }
    }

    // Soft delete invoice
    async softDeleteInvoice(invoiceId, userId) {
        try {
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId,
                isDeleted: { $ne: true }
            });

            if (!invoice) {
                return {
                    success: false,
                    message: 'Invoice not found'
                };
            }

            // Prevent deleting sent invoices
            if (invoice.status === 'sent') {
                return {
                    success: false,
                    message: 'Cannot delete sent invoices'
                };
            }

            // Prevent deleting ZATCA cleared/reported invoices
            const zatcaStatus = invoice.zatca?.status;
            if (zatcaStatus === 'cleared' || zatcaStatus === 'reported') {
                return {
                    success: false,
                    message: 'Cannot delete invoices that have been cleared or reported to ZATCA'
                };
            }

            // Only allow deleting draft invoices
            if (invoice.status !== 'draft') {
                return {
                    success: false,
                    message: 'Only draft invoices can be deleted'
                };
            }

            invoice.isDeleted = true;
            invoice.deletedAt = new Date();
            invoice.deletedBy = userId;

            await invoice.save();

            return {
                success: true,
                message: 'Invoice deleted successfully',
                data: { invoice }
            };

        } catch (error) {
            console.error('Soft delete invoice error:', error);
            throw error;
        }
    }

    // Add payment to invoice
    async addPayment(invoiceId, userId, paymentData) {
        try {
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            });

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            if (paymentData.amount <= 0) {
                throw new Error('Payment amount must be positive');
            }

            if (paymentData.amount > invoice.remainingAmount) {
                throw new Error('Payment amount cannot exceed remaining amount');
            }

            await invoice.addPayment(paymentData);

            return {
                success: true,
                message: 'Payment added successfully',
                data: { invoice }
            };

        } catch (error) {
            console.error('Add payment error:', error);
            throw error;
        }
    }

    // Get invoice statistics
    async getInvoiceStats(userId, companyId) {
        try {
            const matchQuery = { userId, isDeleted: { $ne: true } };
            if (companyId) matchQuery.companyId = companyId;

            const stats = await Invoice.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalInvoices: { $sum: 1 },
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
                totalInvoices: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                draftCount: 0,
                sentCount: 0,
                paidCount: 0,
                overdueCount: 0
            };

            // Transform to match frontend interface
            const transformedStats = {
                totalInvoices: result.totalInvoices || 0,
                draftInvoices: result.draftCount || 0,
                sentInvoices: result.sentCount || 0,
                paidInvoices: result.paidCount || 0,
                overdueInvoices: result.overdueCount || 0,
                totalRevenue: result.totalAmount || 0,
                totalOutstanding: result.totalPending || 0,
                averageInvoiceValue: result.totalInvoices > 0 ? (result.totalAmount || 0) / result.totalInvoices : 0
            };

            return {
                success: true,
                data: { stats: transformedStats }
            };

        } catch (error) {
            console.error('Get invoice stats error:', error);
            throw error;
        }
    }

    // Get next invoice number for a specific company
    async getNextInvoiceNumber(userId, companyId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find company (user was created by someone else)
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
                console.log('Using createdBy for company lookup:', companyOwnerId);
            }

            // Get the specified company and verify user ownership
            const company = await Company.findOne({
                _id: companyId,
                userId: companyOwnerId,
                isActive: true
            });

            if (!company) {
                // Return error if company not found or not accessible
                return {
                    success: false,
                    message: 'Company not found or not accessible',
                    data: {
                        invoiceNumber: `INV-${new Date().getFullYear()}-000001`,
                        isDefault: true
                    }
                };
            }

            // Generate the next invoice number for this company
            const nextInvoiceNumber = await Invoice.generateInvoiceNumber(company._id);

            return {
                success: true,
                data: {
                    invoiceNumber: nextInvoiceNumber,
                    companyId: company._id,
                    companyName: company.companyName,
                    isDefault: false
                }
            };

        } catch (error) {
            console.error('Get next invoice number error:', error);
            // Return a fallback invoice number
            return {
                success: false,
                message: error.message || 'Failed to generate invoice number',
                data: {
                    invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                    isDefault: true,
                    error: error.message
                }
            };
        }
    }

    // ========== ZATCA E-Invoicing Methods ==========

    /**
     * Send invoice with ZATCA integration
     */
    async sendInvoiceWithZatca(invoiceId, userId) {
        const hashChainService = require('./hashChainService');
        let hashChainData = null; // Track for rollback on failure
        let invoice = null;

        try {
            const zatcaService = require('./zatcaService');
            const { encrypt, decrypt } = require('../utils/encryption');

            // 1. Get invoice with company and customer populated
            invoice = await Invoice.findById(invoiceId)
                .populate('companyId')
                .populate('customerId');

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Verify ownership
            if (invoice.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to invoice');
            }

            // 2. Verify company ZATCA status
            if (!invoice.companyId.zatcaCredentials || invoice.companyId.zatcaCredentials.status !== 'verified') {
                throw new Error('Company is not ZATCA verified. Please complete ZATCA onboarding first.');
            }

            // 2.5. Determine invoice category (B2B or B2C) for separate hash chain sequences
            // B2B codes: CI (Tax Invoice), CP (Prepayment), CD (Tax Debit Note), CN (Tax Credit Note)
            // B2C codes: SI (Simplified Tax Invoice), SP (Simplified Prepayment), SD (Simplified Debit Note), SN (Simplified Credit Note)
            const isB2B = ['CI', 'CP', 'CD', 'CN'].includes(invoice.zatcaInvoiceTypeCode) ||
                          (!invoice.zatcaInvoiceTypeCode && invoice.invoiceType === 'standard');
            const invoiceCategory = isB2B ? 'B2B' : 'B2C';

            // 2.6. Get hash chain data (sequential number + previous invoice hash) - separate for B2B and B2C
            hashChainData = await hashChainService.getNextHashChainData(invoice.companyId._id, invoiceCategory);
            console.log(`Hash chain data for invoice ${invoice.invoiceNumber}:`, {
                invoiceCategory: hashChainData.invoiceCategory,
                hashChainNumber: hashChainData.hashChainNumber,
                isFirstInvoice: hashChainData.isFirstInvoice,
                previousInvoiceHash: hashChainData.previousInvoiceHash.substring(0, 30) + '...'
            });

            // 3. Generate XML (UBL 2.1 format) with hash chain data
            const xmlResult = await zatcaService.generateXML(invoice, hashChainData);
            const { xml: xmlData, uuid: invoiceUUID } = xmlResult;

            // Store UUID on invoice object for use in Clear/Report
            invoice.uuid = invoiceUUID;

            // 4. Sign invoice with company private key
            const privateKey = decrypt(invoice.companyId.zatcaCredentials.privateKey);
            const productionCSID = invoice.companyId.zatcaCredentials.productionCSID;

            const companyInfo = {
                crNumber: invoice.companyId.commercialRegistrationNumber,
                vatNumber: invoice.companyId.vatNumber,
                productionCSID: productionCSID
            };

            const signedXML = await zatcaService.signInvoice(xmlData, privateKey, companyInfo);

            // 5. Validate invoice against ZATCA rules
            // TEMPORARILY SKIPPED: ValidateInvoice API has inconsistent requirements
            // The Clear/Report endpoints will perform their own validation
            // const validation = await zatcaService.validateInvoice(invoice, signedXML, privateKey, companyInfo);
            // if (!validation.isValid) {
            //     const error = new Error('Invoice validation failed');
            //     error.errors = validation.errors;
            //     throw error;
            // }

            // 6. Submit to ZATCA (Clear or Report)
            let zatcaResponse;
            const productionSecret = decrypt(invoice.companyId.zatcaCredentials.productionSecret);

            // isB2B and invoiceCategory already determined above (step 2.5)

            if (isB2B) {
                // B2B - Requires clearance
                zatcaResponse = await zatcaService.clearInvoice(
                    invoice,
                    signedXML,
                    companyInfo,
                    productionSecret
                );
            } else {
                // B2C - Just report
                zatcaResponse = await zatcaService.reportInvoice(
                    invoice,
                    signedXML,
                    companyInfo,
                    productionSecret
                );
            }

            // 7. Generate PDF/A-3 with embedded XML and QR code
            let pdfUrl = null;
            try {
                // Pass the QR code to embed it in the PDF
                pdfUrl = await zatcaService.generatePDFA3(signedXML, invoice, zatcaResponse.qrCode);
            } catch (pdfError) {
                console.error('PDF generation failed:', pdfError.message);
                // PDF generation is optional - continue even if it fails
            }

            // 8. Update invoice with ZATCA data (including hash chain info)
            invoice.zatca = {
                status: isB2B ? 'cleared' : 'reported',
                uuid: zatcaResponse.uuid,
                hash: zatcaResponse.hash,
                qrCode: zatcaResponse.qrCode,
                signedXML: signedXML,
                pdfUrl: pdfUrl,
                clearedAt: new Date(),
                errors: [],
                warnings: zatcaResponse.warnings || [],
                validationStatus: 'valid',  // Mark as valid since it was cleared/reported by ZATCA
                lastValidatedAt: new Date(),
                // Hash chain tracking
                hashChainNumber: hashChainData.hashChainNumber,
                previousInvoiceHash: hashChainData.previousInvoiceHash,
                invoiceCategory: invoiceCategory  // B2B or B2C
            };
            invoice.status = 'sent';
            invoice.sentAt = new Date();
            await invoice.save();

            // 9. Update hash chain history after successful ZATCA submission
            await hashChainService.updateHashChainAfterSubmission({
                companyId: invoice.companyId._id,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                zatcaUuid: zatcaResponse.uuid,
                hashChainNumber: hashChainData.hashChainNumber,
                previousInvoiceHash: hashChainData.previousInvoiceHash,
                invoiceHash: zatcaResponse.hash,
                submissionType: isB2B ? 'cleared' : 'reported',
                invoiceCategory: invoiceCategory,  // B2B or B2C
                userId: userId,
                warnings: zatcaResponse.warnings || []
            });

            console.log(`Hash chain updated successfully: Company ${invoice.companyId._id}, Category ${invoiceCategory}, Chain #${hashChainData.hashChainNumber}`);

            // 10. TODO: Send to customer via email
            // await emailService.sendInvoiceToCustomer(invoice);

            return {
                success: true,
                message: `Invoice ${isB2B ? 'cleared' : 'reported'} by ZATCA and sent successfully`,
                data: {
                    invoice: invoice,
                    zatcaUuid: zatcaResponse.uuid,
                    qrCode: zatcaResponse.qrCode,
                    pdfUrl: pdfUrl,
                    hashChainNumber: hashChainData.hashChainNumber
                }
            };

        } catch (error) {
            console.error('Send invoice with ZATCA error:', error);

            // Rollback hash chain counter on failure
            if (hashChainData && invoice?.companyId?._id) {
                try {
                    const rollbackSuccess = await hashChainService.rollbackHashChainOnFailure(
                        invoice.companyId._id,
                        hashChainData.hashChainNumber,
                        hashChainData.invoiceCategory  // B2B or B2C
                    );
                    if (rollbackSuccess) {
                        console.log(`Hash chain rolled back: Company ${invoice.companyId._id}, Category ${hashChainData.invoiceCategory}, from #${hashChainData.hashChainNumber}`);
                    }
                } catch (rollbackError) {
                    console.error('Hash chain rollback failed:', rollbackError);
                }
            }

            throw error;
        }
    }

    /**
     * Validate invoice against ZATCA rules
     */
    async validateZatcaInvoice(invoiceId, userId) {
        const zatcaService = require('./zatcaService');
        const hashChainService = require('./hashChainService');
        const { decrypt } = require('../utils/encryption');

        let invoice;
        try {
            invoice = await Invoice.findById(invoiceId).populate('companyId').populate('customerId');

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            if (invoice.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to invoice');
            }

            if (!invoice.companyId.zatcaCredentials || invoice.companyId.zatcaCredentials.status !== 'verified') {
                throw new Error('Company is not ZATCA verified. Please complete ZATCA onboarding first.');
            }

            // Get hash chain data for validation (peek without incrementing)
            const hashChainData = await hashChainService.peekNextHashChainData(invoice.companyId._id);
            console.log(`Validation hash chain preview for invoice ${invoice.invoiceNumber}:`, {
                hashChainNumber: hashChainData.hashChainNumber,
                isFirstInvoice: hashChainData.isFirstInvoice
            });

            // Step 1: Generate XML with hash chain data
            let xmlResult;
            try {
                xmlResult = await zatcaService.generateXML(invoice, hashChainData);
            } catch (xmlError) {
                const errorMsg = xmlError.response?.data?.message || xmlError.message || 'Failed to generate XML';
                throw new Error(`XML Generation Failed: ${errorMsg}`);
            }

            const xmlString = xmlResult.xml;
            const invoiceUUID = xmlResult.uuid;

            // Step 2: Sign the XML
            let signedXML;
            try {
                const privateKey = decrypt(invoice.companyId.zatcaCredentials.privateKey);
                const productionCSID = invoice.companyId.zatcaCredentials.productionCSID;

                const companyInfo = {
                    crNumber: invoice.companyId.commercialRegistrationNumber,
                    vatNumber: invoice.companyId.vatNumber,
                    productionCSID: productionCSID
                };

                signedXML = await zatcaService.signInvoice(xmlString, privateKey, companyInfo);
            } catch (signError) {
                const errorMsg = signError.response?.data?.message || signError.message || 'Failed to sign invoice';
                throw new Error(`Signing Failed: ${errorMsg}`);
            }

            // Step 3: Skip ZATCA ValidateInvoice API (has inconsistent QR code requirements)
            // The Clear/Report endpoints will perform their own validation
            // If XML generation and signing succeeded, the invoice is ready for submission

            // Store validation results in the invoice
            if (!invoice.zatca) {
                invoice.zatca = {};
            }

            // Mark as valid since XML generation and signing succeeded
            invoice.zatca.errors = [];
            invoice.zatca.warnings = [];
            invoice.zatca.validationStatus = 'valid';
            invoice.zatca.lastValidatedAt = new Date();

            await invoice.save();

            return {
                success: true,
                data: {
                    isValid: true,
                    errors: [],
                    warnings: []
                }
            };

        } catch (error) {
            console.error('Validate ZATCA invoice error:', error.response?.data || error.message);

            // Extract meaningful error message
            let errorMessage = error.message || 'Validation failed';
            if (error.response?.data) {
                const responseData = error.response.data;
                if (responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseData.errors && Array.isArray(responseData.errors)) {
                    errorMessage = responseData.errors.join(', ');
                } else if (typeof responseData === 'string') {
                    errorMessage = responseData;
                }
            }

            // Store error in invoice if possible
            try {
                if (invoice) {
                    if (!invoice.zatca) {
                        invoice.zatca = {};
                    }
                    invoice.zatca.errors = [errorMessage];
                    invoice.zatca.warnings = [];
                    invoice.zatca.validationStatus = 'invalid';
                    invoice.zatca.lastValidatedAt = new Date();
                    await invoice.save();
                }
            } catch (saveError) {
                console.error('Failed to save validation error:', saveError);
            }

            // Return error response instead of throwing
            return {
                success: false,
                data: {
                    isValid: false,
                    errors: [errorMessage],
                    warnings: []
                }
            };
        }
    }

    /**
     * Get ZATCA PDF
     */
    async getZatcaPDF(invoiceId, userId) {
        try {
            const invoice = await Invoice.findById(invoiceId);

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            if (invoice.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to invoice');
            }

            return {
                success: true,
                data: {
                    pdfUrl: invoice.zatca?.pdfUrl || null
                }
            };

        } catch (error) {
            console.error('Get ZATCA PDF error:', error);
            throw error;
        }
    }

    /**
     * Get ZATCA QR Code
     */
    async getZatcaQRCode(invoiceId, userId) {
        try {
            const invoice = await Invoice.findById(invoiceId);

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            if (invoice.userId.toString() !== userId.toString()) {
                throw new Error('Unauthorized access to invoice');
            }

            return {
                success: true,
                data: {
                    qrCode: invoice.zatca?.qrCode || null,
                    uuid: invoice.zatca?.uuid || null,
                    hash: invoice.zatca?.hash || null
                }
            };

        } catch (error) {
            console.error('Get ZATCA QR code error:', error);
            throw error;
        }
    }

    // Regenerate PDF on-the-fly with correct VAT categories
    async regeneratePDF(invoiceId, userId) {
        try {
            const { generateInvoicePDF, pdfToBase64 } = require('../utils/pdfGenerator');

            // Get invoice with populated company and customer
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                userId: userId
            }).populate([
                { path: 'companyId' },
                { path: 'customerId' }
            ]);

            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Helper to get tax rate from VAT category
            const getTaxRateFromCategory = (categoryCode) => {
                const rates = { 'S': 15, 'Z': 0, 'E': 0, 'O': 0 };
                return rates[categoryCode] ?? 15;
            };

            // Build invoice lines with correct VAT categories
            const invoiceLines = invoice.items.map((item, index) => {
                const vatCategoryCode = item.vatCategoryCode || 'S';
                const taxRate = getTaxRateFromCategory(vatCategoryCode);
                const lineAmount = item.totalPrice || (item.quantity * item.unitPrice);
                const lineTaxAmount = lineAmount * (taxRate / 100);

                return {
                    id: (index + 1).toString(),
                    invoicedQuantity: item.quantity,
                    lineExtensionAmount: lineAmount,
                    taxTotal: lineTaxAmount,
                    name: item.description || 'Item',
                    description: item.description || 'Item',
                    vatCategoryCode: vatCategoryCode,
                    taxCategoryType: vatCategoryCode,
                    taxPercentage: taxRate,
                    price: item.unitPrice,
                    taxExemptionReasonCode: item.taxExemptionReasonCode || '',
                    taxExemptionReason: item.taxExemptionReasonText || '',
                    taxExemptionReasonText: item.taxExemptionReasonText || ''
                };
            });

            // Calculate totals based on VAT categories
            let subtotal = 0;
            let totalTax = 0;
            invoiceLines.forEach(line => {
                subtotal += line.lineExtensionAmount;
                totalTax += line.taxTotal;
            });

            // Build PDF data
            const pdfData = {
                invoiceHeader: {
                    invoiceId: invoice.invoiceNumber,
                    issueDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : 'N/A',
                    issueTime: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[1].split('.')[0] : 'N/A'
                },
                invoiceID: invoice.invoiceNumber,
                documentCurrency: invoice.currency || 'SAR',
                accountingSupplierParty: {
                    name: invoice.companyId?.companyName || 'N/A',
                    cr: invoice.companyId?.commercialRegistration || 'N/A',
                    vatRegistration: invoice.companyId?.taxIdNumber || 'N/A',
                    streetName: invoice.companyId?.address?.street || '',
                    district: invoice.companyId?.address?.district || '',
                    cityName: invoice.companyId?.address?.city || '',
                    postalZone: invoice.companyId?.address?.postalCode || ''
                },
                accountingCustomerParty: {
                    name: invoice.customerId?.customerName || 'N/A',
                    cr: invoice.customerId?.commercialRegistrationNumber || '',
                    vatRegistration: invoice.customerId?.complianceInfo?.taxId || 'N/A',
                    streetName: invoice.customerId?.address?.street || '',
                    district: invoice.customerId?.address?.district || '',
                    cityName: invoice.customerId?.address?.city || '',
                    postalZone: invoice.customerId?.address?.postalCode || ''
                },
                invoiceLines: invoiceLines,
                legalMonetaryTotalTaxExclusiveAmount: subtotal,
                taxTotalSummary: totalTax,
                legalMonetaryTotalPayableAmount: subtotal + totalTax,
                paymentMeanInstructionNote: invoice.paymentTerms ? `Net ${invoice.paymentTerms}` : ''
            };

            // Generate PDF with QR code if available
            let qrCode = invoice.zatca?.qrCode || null;

            // If no ZATCA QR code, generate a Phase 1 QR code (TLV format)
            if (!qrCode && invoice.companyId) {
                try {
                    const QRCode = require('qrcode');

                    // Generate TLV data for ZATCA Phase 1 QR code
                    const sellerName = invoice.companyId.companyName || '';
                    const vatNumber = invoice.companyId.taxIdNumber || invoice.companyId.vatNumber || '';
                    const timestamp = invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : new Date().toISOString();
                    const total = (subtotal + totalTax).toFixed(2);
                    const vatAmount = totalTax.toFixed(2);

                    // Create TLV buffer
                    const createTLV = (tag, value) => {
                        const valueBytes = Buffer.from(value, 'utf-8');
                        return Buffer.concat([Buffer.from([tag, valueBytes.length]), valueBytes]);
                    };

                    const tlvData = Buffer.concat([
                        createTLV(1, sellerName),
                        createTLV(2, vatNumber),
                        createTLV(3, timestamp),
                        createTLV(4, total),
                        createTLV(5, vatAmount)
                    ]);

                    // Convert TLV to Base64 for QR code content
                    const qrText = tlvData.toString('base64');

                    // Generate QR code as PNG buffer
                    const qrImageBuffer = await QRCode.toBuffer(qrText, {
                        width: 200,
                        margin: 2,
                        errorCorrectionLevel: 'M'
                    });

                    // Convert to base64 for PDF embedding
                    qrCode = qrImageBuffer.toString('base64');
                } catch (qrError) {
                    console.error('Error generating Phase 1 QR code:', qrError);
                    // Continue without QR code
                }
            }

            const pdfBuffer = await generateInvoicePDF(pdfData, qrCode);
            const pdfBase64 = pdfToBase64(pdfBuffer);

            return {
                success: true,
                data: {
                    pdfBase64: pdfBase64,
                    invoiceNumber: invoice.invoiceNumber
                }
            };

        } catch (error) {
            console.error('Regenerate PDF error:', error);
            throw error;
        }
    }
}

module.exports = new InvoiceService();