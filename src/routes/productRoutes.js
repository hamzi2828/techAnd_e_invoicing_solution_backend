const express = require('express');
const productController = require('../controllers/productController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Product Routes

// GET /api/products/stats - Get product statistics
router.get('/stats', protect, productController.getProductStats);

// GET /api/products/low-stock - Get low stock products
router.get('/low-stock', protect, productController.getLowStockProducts);

// GET /api/products/category/:categoryId - Get products by category
router.get('/category/:categoryId', protect, productController.getProductsByCategory);

// PATCH /api/products/bulk - Bulk update products
router.patch('/bulk', protect, productController.bulkUpdateProducts);

// DELETE /api/products/bulk - Bulk delete products
router.delete('/bulk', protect, productController.bulkDeleteProducts);

// GET /api/products - Get all products with pagination and filters
router.get('/', protect, productController.getProducts);

// POST /api/products - Create a new product
router.post('/', protect, productController.createProduct);

// GET /api/products/:id - Get a single product by ID
router.get('/:id', protect, productController.getProductById);

// PUT /api/products/:id - Update a product
router.put('/:id', protect, productController.updateProduct);

// DELETE /api/products/:id - Delete a product
router.delete('/:id', protect, productController.deleteProduct);

// PATCH /api/products/:id/stock - Update product stock
router.patch('/:id/stock', protect, productController.updateStock);

module.exports = router;
