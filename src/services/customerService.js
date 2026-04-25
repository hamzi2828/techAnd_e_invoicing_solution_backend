const Customer = require('../models/Customer');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

// Check if Payment model exists, if not create a mock one or handle gracefully
let Payment;
try {
    Payment = require('../models/Payment');
} catch (error) {
    console.warn('Payment model not found, some features may be limited');
    Payment = null;
}

class CustomerService {
    // Create a new customer
    async createCustomer(userId, customerData) {
        try {
            // Validate required fields
            if (!customerData.customerName) {
                throw new Error('Customer name is required');
            }

            // Only check for duplicate account number if both fields are provided
            if (customerData.accountNumber && customerData.bankName &&
                customerData.accountNumber !== '' && customerData.bankName !== 'Not specified') {
                const existingCustomer = await Customer.findOne({
                    userId,
                    accountNumber: customerData.accountNumber,
                    bankName: customerData.bankName,
                    isActive: true
                });

                if (existingCustomer) {
                    throw new Error('A customer with this account number already exists for this bank');
                }
            }

            // Prepare customer data
            const customerPayload = {
                ...customerData,
                userId,
                createdBy: userId,
                updatedBy: userId,
                status: 'pending', // Default status
                verificationStatus: 'pending'
            };

            // Create customer
            const customer = new Customer(customerPayload);
            await customer.save();

            return {
                success: true,
                message: 'Customer created successfully',
                data: { customer }
            };

        } catch (error) {
            console.error('Create customer service error:', error);
            throw error;
        }
    }

    // Get all customers for a user with filters and pagination
    async getCustomers(userId, filters = {}) {
        try {
            console.log('User ID:', userId);
            console.log('Filters:', filters);
            const {
                page = 1,
                limit = 20,
                search,
                status,
                customerType,
                sortBy = '-createdAt',
                country,
                verificationStatus
            } = filters;
            
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find customers (user was created by someone else)
            let customerOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                customerOwnerId = currentUser.createdBy;
                console.log('Using createdBy:', customerOwnerId);
            }

            // Build query
            const query = {
                userId: customerOwnerId,
                isActive: true,
                isDeleted: { $ne: true }
            };
            console.log('Query:', query);

            if (search) {
                query.$or = [
                    { customerName: { $regex: search, $options: 'i' } },
                    { 'contactInfo.email': { $regex: search, $options: 'i' } },
                    { 'contactInfo.phone': { $regex: search, $options: 'i' } },
                    { accountNumber: { $regex: search, $options: 'i' } },
                    { iban: { $regex: search, $options: 'i' } }
                ];
            }

            if (status) query.status = status;
            if (customerType) query.customerType = customerType;
            if (country) query.country = country;
            if (verificationStatus) query.verificationStatus = verificationStatus;

            // Pagination
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            // Execute query
            const customers = await Customer.find(query)
                .sort(sortBy)
                .skip(skip)
                .limit(limitNum)
                .select('-__v')
                .lean();

            const total = await Customer.countDocuments(query);

            return {
                success: true,
                data: {
                    customers,
                    pagination: {
                        current: pageNum,
                        pages: Math.ceil(total / limitNum),
                        total,
                        limit: limitNum
                    }
                }
            };

        } catch (error) {
            console.error('Get customers service error:', error);
            throw error;
        }
    }

    // Get active customers for invoice creation
    async getCustomersForInvoice(userId) {
        try {
            const customers = await Customer.find({
                userId,
                isActive: true,
                status: 'active',
                verificationStatus: 'verified'
            })
            .select('customerName contactInfo address customerType complianceInfo')
            .sort('customerName')
            .lean();

            // Transform data for frontend compatibility
            const customersTransformed = customers.map(customer => ({
                id: customer._id,
                name: customer.customerName,
                email: customer.contactInfo?.email || '',
                phone: customer.contactInfo?.phone || '',
                companyName: customer.customerType === 'company' ? customer.customerName : '',
                taxNumber: customer.complianceInfo?.taxId || '',
                type: customer.customerType || 'company',
                address: {
                    street: customer.address?.street || '',
                    city: customer.address?.city || '',
                    state: customer.address?.state || '',
                    postalCode: customer.address?.postalCode || '',
                    country: customer.address?.country || 'SA'
                }
            }));

            return {
                success: true,
                data: { customers: customersTransformed }
            };

        } catch (error) {
            console.error('Get customers for invoice service error:', error);
            throw error;
        }
    }

    // Get single customer by ID
    async getCustomerById(customerId, userId) {
        try {
            const customer = await Customer.findOne({
                _id: customerId,
                userId,
                isActive: true
            }).select('-__v');

            if (!customer) {
                throw new Error('Customer not found');
            }

            return {
                success: true,
                data: { customer }
            };

        } catch (error) {
            console.error('Get customer by ID service error:', error);
            throw error;
        }
    }

    // Update customer
    async updateCustomer(customerId, userId, updateData) {
        try {
            // Remove fields that shouldn't be updated
            const sanitizedData = { ...updateData };
            delete sanitizedData.userId;
            delete sanitizedData.createdBy;
            delete sanitizedData._id;

            // Add update metadata
            sanitizedData.updatedBy = userId;

            // Check if updating account details and validate uniqueness
            if (sanitizedData.accountNumber || sanitizedData.bankName) {
                const existingCustomer = await Customer.findOne({
                    _id: { $ne: customerId },
                    userId,
                    accountNumber: sanitizedData.accountNumber || updateData.accountNumber,
                    bankName: sanitizedData.bankName || updateData.bankName,
                    isActive: true
                });

                if (existingCustomer) {
                    throw new Error('A customer with this account number already exists for this bank');
                }
            }

            const customer = await Customer.findOneAndUpdate(
                { _id: customerId, userId, isActive: true },
                sanitizedData,
                { new: true, runValidators: true }
            ).select('-__v');

            if (!customer) {
                throw new Error('Customer not found');
            }

            return {
                success: true,
                message: 'Customer updated successfully',
                data: { customer }
            };

        } catch (error) {
            console.error('Update customer service error:', error);
            throw error;
        }
    }

    // Soft delete customer
    async deleteCustomer(customerId, userId) {
        try {
            const customer = await Customer.findOne({
                _id: customerId,
                userId,
                isDeleted: { $ne: true }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            customer.isDeleted = true;
            customer.deletedAt = new Date();
            customer.deletedBy = userId;
            customer.isActive = false;
            await customer.save();

            return {
                success: true,
                message: 'Customer deleted successfully'
            };

        } catch (error) {
            console.error('Delete customer service error:', error);
            throw error;
        }
    }

    // Update customer status
    async updateCustomerStatus(customerId, userId, status) {
        try {
            const validStatuses = ['active', 'inactive', 'pending', 'suspended', 'blocked'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const customer = await Customer.findOneAndUpdate(
                { _id: customerId, userId, isActive: true },
                {
                    status,
                    updatedBy: userId
                },
                { new: true }
            ).select('-__v');

            if (!customer) {
                throw new Error('Customer not found');
            }

            return {
                success: true,
                message: 'Customer status updated successfully',
                data: { customer }
            };

        } catch (error) {
            console.error('Update customer status service error:', error);
            throw error;
        }
    }

    // Search customers
    async searchCustomers(userId, searchTerm) {
        try {
            if (!searchTerm) {
                throw new Error('Search term is required');
            }

            const customers = await Customer.find({
                userId,
                isActive: true,
                status: 'active',
                $or: [
                    { customerName: { $regex: searchTerm, $options: 'i' } },
                    { 'contactInfo.email': { $regex: searchTerm, $options: 'i' } },
                    { 'contactInfo.phone': { $regex: searchTerm, $options: 'i' } },
                    { accountNumber: { $regex: searchTerm, $options: 'i' } },
                    { iban: { $regex: searchTerm, $options: 'i' } }
                ]
            })
            .select('customerName contactInfo address customerType accountNumber iban maskedAccountNumber')
            .limit(10)
            .lean();

            return {
                success: true,
                data: { customers }
            };

        } catch (error) {
            console.error('Search customers service error:', error);
            throw error;
        }
    }

    // Validate customer for invoice creation
    async validateCustomerForInvoice(customerId, userId) {
        try {
            const customer = await Customer.findOne({
                _id: customerId,
                userId,
                isActive: true
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            const canReceivePayment = customer.canReceivePayment(1000000); // Test with max amount
            const isVerified = customer.verificationStatus === 'verified';
            const isActive = customer.status === 'active';
            const hasValidIBAN = customer.validateIBAN();

            const validation = {
                isValid: canReceivePayment && isVerified && isActive && hasValidIBAN,
                canReceivePayment,
                isVerified,
                isActive,
                hasValidIBAN,
                issues: []
            };

            if (!isActive) validation.issues.push('Customer is not active');
            if (!isVerified) validation.issues.push('Customer is not verified');
            if (!canReceivePayment) validation.issues.push('Customer cannot receive payments');
            if (!hasValidIBAN) validation.issues.push('Customer has invalid IBAN');

            return {
                success: true,
                data: {
                    validation,
                    customer: {
                        id: customer._id,
                        name: customer.customerName,
                        email: customer.contactInfo?.email,
                        status: customer.status,
                        verificationStatus: customer.verificationStatus,
                        accountNumber: customer.maskedAccountNumber,
                        iban: customer.iban,
                        bankName: customer.bankName
                    }
                }
            };

        } catch (error) {
            console.error('Validate customer service error:', error);
            throw error;
        }
    }

    // Bulk operations
    async bulkUpdateStatus(userId, customerIds, status) {
        try {
            const validStatuses = ['active', 'inactive', 'pending', 'suspended', 'blocked'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const result = await Customer.updateMany(
                {
                    _id: { $in: customerIds },
                    userId,
                    isActive: true
                },
                {
                    status,
                    updatedBy: userId
                }
            );

            return {
                success: true,
                message: `${result.modifiedCount} customers updated successfully`,
                data: { modifiedCount: result.modifiedCount }
            };

        } catch (error) {
            console.error('Bulk update status service error:', error);
            throw error;
        }
    }

    // Get customer statistics
    async getCustomerStats(userId) {
        try {
            const stats = await Customer.aggregate([
                { $match: { userId, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        verified: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] } },
                        individuals: { $sum: { $cond: [{ $eq: ['$customerType', 'individual'] }, 1, 0] } },
                        companies: { $sum: { $cond: [{ $eq: ['$customerType', 'company'] }, 1, 0] } },
                        totalPaymentsValue: { $sum: '$totalPaymentsReceived' },
                        averagePaymentValue: { $avg: '$totalPaymentsReceived' }
                    }
                }
            ]);

            const result = stats[0] || {
                total: 0,
                active: 0,
                pending: 0,
                verified: 0,
                individuals: 0,
                companies: 0,
                totalPaymentsValue: 0,
                averagePaymentValue: 0
            };

            return {
                success: true,
                data: { stats: result }
            };

        } catch (error) {
            console.error('Get customer stats service error:', error);
            throw error;
        }
    }

    // Export customers
    async exportCustomers(userId, format = 'csv', filters = {}) {
        try {
            // Get filtered customers
            const result = await this.getCustomers(userId, { ...filters, limit: 10000 });
            const customers = result.data.customers;

            if (format === 'csv') {
                // Generate CSV data
                const csvHeaders = [
                    'ID',
                    'Name',
                    'Type',
                    'Email',
                    'Phone',
                    'Bank Name',
                    'Account Number',
                    'IBAN',
                    'Status',
                    'Verification Status',
                    'Created Date'
                ];

                const csvRows = customers.map(c => [
                    c._id,
                    c.customerName,
                    c.customerType,
                    c.contactInfo?.email || '',
                    c.contactInfo?.phone || '',
                    c.bankName,
                    c.accountNumber,
                    c.iban,
                    c.status,
                    c.verificationStatus,
                    new Date(c.createdAt).toLocaleDateString()
                ]);

                const csvContent = [csvHeaders, ...csvRows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');

                return {
                    success: true,
                    data: {
                        content: csvContent,
                        filename: `customers-${new Date().toISOString().split('T')[0]}.csv`,
                        contentType: 'text/csv'
                    }
                };
            }

            // JSON format
            return {
                success: true,
                data: {
                    content: JSON.stringify(customers, null, 2),
                    filename: `customers-${new Date().toISOString().split('T')[0]}.json`,
                    contentType: 'application/json'
                }
            };

        } catch (error) {
            console.error('Export customers service error:', error);
            throw error;
        }
    }

    // Get comprehensive customer details with history and metrics
    async getCustomerDetails(customerId, userId) {
        try {

            // Get basic customer info
            const customer = await Customer.findOne({
                _id: customerId,
                userId,
                isActive: true
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get transaction history (invoices and payments)
            const invoiceHistory = await Invoice.find({
                customerId: customerId,
                userId
            })
            .select('invoiceNumber invoiceDate dueDate total paidAmount status paymentStatus items')
            .sort('-invoiceDate')
            .limit(50)
            .lean();

            // Get payment history (if Payment model exists)
            const paymentHistory = Payment ? await Payment.find({
                customerId: customerId,
                userId
            })
            .select('amount date method reference status notes')
            .sort('-date')
            .limit(50)
            .lean() : [];

            // Calculate customer metrics
            const customerMetrics = await this.calculateCustomerMetrics(customerId, userId);

            // Calculate rankings
            const rankings = await this.calculateCustomerRankings(customerId, userId, customer.country);

            // Get recent activity summary
            const recentActivity = await this.getCustomerRecentActivity(customerId, userId);

            return {
                success: true,
                data: {
                    customer: customer,
                    metrics: customerMetrics,
                    rankings: rankings,
                    history: {
                        invoices: invoiceHistory,
                        payments: paymentHistory
                    },
                    recentActivity: recentActivity
                }
            };

        } catch (error) {
            console.error('Get customer details service error:', error);
            throw error;
        }
    }

    // Calculate comprehensive customer metrics
    async calculateCustomerMetrics(customerId, userId) {
        try {

            // Invoice metrics
            const invoiceMetrics = await Invoice.aggregate([
                {
                    $match: {
                        customerId: new mongoose.Types.ObjectId(customerId),
                        userId: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalInvoices: { $sum: 1 },
                        totalAmount: { $sum: '$total' },
                        totalPaid: { $sum: '$paidAmount' },
                        totalPending: { $sum: '$remainingAmount' },
                        averageInvoiceValue: { $avg: '$total' },
                        largestInvoice: { $max: '$total' },
                        smallestInvoice: { $min: '$total' },
                        paidInvoices: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
                        pendingInvoices: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] } },
                        overdueInvoices: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } }
                    }
                }
            ]);

            // Payment frequency analysis
            const paymentFrequency = await Invoice.aggregate([
                {
                    $match: {
                        customerId: new mongoose.Types.ObjectId(customerId),
                        userId: new mongoose.Types.ObjectId(userId),
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$paidAt' },
                            month: { $month: '$paidAt' }
                        },
                        count: { $sum: 1 },
                        amount: { $sum: '$total' }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
            ]);

            // Payment method analysis (if Payment model exists)
            const paymentMethods = Payment ? await Payment.aggregate([
                {
                    $match: {
                        customerId: new mongoose.Types.ObjectId(customerId),
                        userId: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $group: {
                        _id: '$method',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ]) : [];

            // Calculate payment behavior score (0-100)
            const metrics = invoiceMetrics[0] || {
                totalInvoices: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                averageInvoiceValue: 0,
                largestInvoice: 0,
                smallestInvoice: 0,
                paidInvoices: 0,
                pendingInvoices: 0,
                overdueInvoices: 0
            };

            // Calculate payment behavior score
            const paymentRate = metrics.totalInvoices > 0 ? (metrics.paidInvoices / metrics.totalInvoices) * 100 : 0;
            const overdueRate = metrics.totalInvoices > 0 ? (metrics.overdueInvoices / metrics.totalInvoices) * 100 : 0;
            const paymentBehaviorScore = Math.max(0, Math.min(100, paymentRate - (overdueRate * 2)));

            // Customer lifetime value
            const customerLifetimeValue = metrics.totalPaid;

            // Average days to pay
            const avgDaysToPay = await this.calculateAverageDaysToPay(customerId, userId);

            return {
                financial: {
                    totalInvoices: metrics.totalInvoices,
                    totalAmount: metrics.totalAmount,
                    totalPaid: metrics.totalPaid,
                    totalPending: metrics.totalPending,
                    averageInvoiceValue: metrics.averageInvoiceValue,
                    largestInvoice: metrics.largestInvoice,
                    smallestInvoice: metrics.smallestInvoice,
                    customerLifetimeValue: customerLifetimeValue
                },
                performance: {
                    paidInvoices: metrics.paidInvoices,
                    pendingInvoices: metrics.pendingInvoices,
                    overdueInvoices: metrics.overdueInvoices,
                    paymentRate: paymentRate,
                    overdueRate: overdueRate,
                    paymentBehaviorScore: Math.round(paymentBehaviorScore),
                    avgDaysToPay: avgDaysToPay
                },
                trends: {
                    paymentFrequency: paymentFrequency,
                    paymentMethods: paymentMethods
                }
            };

        } catch (error) {
            console.error('Calculate customer metrics error:', error);
            throw error;
        }
    }

    // Calculate customer rankings (country-wise and global)
    async calculateCustomerRankings(customerId, userId, customerCountry) {
        try {
            const mongoose = require('mongoose');

            // Get customer's total payment amount
            const customerStats = await Customer.findById(customerId)
                .select('totalPaymentsReceived paymentCount');

            if (!customerStats) {
                throw new Error('Customer stats not found');
            }

            // Global ranking by total payments received
            const globalRankByAmount = await Customer.countDocuments({
                userId,
                isActive: true,
                totalPaymentsReceived: { $gt: customerStats.totalPaymentsReceived }
            }) + 1;

            // Global ranking by payment count
            const globalRankByCount = await Customer.countDocuments({
                userId,
                isActive: true,
                paymentCount: { $gt: customerStats.paymentCount }
            }) + 1;

            // Country-wise ranking by total payments received
            const countryRankByAmount = await Customer.countDocuments({
                userId,
                country: customerCountry,
                isActive: true,
                totalPaymentsReceived: { $gt: customerStats.totalPaymentsReceived }
            }) + 1;

            // Country-wise ranking by payment count
            const countryRankByCount = await Customer.countDocuments({
                userId,
                country: customerCountry,
                isActive: true,
                paymentCount: { $gt: customerStats.paymentCount }
            }) + 1;

            // Get total counts for percentage calculation
            const totalGlobalCustomers = await Customer.countDocuments({
                userId,
                isActive: true
            });

            const totalCountryCustomers = await Customer.countDocuments({
                userId,
                country: customerCountry,
                isActive: true
            });

            return {
                global: {
                    rankByAmount: globalRankByAmount,
                    rankByCount: globalRankByCount,
                    totalCustomers: totalGlobalCustomers,
                    percentileByAmount: Math.round(((totalGlobalCustomers - globalRankByAmount + 1) / totalGlobalCustomers) * 100),
                    percentileByCount: Math.round(((totalGlobalCustomers - globalRankByCount + 1) / totalGlobalCustomers) * 100)
                },
                country: {
                    countryCode: customerCountry,
                    rankByAmount: countryRankByAmount,
                    rankByCount: countryRankByCount,
                    totalCustomers: totalCountryCustomers,
                    percentileByAmount: totalCountryCustomers > 0 ? Math.round(((totalCountryCustomers - countryRankByAmount + 1) / totalCountryCustomers) * 100) : 0,
                    percentileByCount: totalCountryCustomers > 0 ? Math.round(((totalCountryCustomers - countryRankByCount + 1) / totalCountryCustomers) * 100) : 0
                }
            };

        } catch (error) {
            console.error('Calculate customer rankings error:', error);
            throw error;
        }
    }

    // Calculate average days to pay for a customer
    async calculateAverageDaysToPay(customerId, userId) {
        try {

            const paidInvoices = await Invoice.find({
                customerId: customerId,
                userId,
                paymentStatus: 'paid',
                paidAt: { $exists: true }
            })
            .select('invoiceDate paidAt')
            .lean();

            if (paidInvoices.length === 0) return 0;

            const totalDays = paidInvoices.reduce((sum, invoice) => {
                const invoiceDate = new Date(invoice.invoiceDate);
                const paidDate = new Date(invoice.paidAt);
                const daysDiff = Math.ceil((paidDate - invoiceDate) / (1000 * 60 * 60 * 24));
                return sum + daysDiff;
            }, 0);

            return Math.round(totalDays / paidInvoices.length);

        } catch (error) {
            console.error('Calculate average days to pay error:', error);
            return 0;
        }
    }

    // Get recent customer activity
    async getCustomerRecentActivity(customerId, userId) {
        try {

            // Get recent invoices
            const recentInvoices = await Invoice.find({
                customerId: customerId,
                userId
            })
            .select('invoiceNumber invoiceDate total status createdAt')
            .sort('-createdAt')
            .limit(5)
            .lean();

            // Get recent payments (if Payment model exists)
            const recentPayments = Payment ? await Payment.find({
                customerId: customerId,
                userId
            })
            .select('amount date method createdAt')
            .sort('-createdAt')
            .limit(5)
            .lean() : [];

            // Combine and sort by date
            const activities = [
                ...recentInvoices.map(inv => ({
                    type: 'invoice',
                    date: inv.createdAt,
                    description: `Invoice ${inv.invoiceNumber} created`,
                    amount: inv.total,
                    status: inv.status,
                    id: inv._id
                })),
                ...recentPayments.map(pay => ({
                    type: 'payment',
                    date: pay.createdAt,
                    description: `Payment received via ${pay.method}`,
                    amount: pay.amount,
                    status: 'completed',
                    id: pay._id
                }))
            ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

            return activities;

        } catch (error) {
            console.error('Get customer recent activity error:', error);
            return [];
        }
    }
}

module.exports = new CustomerService();