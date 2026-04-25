const paymentPlanService = require('../services/paymentPlanService');
const logger = require('../../helpers/logger');
const { validationResult } = require('express-validator');

class PaymentPlanController {
  /**
   * Get all payment plans with optional filtering and pagination
   * @route GET /payments/plans
   */
  async getAllPaymentPlans(req, res) {
    try {
      const result = await paymentPlanService.getAllPaymentPlans(req.query);
      
      res.status(200).json({
        success: true,
        message: 'Payment plans retrieved successfully',
        data: result.paymentPlans,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getAllPaymentPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plans',
        error: error.message
      });
    }
  }
  
  /**
   * Get active payment plans for public display
   * @route GET /payments/plans/active
   */
  async getActivePaymentPlans(req, res) {
    try {
      const paymentPlans = await paymentPlanService.getActivePaymentPlans();
      
      res.status(200).json({
        success: true,
        message: 'Active payment plans retrieved successfully',
        data: paymentPlans
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getActivePaymentPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active payment plans',
        error: error.message
      });
    }
  }
  
  /**
   * Get featured payment plans
   * @route GET /payments/plans/featured
   */
  async getFeaturedPaymentPlans(req, res) {
    try {
      const paymentPlans = await paymentPlanService.getFeaturedPaymentPlans();
      
      res.status(200).json({
        success: true,
        message: 'Featured payment plans retrieved successfully',
        data: paymentPlans
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getFeaturedPaymentPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve featured payment plans',
        error: error.message
      });
    }
  }
  
  /**
   * Get popular payment plan
   * @route GET /payments/plans/popular
   */
  async getPopularPaymentPlan(req, res) {
    try {
      const paymentPlan = await paymentPlanService.getPopularPaymentPlan();
      
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'No popular payment plan found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Popular payment plan retrieved successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getPopularPaymentPlan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Get payment plan by ID
   * @route GET /payments/plans/:id
   */
  async getPaymentPlanById(req, res) {
    try {
      const { id } = req.params;
      const paymentPlan = await paymentPlanService.getPaymentPlanById(id);
      
      res.status(200).json({
        success: true,
        message: 'Payment plan retrieved successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getPaymentPlanById:', error);
      
      if (error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Create a new payment plan
   * @route POST /payments/plans
   */
  async createPaymentPlan(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const paymentPlan = await paymentPlanService.createPaymentPlan(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Payment plan created successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.createPaymentPlan:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'Payment plan with this name already exists',
          error: error.message
        });
      }
      
      if (error.message.includes('required')) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Update a payment plan
   * @route PUT /payments/plans/:id
   */
  async updatePaymentPlan(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { id } = req.params;
      const paymentPlan = await paymentPlanService.updatePaymentPlan(id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Payment plan updated successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.updatePaymentPlan:', error);
      
      if (error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
          error: error.message
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: 'Payment plan with this name already exists',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Delete a payment plan (soft delete)
   * @route DELETE /payments/plans/:id
   */
  async deletePaymentPlan(req, res) {
    try {
      const { id } = req.params;
      const paymentPlan = await paymentPlanService.deletePaymentPlan(id);
      
      res.status(200).json({
        success: true,
        message: 'Payment plan deleted successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.deletePaymentPlan:', error);
      
      if (error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Toggle payment plan status
   * @route PATCH /payments/plans/:id/toggle-status
   */
  async togglePaymentPlanStatus(req, res) {
    try {
      const { id } = req.params;
      const paymentPlan = await paymentPlanService.togglePaymentPlanStatus(id);
      
      res.status(200).json({
        success: true,
        message: `Payment plan ${paymentPlan.isActive ? 'activated' : 'deactivated'} successfully`,
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.togglePaymentPlanStatus:', error);
      
      if (error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to toggle payment plan status',
        error: error.message
      });
    }
  }
  
  /**
   * Set payment plan as popular
   * @route PATCH /payments/plans/:id/set-popular
   */
  async setPopularPaymentPlan(req, res) {
    try {
      const { id } = req.params;
      const paymentPlan = await paymentPlanService.setPopularPaymentPlan(id);
      
      res.status(200).json({
        success: true,
        message: 'Payment plan set as popular successfully',
        data: paymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.setPopularPaymentPlan:', error);
      
      if (error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to set payment plan as popular',
        error: error.message
      });
    }
  }
  
  /**
   * Update payment plans order
   * @route PATCH /payments/plans/order
   */
  async updatePaymentPlansOrder(req, res) {
    try {
      const { paymentPlanOrders } = req.body;
      
      if (!Array.isArray(paymentPlanOrders)) {
        return res.status(400).json({
          success: false,
          message: 'paymentPlanOrders must be an array'
        });
      }
      
      const paymentPlans = await paymentPlanService.updatePaymentPlansOrder(paymentPlanOrders);
      
      res.status(200).json({
        success: true,
        message: 'Payment plans order updated successfully',
        data: paymentPlans
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.updatePaymentPlansOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment plans order',
        error: error.message
      });
    }
  }
  
  /**
   * Get payment plan statistics
   * @route GET /payments/plans/stats
   */
  async getPaymentPlanStats(req, res) {
    try {
      const stats = await paymentPlanService.getPaymentPlanStats();
      
      res.status(200).json({
        success: true,
        message: 'Payment plan statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.getPaymentPlanStats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plan statistics',
        error: error.message
      });
    }
  }
  
  /**
   * Duplicate a payment plan
   * @route POST /payments/plans/:id/duplicate
   */
  async duplicatePaymentPlan(req, res) {
    try {
      const { id } = req.params;
      const options = req.body;
      
      const duplicatedPaymentPlan = await paymentPlanService.duplicatePaymentPlan(id, options);
      
      res.status(201).json({
        success: true,
        message: 'Payment plan duplicated successfully',
        data: duplicatedPaymentPlan
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.duplicatePaymentPlan:', error);
      
      if (error.message === 'Original payment plan not found' || error.message === 'Payment plan not found') {
        return res.status(404).json({
          success: false,
          message: 'Original payment plan not found',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate payment plan',
        error: error.message
      });
    }
  }
  
  /**
   * Search payment plans
   * @route GET /payments/plans/search
   */
  async searchPaymentPlans(req, res) {
    try {
      const { q: searchTerm, ...filters } = req.query;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters long'
        });
      }
      
      // Convert string filters to appropriate types
      if (filters.isActive !== undefined) {
        filters.isActive = filters.isActive === 'true';
      }
      
      if (filters.minPrice) {
        filters.minPrice = parseFloat(filters.minPrice);
      }
      
      if (filters.maxPrice) {
        filters.maxPrice = parseFloat(filters.maxPrice);
      }
      
      if (filters.limit) {
        filters.limit = parseInt(filters.limit);
      }
      
      const paymentPlans = await paymentPlanService.searchPaymentPlans(searchTerm.trim(), filters);
      
      res.status(200).json({
        success: true,
        message: 'Payment plans search completed successfully',
        data: paymentPlans,
        searchTerm: searchTerm.trim(),
        filters
      });
    } catch (error) {
      logger.error('Error in PaymentPlanController.searchPaymentPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search payment plans',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentPlanController();