const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Payment = require('../models/Payment');

// @desc    Get sales overview statistics
// @route   GET /api/reports/sales/overview
// @access  Private
exports.getSalesOverview = async (req, res) => {
  try {
    const { dateRange = '12months', companyId } = req.query;
    const dateFilter = getDateFilter(dateRange);

    // Build query filter
    const filter = {
      createdAt: dateFilter,
      ...(companyId && { company: companyId })
    };

    // Get current period stats
    const currentStats = await calculatePeriodStats(filter);

    // Get previous period stats for comparison
    const previousDateFilter = getPreviousDateFilter(dateRange);
    const previousFilter = {
      createdAt: previousDateFilter,
      ...(companyId && { company: companyId })
    };
    const previousStats = await calculatePeriodStats(previousFilter);

    // Calculate changes
    const changes = calculateChanges(currentStats, previousStats);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: {
          value: currentStats.totalRevenue,
          formatted: `SAR ${currentStats.totalRevenue.toLocaleString()}`,
          change: changes.revenue,
          changeType: changes.revenue >= 0 ? 'increase' : 'decrease'
        },
        totalInvoices: {
          value: currentStats.totalInvoices,
          formatted: currentStats.totalInvoices.toString(),
          change: changes.invoices,
          changeType: changes.invoices >= 0 ? 'increase' : 'decrease'
        },
        activeCustomers: {
          value: currentStats.activeCustomers,
          formatted: currentStats.activeCustomers.toString(),
          change: changes.customers,
          changeType: changes.customers >= 0 ? 'increase' : 'decrease'
        },
        averageInvoice: {
          value: currentStats.averageInvoice,
          formatted: `SAR ${Math.round(currentStats.averageInvoice).toLocaleString()}`,
          change: changes.averageInvoice,
          changeType: changes.averageInvoice >= 0 ? 'increase' : 'decrease'
        }
      }
    });
  } catch (error) {
    console.error('Error getting sales overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales overview',
      error: error.message
    });
  }
};

// @desc    Get monthly revenue data
// @route   GET /api/reports/sales/monthly-revenue
// @access  Private
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { dateRange = '12months', companyId } = req.query;
    const months = parseInt(dateRange.replace('months', '')) || 12;

    const filter = companyId ? { company: companyId } : {};

    const monthlyData = await Invoice.aggregate([
      {
        $match: {
          ...filter,
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - months))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          invoices: { $sum: 1 },
          customers: { $addToSet: '$customerId' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          revenue: 1,
          invoices: 1,
          customers: { $size: '$customers' }
        }
      },
      { $sort: { year: 1, month: 1 } }
    ]);

    // Format the data with month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlyData.map(item => ({
      month: monthNames[item.month - 1],
      year: item.year,
      revenue: item.revenue,
      invoices: item.invoices,
      customers: item.customers
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error getting monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly revenue',
      error: error.message
    });
  }
};

// @desc    Get invoice status distribution
// @route   GET /api/reports/sales/invoice-distribution
// @access  Private
exports.getInvoiceDistribution = async (req, res) => {
  try {
    const { dateRange = '12months', companyId } = req.query;
    const dateFilter = getDateFilter(dateRange);

    const filter = {
      createdAt: dateFilter,
      ...(companyId && { company: companyId })
    };

    const distribution = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalInvoices = distribution.reduce((sum, item) => sum + item.count, 0);

    const formattedDistribution = distribution.map(item => ({
      status: formatStatusName(item._id),
      count: item.count,
      percentage: Math.round((item.count / totalInvoices) * 100),
      color: getStatusColor(item._id)
    }));

    res.status(200).json({
      success: true,
      data: formattedDistribution
    });
  } catch (error) {
    console.error('Error getting invoice distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice distribution',
      error: error.message
    });
  }
};

// @desc    Get top customers by revenue
// @route   GET /api/reports/sales/top-customers
// @access  Private
exports.getTopCustomers = async (req, res) => {
  try {
    const { dateRange = '12months', limit = 5, companyId } = req.query;
    const dateFilter = getDateFilter(dateRange);

    const filter = {
      createdAt: dateFilter,
      ...(companyId && { company: companyId })
    };

    const topCustomers = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$customerId',
          revenue: { $sum: '$total' },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          name: { $arrayElemAt: ['$customerDetails.customerName', 0] },
          revenue: 1,
          invoices: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: topCustomers
    });
  } catch (error) {
    console.error('Error getting top customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top customers',
      error: error.message
    });
  }
};

// @desc    Get top products by sales
// @route   GET /api/reports/sales/top-products
// @access  Private
exports.getTopProducts = async (req, res) => {
  try {
    const { dateRange = '12months', limit = 5, companyId } = req.query;
    const dateFilter = getDateFilter(dateRange);

    const filter = {
      createdAt: dateFilter,
      ...(companyId && { company: companyId })
    };

    const topProducts = await Invoice.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: { $arrayElemAt: ['$productDetails.name', 0] },
          sales: 1,
          revenue: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error('Error getting top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top products',
      error: error.message
    });
  }
};

// @desc    Export sales report
// @route   POST /api/reports/sales/export
// @access  Private
exports.exportSalesReport = async (req, res) => {
  try {
    const { reportType, dateRange, format = 'csv', companyId } = req.body;

    // This is a placeholder - in production, you'd generate actual files
    // and possibly use a job queue for large reports

    res.status(200).json({
      success: true,
      message: 'Export functionality coming soon',
      data: {
        reportType,
        dateRange,
        format,
        status: 'pending',
        estimatedTime: '2-5 minutes'
      }
    });
  } catch (error) {
    console.error('Error exporting sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export sales report',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = companyId ? { company: companyId } : {};

    const stats = await Promise.all([
      Invoice.countDocuments(filter),
      Customer.countDocuments({ ...filter, status: 'active' }),
      Product.countDocuments(filter),
      Invoice.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalInvoices: stats[0],
        activeCustomers: stats[1],
        totalProducts: stats[2],
        totalRevenue: stats[3][0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get revenue trend
// @route   GET /api/reports/financial/revenue-trend
// @access  Private
exports.getRevenueTrend = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Revenue trend endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get payment status
// @route   GET /api/reports/financial/payment-status
// @access  Private
exports.getPaymentStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Payment status endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer analytics
// @route   GET /api/reports/customers/analytics
// @access  Private
exports.getCustomerAnalytics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Customer analytics endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer growth
// @route   GET /api/reports/customers/growth
// @access  Private
exports.getCustomerGrowth = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Customer growth endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product performance
// @route   GET /api/reports/products/performance
// @access  Private
exports.getProductPerformance = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Product performance endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/products/inventory
// @access  Private
exports.getInventoryReport = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Inventory report endpoint - coming soon'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== Helper Functions ==========

function getDateFilter(dateRange) {
  const now = new Date();
  let startDate;

  switch (dateRange) {
    case '7days':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30days':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case '3months':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case '6months':
      startDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case '12months':
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 12));
      break;
  }

  return { $gte: startDate };
}

function getPreviousDateFilter(dateRange) {
  const now = new Date();
  let startDate, endDate;

  switch (dateRange) {
    case '7days':
      endDate = new Date(now.setDate(now.getDate() - 7));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30days':
      endDate = new Date(now.setDate(now.getDate() - 30));
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '3months':
      endDate = new Date(now.setMonth(now.getMonth() - 3));
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      endDate = new Date(now.setMonth(now.getMonth() - 6));
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '12months':
    default:
      endDate = new Date(now.setMonth(now.getMonth() - 12));
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 12);
      break;
  }

  return { $gte: startDate, $lte: endDate };
}

async function calculatePeriodStats(filter) {
  const invoices = await Invoice.find(filter);

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalInvoices = invoices.length;
  const uniqueCustomers = new Set(invoices.map(inv => inv.customerId?.toString())).size;
  const averageInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  return {
    totalRevenue,
    totalInvoices,
    activeCustomers: uniqueCustomers,
    averageInvoice
  };
}

function calculateChanges(current, previous) {
  const calculatePercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };

  return {
    revenue: calculatePercentChange(current.totalRevenue, previous.totalRevenue),
    invoices: calculatePercentChange(current.totalInvoices, previous.totalInvoices),
    customers: calculatePercentChange(current.activeCustomers, previous.activeCustomers),
    averageInvoice: calculatePercentChange(current.averageInvoice, previous.averageInvoice)
  };
}

function formatStatusName(status) {
  const statusMap = {
    'paid': 'Paid',
    'pending': 'Pending',
    'overdue': 'Overdue',
    'draft': 'Draft',
    'cancelled': 'Cancelled'
  };
  return statusMap[status] || status;
}

function getStatusColor(status) {
  const colorMap = {
    'paid': 'bg-primary',
    'pending': 'bg-orange-500',
    'overdue': 'bg-red-500',
    'draft': 'bg-gray-500',
    'cancelled': 'bg-gray-400'
  };
  return colorMap[status] || 'bg-gray-500';
}

module.exports = exports;
