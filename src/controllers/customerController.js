const customerService = require('../services/customerService');
const { incrementUsage, decrementUsage } = require('../../middleware/planMiddleware');

class CustomerController {
    // Create a new customer
    async createCustomer(req, res) {
        try {
            const userId = req.user._id;

            console.log('User ID:', userId);
            console.log('Request body:', req.body);
            const result = await customerService.createCustomer(userId, req.body);

            // Increment usage tracker after successful customer creation
            await incrementUsage(req, 'customer', 1);

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create customer error:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create customer'
            });
        }
    }

    // Get all customers for a user
    async getCustomers(req, res) {
        try {
            const userId = req.user._id;
            const result = await customerService.getCustomers(userId, req.query);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customers error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customers'
            });
        }
    }

    // Get all active customers for invoice creation (simplified data)
    async getCustomersForInvoice(req, res) {
        try {
            const userId = req.user._id;
            const result = await customerService.getCustomersForInvoice(userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customers for invoice error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customers'
            });
        }
    }

    // Get a single customer by ID
    async getCustomerById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const result = await customerService.getCustomerById(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customer by ID error:', error);
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customer'
            });
        }
    }

    // Update a customer
    async updateCustomer(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            console.log('Update customer request body:', req.body);
            const result = await customerService.updateCustomer(id, userId, req.body);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update customer error:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update customer'
            });
        }
    }

    // Soft delete a customer
    async deleteCustomer(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const result = await customerService.deleteCustomer(id, userId);

            // Decrement usage tracker after successful customer deletion
            await decrementUsage(req, 'customer', 1);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete customer error:', error);
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete customer'
            });
        }
    }

    // Update customer status
    async updateCustomerStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;
            const result = await customerService.updateCustomerStatus(id, userId, status);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Update customer status error:', error);
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update customer status'
            });
        }
    }

    // Search customers
    async searchCustomers(req, res) {
        try {
            const userId = req.user._id;
            const { q: searchTerm } = req.query;
            const result = await customerService.searchCustomers(userId, searchTerm);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Search customers error:', error);
            if (error.message === 'Search term is required') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to search customers'
            });
        }
    }

    // Validate customer details (for invoice creation)
    async validateCustomerForInvoice(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const result = await customerService.validateCustomerForInvoice(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Validate customer error:', error);
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to validate customer'
            });
        }
    }

    // Get comprehensive customer details with history, metrics, and rankings
    async getCustomerDetails(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await customerService.getCustomerDetails(id, userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customer details error:', error);
            if (error.message === 'Customer not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customer details'
            });
        }
    }

    // Get customer statistics
    async getCustomerStats(req, res) {
        try {
            const userId = req.user._id;
            const result = await customerService.getCustomerStats(userId);
            return res.status(200).json(result);

        } catch (error) {
            console.error('Get customer stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get customer statistics'
            });
        }
    }

    // Export customers
    async exportCustomers(req, res) {
        try {
            const userId = req.user._id;
            const { format = 'csv' } = req.query;
            const filters = req.query;

            const result = await customerService.exportCustomers(userId, format, filters);

            // Set appropriate headers for file download
            res.setHeader('Content-Type', result.data.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);

            return res.send(result.data.content);

        } catch (error) {
            console.error('Export customers error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to export customers'
            });
        }
    }
}

module.exports = new CustomerController();