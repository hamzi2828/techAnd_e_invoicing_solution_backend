const PaymentPlan = require('../models/PaymentPlan');
const logger = require('../../helpers/logger');

class PaymentPlanService {
  /**
   * Get all payment plans
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Payment plans with pagination info
   */
  async getAllPaymentPlans(query = {}) {
    try {
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Build filter for payment plans
      const filter = {};
      
      // Active filter
      if (query.active !== undefined) {
        filter.isActive = query.active === 'true';
      }
      
      // Popular filter
      if (query.popular !== undefined) {
        filter.isPopular = query.popular === 'true';
      }
      
      // Featured filter
      if (query.featured !== undefined) {
        filter.isFeatured = query.featured === 'true';
      }
      
      // Currency filter
      if (query.currency) {
        filter.currency = query.currency;
      }
      
      // Price range filter
      if (query.minPrice || query.maxPrice) {
        const billingCycle = query.billingCycle || 'monthly';
        const priceField = billingCycle === 'yearly' ? 'yearlyPrice' : 'monthlyPrice';
        filter[priceField] = {};
        
        if (query.minPrice) {
          filter[priceField].$gte = parseFloat(query.minPrice);
        }
        
        if (query.maxPrice) {
          filter[priceField].$lte = parseFloat(query.maxPrice);
        }
      }
      
      // Date validity filter
      if (query.validNow === 'true') {
        const now = new Date();
        filter.validFrom = { $lte: now };
        filter.$or = [
          { validUntil: null },
          { validUntil: { $gte: now } }
        ];
      }
      
      // Search filter
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ];
      }
      
      // Sort options
      const sortOptions = {};
      if (query.sortBy) {
        const sortField = query.sortBy;
        const sortOrder = query.sortOrder === 'desc' || query.sortOrder === '-1' ? -1 : 1;
        sortOptions[sortField] = sortOrder;
      } else {
        sortOptions.sortOrder = 1;
        sortOptions.createdAt = 1;
      }
      
      // Execute query
      const paymentPlans = await PaymentPlan.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean();
      
      const total = await PaymentPlan.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);
      
      return {
        paymentPlans,
        pagination: {
          current: page,
          pages: totalPages,
          total,
          limit
        }
      };
    } catch (error) {
      logger.error('Error in PaymentPlanService.getAllPaymentPlans:', error);
      throw error;
    }
  }
  
  /**
   * Get payment plan by ID
   * @param {string} paymentPlanId - Payment Plan ID
   * @returns {Promise<Object>} Payment plan object
   */
  async getPaymentPlanById(paymentPlanId) {
    try {
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        throw new Error('Payment plan not found');
      }
      return paymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.getPaymentPlanById for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get active payment plans for public display
   * @returns {Promise<Array>} Active payment plans
   */
  async getActivePaymentPlans() {
    try {
      const paymentPlans = await PaymentPlan.getActivePaymentPlans();
      return paymentPlans;
    } catch (error) {
      logger.error('Error in PaymentPlanService.getActivePaymentPlans:', error);
      throw error;
    }
  }
  
  /**
   * Get featured payment plans
   * @returns {Promise<Array>} Featured payment plans
   */
  async getFeaturedPaymentPlans() {
    try {
      const paymentPlans = await PaymentPlan.getFeaturedPaymentPlans();
      return paymentPlans;
    } catch (error) {
      logger.error('Error in PaymentPlanService.getFeaturedPaymentPlans:', error);
      throw error;
    }
  }
  
  /**
   * Get popular payment plan
   * @returns {Promise<Object>} Popular payment plan
   */
  async getPopularPaymentPlan() {
    try {
      const paymentPlan = await PaymentPlan.getPopularPaymentPlan();
      return paymentPlan;
    } catch (error) {
      logger.error('Error in PaymentPlanService.getPopularPaymentPlan:', error);
      throw error;
    }
  }
  
  /**
   * Create a new payment plan
   * @param {Object} paymentPlanData - Payment plan data
   * @returns {Promise<Object>} Created payment plan
   */
  async createPaymentPlan(paymentPlanData) {
    try {
      // Validate required fields
      const requiredFields = ['name', 'description', 'monthlyPrice', 'yearlyPrice'];
      for (const field of requiredFields) {
        if (!paymentPlanData[field]) {
          throw new Error(`${field} is required for payment plan`);
        }
      }
      
      // Ensure unique name
      const existingPaymentPlan = await PaymentPlan.findOne({ 
        name: paymentPlanData.name,
        isActive: true 
      });
      
      if (existingPaymentPlan) {
        throw new Error('Payment plan with this name already exists');
      }
      
      // Set default features if not provided
      if (!paymentPlanData.features) {
        paymentPlanData.features = this.getDefaultPaymentPlanFeatures();
      }
      
      // Set sort order if not provided
      if (!paymentPlanData.sortOrder) {
        const lastPaymentPlan = await PaymentPlan.findOne().sort({ sortOrder: -1 });
        paymentPlanData.sortOrder = lastPaymentPlan ? lastPaymentPlan.sortOrder + 1 : 1;
      }
      
      const paymentPlan = new PaymentPlan(paymentPlanData);
      await paymentPlan.save();
      
      logger.info(`Payment plan created: ${paymentPlan.name} (ID: ${paymentPlan._id})`);
      return paymentPlan;
    } catch (error) {
      logger.error('Error in PaymentPlanService.createPaymentPlan:', error);
      throw error;
    }
  }
  
  /**
   * Update a payment plan
   * @param {string} paymentPlanId - Payment Plan ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated payment plan
   */
  async updatePaymentPlan(paymentPlanId, updateData) {
    try {
      // Check if payment plan exists
      const existingPaymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!existingPaymentPlan) {
        throw new Error('Payment plan not found');
      }
      
      // Check for name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingPaymentPlan.name) {
        const duplicatePaymentPlan = await PaymentPlan.findOne({
          name: updateData.name,
          _id: { $ne: paymentPlanId },
          isActive: true
        });
        
        if (duplicatePaymentPlan) {
          throw new Error('Payment plan with this name already exists');
        }
      }
      
      // Update payment plan
      const paymentPlan = await PaymentPlan.findByIdAndUpdate(
        paymentPlanId,
        updateData,
        { new: true, runValidators: true }
      );
      
      logger.info(`Payment plan updated: ${paymentPlan.name} (ID: ${paymentPlan._id})`);
      return paymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.updatePaymentPlan for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a payment plan (soft delete by setting isActive to false)
   * @param {string} paymentPlanId - Payment Plan ID
   * @returns {Promise<Object>} Deleted payment plan
   */
  async deletePaymentPlan(paymentPlanId) {
    try {
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        throw new Error('Payment plan not found');
      }
      
      // Soft delete by setting isActive to false
      paymentPlan.isActive = false;
      await paymentPlan.save();
      
      logger.info(`Payment plan deleted: ${paymentPlan.name} (ID: ${paymentPlan._id})`);
      return paymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.deletePaymentPlan for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Toggle payment plan status (active/inactive)
   * @param {string} paymentPlanId - Payment Plan ID
   * @returns {Promise<Object>} Updated payment plan
   */
  async togglePaymentPlanStatus(paymentPlanId) {
    try {
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        throw new Error('Payment plan not found');
      }
      
      paymentPlan.isActive = !paymentPlan.isActive;
      await paymentPlan.save();
      
      logger.info(`Payment plan status toggled: ${paymentPlan.name} (ID: ${paymentPlan._id}) - Active: ${paymentPlan.isActive}`);
      return paymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.togglePaymentPlanStatus for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Set payment plan as popular (only one payment plan can be popular)
   * @param {string} paymentPlanId - Payment Plan ID
   * @returns {Promise<Object>} Updated payment plan
   */
  async setPopularPaymentPlan(paymentPlanId) {
    try {
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        throw new Error('Payment plan not found');
      }
      
      // Remove popular status from all other payment plans
      await PaymentPlan.updateMany(
        { _id: { $ne: paymentPlanId } },
        { $set: { isPopular: false } }
      );
      
      // Set this payment plan as popular
      paymentPlan.isPopular = true;
      await paymentPlan.save();
      
      logger.info(`Payment plan set as popular: ${paymentPlan.name} (ID: ${paymentPlan._id})`);
      return paymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.setPopularPaymentPlan for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk update payment plan order
   * @param {Array} paymentPlanOrders - Array of {id, sortOrder} objects
   * @returns {Promise<Array>} Updated payment plans
   */
  async updatePaymentPlansOrder(paymentPlanOrders) {
    try {
      const updatePromises = paymentPlanOrders.map(({ id, sortOrder }) =>
        PaymentPlan.findByIdAndUpdate(id, { sortOrder }, { new: true })
      );
      
      const updatedPaymentPlans = await Promise.all(updatePromises);
      
      logger.info(`Updated order for ${updatedPaymentPlans.length} payment plans`);
      return updatedPaymentPlans;
    } catch (error) {
      logger.error('Error in PaymentPlanService.updatePaymentPlansOrder:', error);
      throw error;
    }
  }
  
  /**
   * Get payment plan statistics
   * @returns {Promise<Object>} Payment plan statistics
   */
  async getPaymentPlanStats() {
    try {
      const stats = await PaymentPlan.aggregate([
        {
          $group: {
            _id: null,
            totalPaymentPlans: { $sum: 1 },
            activePaymentPlans: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            featuredPaymentPlans: {
              $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
            },
            popularPaymentPlans: {
              $sum: { $cond: [{ $eq: ['$isPopular', true] }, 1, 0] }
            },
            averageMonthlyPrice: { $avg: '$monthlyPrice' },
            averageYearlyPrice: { $avg: '$yearlyPrice' },
            minMonthlyPrice: { $min: '$monthlyPrice' },
            maxMonthlyPrice: { $max: '$monthlyPrice' },
            minYearlyPrice: { $min: '$yearlyPrice' },
            maxYearlyPrice: { $max: '$yearlyPrice' }
          }
        }
      ]);
      
      const result = stats[0] || {
        totalPaymentPlans: 0,
        activePaymentPlans: 0,
        featuredPaymentPlans: 0,
        popularPaymentPlans: 0,
        averageMonthlyPrice: 0,
        averageYearlyPrice: 0,
        minMonthlyPrice: 0,
        maxMonthlyPrice: 0,
        minYearlyPrice: 0,
        maxYearlyPrice: 0
      };
      
      // Round averages to 2 decimal places
      result.averageMonthlyPrice = Math.round(result.averageMonthlyPrice * 100) / 100;
      result.averageYearlyPrice = Math.round(result.averageYearlyPrice * 100) / 100;
      
      // Add currency breakdown
      const currencyStats = await PaymentPlan.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            avgMonthlyPrice: { $avg: '$monthlyPrice' },
            avgYearlyPrice: { $avg: '$yearlyPrice' }
          }
        }
      ]);
      
      result.currencyBreakdown = currencyStats.map(stat => ({
        currency: stat._id,
        count: stat.count,
        avgMonthlyPrice: Math.round(stat.avgMonthlyPrice * 100) / 100,
        avgYearlyPrice: Math.round(stat.avgYearlyPrice * 100) / 100
      }));
      
      return result;
    } catch (error) {
      logger.error('Error in PaymentPlanService.getPaymentPlanStats:', error);
      throw error;
    }
  }
  
  /**
   * Duplicate a payment plan
   * @param {string} paymentPlanId - Payment Plan ID to duplicate
   * @param {Object} options - Duplication options
   * @returns {Promise<Object>} Duplicated payment plan
   */
  async duplicatePaymentPlan(paymentPlanId, options = {}) {
    try {
      const originalPaymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!originalPaymentPlan) {
        throw new Error('Original payment plan not found');
      }
      
      // Create new payment plan data based on original
      const newPaymentPlanData = {
        ...originalPaymentPlan.toObject(),
        name: options.newName || `${originalPaymentPlan.name} (Copy)`,
        isPopular: false,
        isFeatured: false,
        isActive: options.makeActive !== undefined ? options.makeActive : true,
        sortOrder: undefined // Will be set automatically
      };
      
      // Remove _id and timestamps
      delete newPaymentPlanData._id;
      delete newPaymentPlanData.createdAt;
      delete newPaymentPlanData.updatedAt;
      delete newPaymentPlanData.__v;
      
      // Handle features and limits based on options
      if (options.copyFeatures === false) {
        newPaymentPlanData.features = this.getDefaultPaymentPlanFeatures();
      }
      
      if (options.copyLimits === false) {
        newPaymentPlanData.limits = {
          invoicesPerMonth: null,
          customers: null,
          products: null,
          users: 1,
          storage: null
        };
      }
      
      const duplicatedPaymentPlan = await this.createPaymentPlan(newPaymentPlanData);
      
      logger.info(`Payment plan duplicated: ${originalPaymentPlan.name} -> ${duplicatedPaymentPlan.name}`);
      return duplicatedPaymentPlan;
    } catch (error) {
      logger.error(`Error in PaymentPlanService.duplicatePaymentPlan for ID ${paymentPlanId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get default features for a new payment plan
   * @returns {Array} Default features
   */
  getDefaultPaymentPlanFeatures() {
    return [
      {
        name: 'إنشاء الفواتير',
        description: 'إنشاء وتخصيص الفواتير الإلكترونية',
        included: true
      },
      {
        name: 'إدارة العملاء',
        description: 'إدارة معلومات العملاء والموردين',
        included: true
      },
      {
        name: 'التقارير الأساسية',
        description: 'الوصول للتقارير الأساسية',
        included: true
      },
      {
        name: 'الدعم الفني',
        description: 'دعم فني عبر البريد الإلكتروني',
        included: true
      }
    ];
  }
  
  /**
   * Search payment plans by various criteria
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching payment plans
   */
  async searchPaymentPlans(searchTerm, filters = {}) {
    try {
      const query = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      };
      
      // Apply additional filters
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      if (filters.currency) {
        query.currency = filters.currency;
      }
      
      if (filters.minPrice || filters.maxPrice) {
        const billingCycle = filters.billingCycle || 'monthly';
        const priceField = billingCycle === 'yearly' ? 'yearlyPrice' : 'monthlyPrice';
        query[priceField] = {};
        
        if (filters.minPrice) {
          query[priceField].$gte = filters.minPrice;
        }
        
        if (filters.maxPrice) {
          query[priceField].$lte = filters.maxPrice;
        }
      }
      
      const paymentPlans = await PaymentPlan.find(query)
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(filters.limit || 20);
      
      return paymentPlans;
    } catch (error) {
      logger.error('Error in PaymentPlanService.searchPaymentPlans:', error);
      throw error;
    }
  }
}

module.exports = new PaymentPlanService();