const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const User = require('../models/User');

class QuotationService {
    // Create a new quotation
    async createQuotation(userId, quotationData) {
        try {
            const { customerId, companyId, items, ...otherData } = quotationData;

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
                console.log('Using createdBy for quotation creation:', companyOwnerId);
            }

            // Get company information
            console.log('Looking for company:', { companyId, userId: companyOwnerId, isActive: true });

            const company = await Company.findOne({
                _id: companyId,
                userId: companyOwnerId,
                isActive: true
            });

            if (!company) {
                // Debug: Check if company exists at all
                const anyCompany = await Company.findById(companyId);
                if (anyCompany) {
                    console.log('Company exists but userId mismatch:', {
                        requestedUserId: userId,
                        companyUserId: anyCompany.userId,
                        companyIsActive: anyCompany.isActive
                    });
                } else {
                    console.log('Company does not exist:', companyId);
                }
                throw new Error('Company not found or not accessible');
            }

            // Dynamically retrieve customer information
            const customer = await this.getCustomerInfo(customerId, userId);

            // Generate quotation number
            const quoteNumber = await Quotation.generateQuoteNumber(companyId);

            // Check if quotation number already exists for this user and company
            const existingQuotation = await Quotation.findOne({
                userId: userId,
                companyId: companyId,
                quoteNumber: quoteNumber
            });

            if (existingQuotation) {
                throw new Error(`Quotation number ${quoteNumber} already exists for this company. Please refresh to get a new quotation number.`);
            }

            // Set valid until date (default 30 days from quote date)
            const validUntil = otherData.validUntil
                ? new Date(otherData.validUntil)
                : new Date(Date.now() + (company.settings?.defaultQuoteValidityDays || 30) * 24 * 60 * 60 * 1000);

            // Prepare quotation data
            const quotationPayload = {
                userId,
                companyId,
                customerId,
                quoteNumber,
                quoteDate: otherData.quoteDate || new Date(),
                validUntil,
                currency: otherData.currency || company.currency || 'SAR',
                paymentTerms: otherData.paymentTerms || 'Net 30',

                // Dynamic customer information
                customerInfo: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    taxId: customer.taxId,
                    address: customer.address
                },

                // Quotation items
                items: this.processItems(items),

                // Additional information
                notes: otherData.notes,
                termsAndConditions: otherData.termsAndConditions || company.settings?.termsAndConditions,
                discount: otherData.discount || 0,
                discountType: otherData.discountType || 'percentage',

                // VAT information
                isVatApplicable: company.vatRegistered && (otherData.isVatApplicable !== false),

                // Initialize totals (will be recalculated in pre-save middleware)
                subtotal: 0,
                totalTax: 0,
                total: 0,

                createdBy: userId,
                updatedBy: userId
            };

            // Create the quotation
            const quotation = new Quotation(quotationPayload);
            await quotation.save();

            // Populate related data for response
            await quotation.populate([
                { path: 'companyId', select: 'companyName email phone address' },
                { path: 'customerId', select: 'customerName contactInfo address' }
            ]);

            return {
                success: true,
                message: 'Quotation created successfully',
                data: {
                    quotation,
                    quoteNumber,
                    total: quotation.total,
                    validUntil: quotation.validUntil
                }
            };

        } catch (error) {
            console.error('Create quotation error:', error);
            throw error;
        }
    }

    // Dynamically get customer information from Customer model
    async getCustomerInfo(customerId, userId) {
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

            // Return formatted customer information
            return {
                name: customer.customerName,
                email: customer.contactInfo?.email || '',
                phone: customer.contactInfo?.phone || '',
                taxId: customer.complianceInfo?.taxId || '',
                commercialRegistrationNumber: customer.commercialRegistrationNumber || '',
                address: {
                    street: customer.address?.street || '',
                    city: customer.address?.city || '',
                    state: customer.address?.state || '',
                    postalCode: customer.address?.postalCode || '',
                    country: customer.address?.country || customer.country || 'SA'
                }
            };
        } catch (error) {
            console.error('Get customer info error:', error);
            throw error;
        }
    }

    // Process items for quotation
    processItems(items) {
        return items.map(item => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            taxRate: item.taxRate || 15,
            totalPrice: 0, // Will be calculated in pre-save middleware
            taxAmount: 0 // Will be calculated in pre-save middleware
        }));
    }

    // Get all quotations for a user with filters
    async getQuotations(userId, filters = {}) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find quotations (user was created by someone else)
            let quotationOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                quotationOwnerId = currentUser.createdBy;
            }

            const {
                companyId,
                status,
                customerId,
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search
            } = filters;

            // Build query
            const query = { userId: quotationOwnerId, isDeleted: { $ne: true } };

            if (companyId) query.companyId = companyId;
            if (status) query.status = status;
            if (customerId) query.customerId = customerId;

            // Search functionality
            if (search) {
                query.$or = [
                    { quoteNumber: { $regex: search, $options: 'i' } },
                    { 'customerInfo.name': { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

            // Execute query
            const quotations = await Quotation.find(query)
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .populate('companyId', 'companyName email')
                .populate('customerId', 'customerName contactInfo')
                .exec();

            // Get total count
            const totalCount = await Quotation.countDocuments(query);

            return {
                success: true,
                data: {
                    quotations,
                    pagination: {
                        total: totalCount,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(totalCount / limit)
                    }
                }
            };

        } catch (error) {
            console.error('Get quotations error:', error);
            throw error;
        }
    }

    // Get a single quotation by ID
    async getQuotationById(quotationId, userId) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId
            })
                .populate('companyId')
                .populate('customerId')
                .exec();

            if (!quotation) {
                throw new Error('Quotation not found');
            }

            return {
                success: true,
                data: { quotation }
            };

        } catch (error) {
            console.error('Get quotation by ID error:', error);
            throw error;
        }
    }

    // Update quotation (only drafts can be updated)
    async updateQuotation(quotationId, userId, updateData) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId
            });

            if (!quotation) {
                throw new Error('Quotation not found');
            }

            // Check if quotation can be updated
            if (quotation.status !== 'draft') {
                throw new Error('Only draft quotations can be updated');
            }

            // Update fields
            const allowedUpdates = ['quoteDate', 'validUntil', 'currency', 'items', 'notes', 'termsAndConditions', 'discount', 'discountType', 'paymentTerms'];

            allowedUpdates.forEach(field => {
                if (updateData[field] !== undefined) {
                    if (field === 'items') {
                        quotation.items = this.processItems(updateData.items);
                    } else {
                        quotation[field] = updateData[field];
                    }
                }
            });

            quotation.updatedBy = userId;
            await quotation.save();

            return {
                success: true,
                message: 'Quotation updated successfully',
                data: { quotation }
            };

        } catch (error) {
            console.error('Update quotation error:', error);
            throw error;
        }
    }

    // Update quotation status
    async updateQuotationStatus(quotationId, userId, status) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId
            });

            if (!quotation) {
                throw new Error('Quotation not found');
            }

            const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            quotation.status = status;
            quotation.updatedBy = userId;
            await quotation.save();

            return {
                success: true,
                message: 'Quotation status updated successfully',
                data: { quotation }
            };

        } catch (error) {
            console.error('Update quotation status error:', error);
            throw error;
        }
    }

    // Send quotation
    async sendQuotation(quotationId, userId) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId
            });

            if (!quotation) {
                throw new Error('Quotation not found');
            }

            await quotation.markAsSent();

            return {
                success: true,
                message: 'Quotation sent successfully',
                data: { quotation }
            };

        } catch (error) {
            console.error('Send quotation error:', error);
            throw error;
        }
    }

    // Convert quotation to invoice
    async convertToInvoice(quotationId, userId) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId
            }).populate('companyId');

            if (!quotation) {
                throw new Error('Quotation not found');
            }

            // Check if quotation can be converted
            if (quotation.status !== 'accepted') {
                throw new Error('Only accepted quotations can be converted to invoices');
            }

            if (quotation.convertedToInvoiceId) {
                throw new Error('This quotation has already been converted to an invoice');
            }

            // Create invoice from quotation
            const invoiceNumber = await Invoice.generateInvoiceNumber(quotation.companyId._id);

            const invoicePayload = {
                userId: quotation.userId,
                companyId: quotation.companyId._id,
                customerId: quotation.customerId,
                invoiceNumber,
                invoiceType: 'standard',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                currency: quotation.currency,
                paymentTerms: quotation.paymentTerms,
                customerInfo: quotation.customerInfo,
                items: quotation.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    totalPrice: item.totalPrice,
                    taxAmount: item.taxAmount
                })),
                notes: quotation.notes,
                termsAndConditions: quotation.termsAndConditions,
                discount: quotation.discount,
                discountType: quotation.discountType,
                isVatApplicable: quotation.isVatApplicable,
                vatRegistration: quotation.companyId.vatNumber,
                subtotal: quotation.subtotal,
                totalTax: quotation.totalTax,
                total: quotation.total,
                createdBy: userId,
                updatedBy: userId
            };

            const invoice = new Invoice(invoicePayload);
            await invoice.save();

            // Mark quotation as converted
            await quotation.markAsConverted(invoice._id);

            return {
                success: true,
                message: 'Quotation converted to invoice successfully',
                data: {
                    invoice,
                    quotation
                }
            };

        } catch (error) {
            console.error('Convert to invoice error:', error);
            throw error;
        }
    }

    // Soft delete quotation
    async softDeleteQuotation(quotationId, userId) {
        try {
            const quotation = await Quotation.findOne({
                _id: quotationId,
                userId: userId,
                isDeleted: { $ne: true }
            });

            if (!quotation) {
                return {
                    success: false,
                    message: 'Quotation not found'
                };
            }

            quotation.isDeleted = true;
            quotation.deletedAt = new Date();
            quotation.deletedBy = userId;

            await quotation.save();

            return {
                success: true,
                message: 'Quotation deleted successfully',
                data: { quotation }
            };

        } catch (error) {
            console.error('Soft delete quotation error:', error);
            throw error;
        }
    }

    // Get quotation statistics
    async getQuotationStats(userId, companyId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find quotations (user was created by someone else)
            let quotationOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                quotationOwnerId = currentUser.createdBy;
            }

            const query = { userId: quotationOwnerId, isDeleted: { $ne: true } };
            if (companyId) query.companyId = companyId;

            const stats = await Quotation.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalQuotations: { $sum: 1 },
                        totalValue: { $sum: '$total' },
                        draftCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                        },
                        sentCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
                        },
                        acceptedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
                        },
                        rejectedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                        },
                        expiredCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
                        },
                        convertedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                totalQuotations: 0,
                totalValue: 0,
                draftCount: 0,
                sentCount: 0,
                acceptedCount: 0,
                rejectedCount: 0,
                expiredCount: 0,
                convertedCount: 0
            };

            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error('Get quotation stats error:', error);
            throw error;
        }
    }

    // Get next quotation number
    async getNextQuoteNumber(userId, companyId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find company (user was created by someone else)
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
                console.log('Using createdBy for quotation company lookup:', companyOwnerId);
            }

            // Verify company access
            const company = await Company.findOne({
                _id: companyId,
                userId: companyOwnerId,
                isActive: true
            });

            if (!company) {
                throw new Error('Company not found or not accessible');
            }

            const quoteNumber = await Quotation.generateQuoteNumber(companyId);

            return {
                success: true,
                data: { quoteNumber }
            };

        } catch (error) {
            console.error('Get next quote number error:', error);
            throw error;
        }
    }
}

module.exports = new QuotationService();
