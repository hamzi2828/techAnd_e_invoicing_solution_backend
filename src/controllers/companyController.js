// src/controllers/companyController.js
const companyService = require('../services/companyService');
const { incrementUsage, decrementUsage } = require('../../middleware/planMiddleware');

class CompanyController {
    // Create company
    async createCompany(req, res) {
        try {
            const userId = req.user._id;
            const result = await companyService.createCompany(userId, req.body);

            // Track usage after successful company creation
            if (result.success) {
                await incrementUsage(req, 'company');
            }

            return res.status(201).json(result);
        } catch (error) {
            console.error('Create company error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create company'
            });
        }
    }

    // Get user's company
    async getUserCompany(req, res) {
        try {
            const userId = req.user._id;
            const result = await companyService.getUserCompany(userId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            // Prevent caching to ensure fresh data after reset
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            return res.status(200).json(result);
        } catch (error) {
            console.error('Get user company error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get company'
            });
        }
    }

    // Update company
    async updateCompany(req, res) {
        try {
            const userId = req.user._id;
            const companyId = req.params.id;
            const result = await companyService.updateCompany(userId, companyId, req.body);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update company error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update company'
            });
        }
    }

    // Delete company
    async deleteCompany(req, res) {
        try {
            const userId = req.user._id;
            const companyId = req.params.id;
            const result = await companyService.deleteCompany(userId, companyId);

            // Decrement usage after successful company deletion
            if (result.success) {
                await decrementUsage(req, 'company');
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Delete company error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete company'
            });
        }
    }

    // Get all companies (admin only)
    async getAllCompanies(req, res) {
        try {
            const filters = {
                page: req.query.page,
                limit: req.query.limit,
                search: req.query.search,
                status: req.query.status,
                verificationStatus: req.query.verificationStatus,
                industry: req.query.industry,
                city: req.query.city,
                isActive: req.query.isActive,
                createdAfter: req.query.createdAfter,
                createdBefore: req.query.createdBefore
            };

            const result = await companyService.getAllCompanies(filters);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get all companies error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get companies'
            });
        }
    }

    // Upload document
    async uploadDocument(req, res) {
        try {
            const userId = req.user._id;
            const companyId = req.params.id;
            const { documentType, documentName, documentUrl } = req.body;

            if (!documentType || !documentName || !documentUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Document type, name, and URL are required'
                });
            }

            const result = await companyService.uploadDocument(userId, companyId, {
                documentType,
                documentName,
                documentUrl
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('Upload document error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to upload document'
            });
        }
    }

    // Remove document
    async removeDocument(req, res) {
        try {
            const userId = req.user._id;
            const companyId = req.params.id;
            const documentId = req.params.documentId;

            const result = await companyService.removeDocument(userId, companyId, documentId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Remove document error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to remove document'
            });
        }
    }

    // Update company status (admin only)
    async updateCompanyStatus(req, res) {
        try {
            const companyId = req.params.id;
            const { status, verificationStatus } = req.body;

            if (!status && !verificationStatus) {
                return res.status(400).json({
                    success: false,
                    message: 'Status or verification status is required'
                });
            }

            const result = await companyService.updateCompanyStatus(companyId, status, verificationStatus);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update company status error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update company status'
            });
        }
    }

    // Get company statistics
    async getCompanyStatistics(req, res) {
        try {
            const result = await companyService.getCompanyStatistics();
            return res.status(200).json(result);
        } catch (error) {
            console.error('Get company statistics error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get statistics'
            });
        }
    }

    // Check company name availability
    async checkNameAvailability(req, res) {
        try {
            const { companyName } = req.query;
            const excludeId = req.query.excludeId;

            if (!companyName) {
                return res.status(400).json({
                    success: false,
                    message: 'Company name is required'
                });
            }

            const result = await companyService.checkNameAvailability(companyName, excludeId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Check name availability error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to check name availability'
            });
        }
    }

    // Validate registration details
    async validateRegistrationDetails(req, res) {
        try {
            const { commercialRegistrationNumber, taxIdNumber } = req.body;
            const excludeId = req.body.excludeId;

            if (!commercialRegistrationNumber && !taxIdNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Registration number or tax ID is required'
                });
            }

            const result = await companyService.validateRegistrationDetails(
                commercialRegistrationNumber,
                taxIdNumber,
                excludeId
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('Validate registration details error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to validate registration details'
            });
        }
    }

    // Get company by ID (admin only)
    async getCompanyById(req, res) {
        try {
            const companyId = req.params.id;
            console.log(companyId);
            const result = await companyService.getCompanyById(companyId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            // Prevent caching to ensure fresh data after reset
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            return res.status(200).json(result);
        } catch (error) {
            console.error('Get company by ID error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get company'
            });
        }
    }

    // Get companies by user ID (admin only)
    async getCompaniesByUser(req, res) {
        try {
            const userId = req.params.userId;
            const result = await companyService.getUserCompany(userId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('Get companies by user error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get user companies'
            });
        }
    }

    // Batch update companies (admin only)
    async batchUpdateCompanies(req, res) {
        try {
            const { companyIds, updates } = req.body;

            if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Company IDs array is required'
                });
            }

            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Updates object is required'
                });
            }

            const results = [];
            for (const companyId of companyIds) {
                try {
                    const result = await companyService.updateCompanyStatus(
                        companyId,
                        updates.status,
                        updates.verificationStatus
                    );
                    results.push({ companyId, success: true, data: result });
                } catch (error) {
                    results.push({ companyId, success: false, error: error.message });
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Batch update completed',
                data: results
            });
        } catch (error) {
            console.error('Batch update companies error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to batch update companies'
            });
        }
    }

    // Export companies data (admin only)
    async exportCompanies(req, res) {
        try {
            const filters = {
                search: req.query.search,
                status: req.query.status,
                verificationStatus: req.query.verificationStatus,
                industry: req.query.industry,
                city: req.query.city,
                isActive: req.query.isActive,
                createdAfter: req.query.createdAfter,
                createdBefore: req.query.createdBefore,
                limit: 10000 // Large limit for export
            };

            const result = await companyService.getAllCompanies(filters);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Format data for export
            const exportData = result.data.map(company => ({
                companyName: company.companyName,
                companyNameAr: company.companyNameAr,
                email: company.email,
                phone: company.phone,
                commercialRegistrationNumber: company.commercialRegistrationNumber,
                taxIdNumber: company.taxIdNumber,
                industry: company.industry,
                city: company.address?.city,
                province: company.address?.province,
                status: company.status,
                verificationStatus: company.verificationStatus,
                isActive: company.isActive,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt
            }));

            return res.status(200).json({
                success: true,
                message: 'Export data retrieved successfully',
                data: exportData,
                count: exportData.length
            });
        } catch (error) {
            console.error('Export companies error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to export companies'
            });
        }
    }

    // Get companies created by the logged-in user
    async getCompaniesCreatedByMe(req, res) {
        try {
            const userId = req.user._id;
            console.log('Fetching companies created by:', userId);

            const result = await companyService.getCompaniesCreatedByMe(userId);

            // Prevent caching to ensure fresh data after reset
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            return res.status(200).json(result);
        } catch (error) {
            console.error('Get companies created by me error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get companies created by you'
            });
        }
    }

    // Validate step data before proceeding to next step
    async validateStep(req, res) {
        try {
            const { step, data } = req.body;

            if (!step || !data) {
                return res.status(400).json({
                    success: false,
                    message: 'Step number and data are required'
                });
            }

            const result = await companyService.validateStepData(step, data);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Validate step error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to validate step data'
            });
        }
    }

    // Set a company as default
    async setDefaultCompany(req, res) {
        try {
            const result = await companyService.setDefaultCompany(req.params.id, req.user._id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Set default company error:', error);
            const statusCode = error.message === 'Company not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'Error setting default company'
            });
        }
    }

    // Get the default company
    async getDefaultCompany(req, res) {
        try {
            const result = await companyService.getDefaultCompany(req.user._id);

            // Prevent caching to ensure fresh data after reset
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            return res.status(200).json(result);
        } catch (error) {
            console.error('Get default company error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Error getting default company'
            });
        }
    }
}

module.exports = new CompanyController();