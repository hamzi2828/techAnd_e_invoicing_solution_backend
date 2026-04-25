// src/services/companyService.js
const Company = require('../models/Company');
const User = require('../models/User');
const mongoose = require('mongoose');

class CompanyService {
    // Create a new company
    async createCompany(userId, companyData) {
        try {
            // Allow multiple companies per user - removed the check for existing company

            const company = new Company({
                userId,
                ...companyData
            });

            await company.save();

            return {
                success: true,
                message: 'Company created successfully',
                data: company
            };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`${field} already exists`);
            }
            throw new Error(error.message || 'Failed to create company');
        }
    }

    // Get user's company
    async getUserCompany(userId) {
        try {
            const company = await Company.findOne({
                userId,
                isActive: true
            }).populate('userId', 'name email');

            if (!company) {
                return {
                    success: false,
                    message: 'No company profile found',
                    data: null
                };
            }

            return {
                success: true,
                message: 'Company retrieved successfully',
                data: company
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to get company');
        }
    }

    // Update company
    async updateCompany(userId, companyId, updateData) {
        try {
            const company = await Company.findOne({
                _id: companyId,
                userId
            });

            if (!company) {
                throw new Error('Company not found');
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== '_id' && key !== 'userId') {
                    if (key === 'address' && typeof updateData[key] === 'object') {
                        company.address = { ...company.address, ...updateData[key] };
                    } else if (key === 'settings' && typeof updateData[key] === 'object') {
                        company.settings = { ...company.settings, ...updateData[key] };
                    } else {
                        company[key] = updateData[key];
                    }
                }
            });

            await company.save();

            return {
                success: true,
                message: 'Company updated successfully',
                data: company
            };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`${field} already exists`);
            }
            throw new Error(error.message || 'Failed to update company');
        }
    }

    // Delete company (soft delete)
    async deleteCompany(userId, companyId) {
        try {
            const company = await Company.findOne({
                _id: companyId,
                userId,
                isDeleted: { $ne: true }
            });

            if (!company) {
                throw new Error('Company not found');
            }

            company.isDeleted = true;
            company.deletedAt = new Date();
            company.deletedBy = userId;
            company.isActive = false;
            await company.save();

            return {
                success: true,
                message: 'Company deleted successfully'
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to delete company');
        }
    }

    // Get all companies with filters (admin only)
    async getAllCompanies(filters = {}) {
        try {
            const page = Math.max(1, parseInt(filters.page) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(filters.limit) || 20));
            const skip = (page - 1) * limit;

            // Build query
            const query = { isDeleted: { $ne: true } };

            if (filters.search) {
                query.$or = [
                    { companyName: { $regex: filters.search, $options: 'i' } },
                    { email: { $regex: filters.search, $options: 'i' } },
                    { commercialRegistrationNumber: { $regex: filters.search, $options: 'i' } },
                    { taxIdNumber: { $regex: filters.search, $options: 'i' } }
                ];
            }

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.verificationStatus) {
                query.verificationStatus = filters.verificationStatus;
            }

            if (filters.industry) {
                query.industry = filters.industry;
            }

            if (filters.city) {
                query['address.city'] = filters.city;
            }

            if (filters.isActive !== undefined) {
                query.isActive = filters.isActive === 'true';
            }

            // Date range filter
            if (filters.createdAfter || filters.createdBefore) {
                query.createdAt = {};
                if (filters.createdAfter) {
                    query.createdAt.$gte = new Date(filters.createdAfter);
                }
                if (filters.createdBefore) {
                    query.createdAt.$lte = new Date(filters.createdBefore);
                }
            }

            // Execute query
            const [companies, total] = await Promise.all([
                Company.find(query)
                    .populate('userId', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Company.countDocuments(query)
            ]);

            return {
                success: true,
                message: 'Companies retrieved successfully',
                data: companies,
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to get companies');
        }
    }

    // Upload document
    async uploadDocument(userId, companyId, documentData) {
        try {
            const company = await Company.findOne({
                _id: companyId,
                userId
            });

            if (!company) {
                throw new Error('Company not found');
            }

            const document = {
                documentType: documentData.documentType,
                documentName: documentData.documentName,
                documentUrl: documentData.documentUrl,
                uploadedAt: new Date(),
                verificationStatus: 'pending'
            };

            // Remove existing document of same type
            company.documents = company.documents.filter(
                doc => doc.documentType !== documentData.documentType
            );

            // Add new document
            company.documents.push(document);
            await company.save();

            return {
                success: true,
                message: 'Document uploaded successfully',
                data: document
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to upload document');
        }
    }

    // Remove document
    async removeDocument(userId, companyId, documentId) {
        try {
            const company = await Company.findOne({
                _id: companyId,
                userId
            });

            if (!company) {
                throw new Error('Company not found');
            }

            company.documents = company.documents.filter(
                doc => doc._id.toString() !== documentId
            );

            await company.save();

            return {
                success: true,
                message: 'Document removed successfully'
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to remove document');
        }
    }

    // Update company status (admin only)
    async updateCompanyStatus(companyId, status, verificationStatus) {
        try {
            const company = await Company.findById(companyId);

            if (!company) {
                throw new Error('Company not found');
            }

            if (status) {
                company.status = status;
            }

            if (verificationStatus) {
                company.verificationStatus = verificationStatus;
            }

            await company.save();

            return {
                success: true,
                message: 'Company status updated successfully',
                data: company
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to update company status');
        }
    }

    // Get company statistics
    async getCompanyStatistics() {
        try {
            const stats = await Company.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCompanies: { $sum: 1 },
                        activeCompanies: {
                            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
                        },
                        verifiedCompanies: {
                            $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] }
                        },
                        pendingVerification: {
                            $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalCompanies: 1,
                        activeCompanies: 1,
                        verifiedCompanies: 1,
                        pendingVerification: 1,
                        inactiveCompanies: { $subtract: ["$totalCompanies", "$activeCompanies"] }
                    }
                }
            ]);

            // Get industry breakdown
            const industryStats = await Company.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: "$industry", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            // Get city breakdown
            const cityStats = await Company.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: "$address.city", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            return {
                success: true,
                message: 'Statistics retrieved successfully',
                data: {
                    overview: stats[0] || {
                        totalCompanies: 0,
                        activeCompanies: 0,
                        verifiedCompanies: 0,
                        pendingVerification: 0,
                        inactiveCompanies: 0
                    },
                    industryBreakdown: industryStats,
                    cityBreakdown: cityStats
                }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to get statistics');
        }
    }

    // Check company name availability
    async checkNameAvailability(companyName, excludeId = null) {
        try {
            const query = {
                companyName: { $regex: new RegExp(`^${companyName}$`, 'i') },
                isActive: true
            };

            if (excludeId) {
                query._id = { $ne: excludeId };
            }

            const existingCompany = await Company.findOne(query);

            return {
                success: true,
                message: 'Name availability checked',
                data: {
                    available: !existingCompany,
                    suggestion: existingCompany ? `${companyName} - ${Date.now()}` : null
                }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to check name availability');
        }
    }

    // Validate company registration details
    async validateRegistrationDetails(regNumber, taxId, excludeId = null) {
        try {
            const queries = [];

            if (regNumber) {
                const regQuery = { commercialRegistrationNumber: regNumber };
                if (excludeId) regQuery._id = { $ne: excludeId };
                queries.push(Company.findOne(regQuery));
            }

            if (taxId) {
                const taxQuery = { taxIdNumber: taxId };
                if (excludeId) taxQuery._id = { $ne: excludeId };
                queries.push(Company.findOne(taxQuery));
            }

            const [regExists, taxExists] = await Promise.all(queries);

            const errors = {};
            if (regExists) {
                errors.commercialRegistrationNumber = 'Commercial registration number already exists';
            }
            if (taxExists) {
                errors.taxIdNumber = 'Tax ID number already exists';
            }

            return {
                success: Object.keys(errors).length === 0,
                message: Object.keys(errors).length === 0 ? 'Validation passed' : 'Validation failed',
                data: { errors }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to validate registration details');
        }
    }


    async getCompanyById(companyId) {
        try {
            const company = await Company.findById(companyId)
                .populate('userId', 'email firstName lastName');

            if (!company) {
                return {
                    success: false,
                    message: 'Company not found'
                };
            }

            return {
                success: true,
                message: 'Company retrieved successfully',
                data: company
            };
        } catch (error) {
            console.error('Get company by ID error:', error);
            throw new Error(error.message || 'Failed to get company');
        }
    }

    // Get companies created by specific user
    async getCompaniesCreatedByMe(userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);

            // If user has a createdBy, use that to find companies (user was created by someone else)
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
                console.log('Using createdBy:', companyOwnerId);
            }

            const companies = await Company.find({ userId: companyOwnerId, isDeleted: { $ne: true } })
                .populate('userId', 'email firstName lastName')
                .sort({ createdAt: -1 });

            console.log(`Found ${companies.length} companies for user ${companyOwnerId}`);

            return {
                success: true,
                message: 'Companies created by you retrieved successfully',
                data: companies
            };
        } catch (error) {
            console.error('Error fetching companies created by me:', error);
            throw new Error(error.message || 'Failed to get companies created by you');
        }
    }

    // Validate step data before proceeding
    async validateStepData(step, data) {
        try {
            const errors = {};

            // Valid enum values from schema
            const validIndustries = ['Technology', 'Healthcare', 'Education', 'Construction',
                'Manufacturing', 'Retail', 'Finance', 'Real Estate',
                'Transportation', 'Tourism', 'Agriculture', 'Energy', 'Consulting', 'Other'];

            const validCities = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar',
                'Dhahran', 'Jubail', 'Tabuk', 'Abha', 'Khamis Mushait',
                'Hail', 'Buraidah', 'Qassim', 'Jazan', 'Najran', 'Al-Ahsa',
                'Yanbu', 'Taif', 'Arar', 'Sakaka', 'Al-Baha'];

            const validProvinces = ['Riyadh Province', 'Makkah Province', 'Madinah Province',
                'Eastern Province', 'Asir Province', 'Tabuk Province',
                'Qassim Province', 'Ha\'il Province', 'Jazan Province',
                'Najran Province', 'Al-Baha Province', 'Northern Borders Province',
                'Al-Jawf Province'];

            switch (step) {
                case 1: // Basic Information
                    // Check required fields
                    if (!data.companyName || !data.companyName.trim()) {
                        errors.companyName = 'Company name is required';
                    } else {
                        // Check if company name already exists
                        const nameCheck = await this.checkNameAvailability(data.companyName);
                        if (!nameCheck.data.available) {
                            errors.companyName = 'Company name already exists';
                        }
                    }

                    if (!data.registrationNumber || !data.registrationNumber.trim()) {
                        errors.registrationNumber = 'Commercial registration number is required';
                    } else {
                        // Validate format (10 digits for Saudi Arabia)
                        if (!/^\d{10}$/.test(data.registrationNumber)) {
                            errors.registrationNumber = 'Commercial registration number must be 10 digits';
                        }
                    }

                    if (!data.taxNumber || !data.taxNumber.trim()) {
                        errors.taxNumber = 'Tax number is required';
                    } else {
                        // Validate format (must start with 3 and be 15 digits for Saudi Arabia)
                        if (!/^3\d{14}$/.test(data.taxNumber)) {
                            errors.taxNumber = 'Tax number must start with 3 and be 15 digits';
                        }
                    }

                    // Check if registration number or tax ID already exists
                    if (data.registrationNumber || data.taxNumber) {
                        const regCheck = await this.validateRegistrationDetails(
                            data.registrationNumber,
                            data.taxNumber
                        );
                        if (!regCheck.success) {
                            Object.assign(errors, regCheck.data.errors);
                        }
                    }

                    if (!data.industry) {
                        errors.industry = 'Industry is required';
                    } else {
                        // Normalize industry (capitalize first letter)
                        const normalizedIndustry = data.industry.charAt(0).toUpperCase() + data.industry.slice(1).toLowerCase();

                        // Check if industry is valid
                        if (!validIndustries.includes(normalizedIndustry)) {
                            errors.industry = `Industry must be one of: ${validIndustries.join(', ')}`;
                        }
                    }
                    break;

                case 2: // Contact Information
                    if (!data.email || !data.email.trim()) {
                        errors.email = 'Email is required';
                    } else {
                        // Validate email format
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(data.email)) {
                            errors.email = 'Invalid email format';
                        } else {
                            // Check if email already exists
                            const existingCompany = await Company.findOne({
                                email: data.email,
                                isActive: true
                            });
                            if (existingCompany) {
                                errors.email = 'Email is already registered';
                            }
                        }
                    }

                    if (!data.phone || !data.phone.trim()) {
                        errors.phone = 'Phone number is required';
                    } else {
                        // Validate Saudi phone format (starting with +966 or 05)
                        const phoneRegex = /^(\+966|966|0)?5[0-9]{8}$/;
                        if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
                            errors.phone = 'Invalid phone number format. Must be a Saudi mobile number (05XXXXXXXX or +9665XXXXXXXX)';
                        }
                    }

                    if (!data.address || !data.address.trim()) {
                        errors.address = 'Street address is required';
                    }

                    if (!data.district || !data.district.trim()) {
                        errors.district = 'District is required';
                    }

                    if (!data.city || !data.city.trim()) {
                        errors.city = 'City is required';
                    } else if (!validCities.includes(data.city)) {
                        errors.city = `City must be a valid Saudi city. Available: ${validCities.join(', ')}`;
                    }

                    if (!data.state || !data.state.trim()) {
                        errors.state = 'Province is required';
                    } else if (!validProvinces.includes(data.state)) {
                        errors.state = `Province must be a valid Saudi province. Available: ${validProvinces.join(', ')}`;
                    }

                    if (!data.postalCode || !data.postalCode.trim()) {
                        errors.postalCode = 'Postal code is required';
                    } else if (!/^\d{5}$/.test(data.postalCode)) {
                        errors.postalCode = 'Postal code must be exactly 5 digits';
                    }

                    // Country must be Saudi Arabia
                    if (data.country && data.country !== 'Saudi Arabia') {
                        errors.country = 'Only Saudi Arabia is supported';
                    }

                    // Optional website validation
                    if (data.website && data.website.trim()) {
                        if (!/^https?:\/\/.+\..+/.test(data.website)) {
                            errors.website = 'Website must be a valid URL (starting with http:// or https://)';
                        }
                    }
                    break;

                case 3: // Business Information
                    if (!data.businessType) {
                        errors.businessType = 'Business type is required';
                    }
                    break;

                case 4: // Documents
                    // Documents are optional, but we can add warnings
                    const warnings = [];
                    if (!data.logo) {
                        warnings.push('Company logo is recommended');
                    }
                    if (!data.commercialRegister) {
                        warnings.push('Commercial register document is recommended');
                    }
                    if (!data.taxCertificate) {
                        warnings.push('Tax certificate is recommended');
                    }

                    if (warnings.length > 0) {
                        return {
                            success: true,
                            message: 'Validation passed with warnings',
                            data: { errors: {}, warnings }
                        };
                    }
                    break;

                default:
                    throw new Error('Invalid step number');
            }

            if (Object.keys(errors).length > 0) {
                return {
                    success: false,
                    message: 'Validation failed',
                    data: { errors }
                };
            }

            return {
                success: true,
                message: 'Validation passed',
                data: { errors: {} }
            };
        } catch (error) {
            throw new Error(error.message || 'Failed to validate step data');
        }
    }

    // Set default company
    async setDefaultCompany(companyId, userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
            }

            // Remove default from all user companies
            await Company.updateMany(
                { userId: companyOwnerId },
                { isDefault: false }
            );

            // Set the specified company as default
            const company = await Company.findOneAndUpdate(
                { _id: companyId, userId: companyOwnerId },
                { isDefault: true },
                { new: true }
            );

            if (!company) {
                throw new Error('Company not found');
            }

            return {
                success: true,
                message: 'Default company updated successfully',
                data: company
            };
        } catch (error) {
            throw error;
        }
    }

    // Get default company
    async getDefaultCompany(userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            let companyOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                companyOwnerId = currentUser.createdBy;
            }

            const company = await Company.findOne({
                userId: companyOwnerId,
                isDefault: true,
                isDeleted: { $ne: true }
            });

            return {
                success: true,
                data: company
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CompanyService();