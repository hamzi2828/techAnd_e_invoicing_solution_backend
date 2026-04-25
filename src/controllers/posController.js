const invoiceService = require('../services/invoiceService');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const { incrementUsage } = require('../../middleware/planMiddleware');

class POSController {
  /**
   * Create a new POS order
   * Supports both walk-in customers and existing customers
   */
  async createPOSOrder(req, res) {
    try {
      const userId = req.user._id;
      const {
        customerId,
        customerName,
        items,
        subtotal,
        discountPercent,
        discountAmount,
        taxAmount,
        total,
        paymentMethod,
        notes
      } = req.body;

      // Validate items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty. Please add items before checkout.'
        });
      }

      // Determine if this is a walk-in or existing customer sale
      const isWalkIn = !customerId;

      if (isWalkIn) {
        // Walk-in sale - create a simplified POS receipt (no invoice)
        const orderNumber = `POS-${Date.now().toString().slice(-8)}`;

        const posOrder = {
          id: orderNumber,
          orderNumber,
          customerType: 'WALK_IN',
          customerName: customerName || 'Walk-in Customer',
          items: items.map(item => ({
            id: item.productId,
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            price: item.unitPrice,
            quantity: item.quantity,
            taxRate: item.taxRate,
            discount: item.discount,
            total: item.total
          })),
          subtotal,
          discountPercent: discountPercent || 0,
          discountAmount: discountAmount || 0,
          taxAmount,
          total,
          paymentMethod: paymentMethod || 'cash',
          paymentStatus: 'completed',
          notes: notes || 'Walk-in POS Sale',
          createdAt: new Date().toISOString(),
          createdBy: userId
        };

        return res.status(201).json({
          success: true,
          message: 'Walk-in sale completed successfully',
          data: posOrder
        });
      }

      // Existing customer - create an invoice
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        customer: customerId,
        invoiceDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        items: items.map(item => ({
          product: item.productId,
          name: item.name,
          description: item.sku ? `SKU: ${item.sku}` : '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 15,
          discountRate: item.discount || 0,
          totalAmount: item.total
        })),
        subtotal,
        discount: discountAmount || 0,
        tax: taxAmount,
        totalAmount: total,
        status: 'paid',
        paymentMethod: paymentMethod || 'cash',
        notes: notes || `POS Sale - ${(paymentMethod || 'cash').toUpperCase()}`,
        source: 'POS'
      };

      const result = await invoiceService.createInvoice(userId, invoiceData);

      // Track invoice creation for plan limits
      await incrementUsage(req, 'invoice', 1);

      // Transform to POS order format for frontend
      const posOrder = {
        id: result.data?._id || result.data?.id,
        orderNumber: result.data?.invoiceNumber,
        customerId,
        customerName,
        customerType: 'REGISTERED',
        items: items.map(item => ({
          id: item.productId,
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          price: item.unitPrice,
          quantity: item.quantity,
          taxRate: item.taxRate,
          discount: item.discount,
          total: item.total
        })),
        subtotal,
        discountPercent: discountPercent || 0,
        discountAmount: discountAmount || 0,
        taxAmount,
        total,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'completed',
        invoiceId: result.data?._id,
        createdAt: new Date().toISOString()
      };

      return res.status(201).json({
        success: true,
        message: 'POS sale completed and invoice created successfully',
        data: posOrder
      });

    } catch (error) {
      console.error('Create POS order error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create POS order'
      });
    }
  }

  /**
   * Get today's sales summary
   */
  async getTodaySummary(req, res) {
    try {
      const userId = req.user._id;

      // Get start and end of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Query invoices created today with POS source
      const todayInvoices = await Invoice.find({
        userId,
        createdAt: { $gte: today, $lt: tomorrow },
        $or: [
          { source: 'POS' },
          { notes: { $regex: /POS Sale/i } }
        ]
      }).populate('items.product');

      // Calculate summary
      let totalSales = 0;
      let totalOrders = todayInvoices.length;
      const productSales = {};

      todayInvoices.forEach(invoice => {
        totalSales += invoice.totalAmount || 0;

        (invoice.items || []).forEach(item => {
          const productName = item.name || item.product?.name || 'Unknown';
          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity || 0;
          productSales[productName].revenue += item.totalAmount || 0;
        });
      });

      // Get top products
      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return res.status(200).json({
        success: true,
        data: {
          totalSales,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
          topProducts
        }
      });

    } catch (error) {
      console.error('Get today summary error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get today\'s summary'
      });
    }
  }

  /**
   * Get recent POS orders
   */
  async getRecentOrders(req, res) {
    try {
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;

      // Query recent POS invoices
      const invoices = await Invoice.find({
        userId,
        $or: [
          { source: 'POS' },
          { notes: { $regex: /POS Sale/i } }
        ]
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'name email phone')
        .populate('items.product', 'name sku');

      // Transform to POS order format
      const orders = invoices.map(invoice => ({
        id: invoice._id,
        orderNumber: invoice.invoiceNumber,
        customerId: invoice.customer?._id,
        customerName: invoice.customer?.name || 'Walk-in Customer',
        items: (invoice.items || []).map(item => ({
          id: item._id,
          productId: item.product?._id,
          name: item.name || item.product?.name,
          sku: item.product?.sku,
          price: item.unitPrice,
          quantity: item.quantity,
          taxRate: item.taxRate,
          discount: item.discountRate,
          total: item.totalAmount
        })),
        subtotal: invoice.subtotal,
        discountAmount: invoice.discount,
        taxAmount: invoice.tax,
        total: invoice.totalAmount,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.status === 'paid' ? 'completed' : 'pending',
        createdAt: invoice.createdAt
      }));

      const total = await Invoice.countDocuments({
        userId,
        $or: [
          { source: 'POS' },
          { notes: { $regex: /POS Sale/i } }
        ]
      });

      return res.status(200).json({
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get recent orders error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get recent orders'
      });
    }
  }

  /**
   * Get a specific POS order by ID
   */
  async getOrderById(req, res) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      const invoice = await Invoice.findOne({
        _id: id,
        userId,
        $or: [
          { source: 'POS' },
          { notes: { $regex: /POS Sale/i } }
        ]
      })
        .populate('customer', 'name email phone')
        .populate('items.product', 'name sku');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'POS order not found'
        });
      }

      const order = {
        id: invoice._id,
        orderNumber: invoice.invoiceNumber,
        customerId: invoice.customer?._id,
        customerName: invoice.customer?.name || 'Walk-in Customer',
        items: (invoice.items || []).map(item => ({
          id: item._id,
          productId: item.product?._id,
          name: item.name || item.product?.name,
          sku: item.product?.sku,
          price: item.unitPrice,
          quantity: item.quantity,
          taxRate: item.taxRate,
          discount: item.discountRate,
          total: item.totalAmount
        })),
        subtotal: invoice.subtotal,
        discountAmount: invoice.discount,
        taxAmount: invoice.tax,
        total: invoice.totalAmount,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.status === 'paid' ? 'completed' : 'pending',
        createdAt: invoice.createdAt
      };

      return res.status(200).json({
        success: true,
        data: order
      });

    } catch (error) {
      console.error('Get order by ID error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get order'
      });
    }
  }
}

module.exports = new POSController();
