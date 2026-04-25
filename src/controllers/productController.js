const productService = require('../services/productService');

class ProductController {
    /**
     * Create a new product
     * POST /api/products
     */
    async createProduct(req, res) {
        try {
            const userId = req.user._id;

            const result = await productService.createProduct(
                userId,
                req.body
            );

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create product error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create product'
            });
        }
    }

    /**
     * Get all products with optional filters
     * GET /api/products
     */
    async getProducts(req, res) {
        try {
            const userId = req.user._id;

            const filters = {
                status: req.query.status,
                category: req.query.category,
                subcategory: req.query.subcategory,
                search: req.query.search,
                stockStatus: req.query.stockStatus,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await productService.getProducts(
                userId,
                filters
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get products error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get products'
            });
        }
    }

    /**
     * Get product statistics
     * GET /api/products/stats
     */
    async getProductStats(req, res) {
        try {
            const userId = req.user._id;

            const result = await productService.getProductStats(userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get product stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get product statistics'
            });
        }
    }

    /**
     * Get low stock products
     * GET /api/products/low-stock
     */
    async getLowStockProducts(req, res) {
        try {
            const userId = req.user._id;
            const limit = parseInt(req.query.limit) || 10;

            const result = await productService.getLowStockProducts(userId, limit);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get low stock products error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get low stock products'
            });
        }
    }

    /**
     * Get a single product by ID
     * GET /api/products/:id
     */
    async getProductById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await productService.getProductById(
                id,
                userId
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get product by ID error:', error);
            return res.status(error.message === 'Product not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get product'
            });
        }
    }

    /**
     * Update a product
     * PUT /api/products/:id
     */
    async updateProduct(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await productService.updateProduct(
                id,
                userId,
                req.body
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update product error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update product'
            });
        }
    }

    /**
     * Delete a product
     * DELETE /api/products/:id
     */
    async deleteProduct(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await productService.deleteProduct(
                id,
                userId
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete product error:', error);
            return res.status(error.message === 'Product not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to delete product'
            });
        }
    }

    /**
     * Bulk update products
     * PATCH /api/products/bulk
     */
    async bulkUpdateProducts(req, res) {
        try {
            const userId = req.user._id;
            const { updates } = req.body;

            if (!updates || !Array.isArray(updates)) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required'
                });
            }

            const result = await productService.bulkUpdateProducts(
                userId,
                updates
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Bulk update products error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to bulk update products'
            });
        }
    }

    /**
     * Bulk delete products
     * DELETE /api/products/bulk
     */
    async bulkDeleteProducts(req, res) {
        try {
            const userId = req.user._id;
            const { productIds } = req.body;

            if (!productIds || !Array.isArray(productIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Product IDs array is required'
                });
            }

            const result = await productService.bulkDeleteProducts(
                userId,
                productIds
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Bulk delete products error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to bulk delete products'
            });
        }
    }

    /**
     * Update product stock
     * PATCH /api/products/:id/stock
     */
    async updateStock(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { quantity, operation } = req.body;

            if (quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity is required'
                });
            }

            const result = await productService.updateStock(
                id,
                userId,
                quantity,
                operation || 'set'
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update stock error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update stock'
            });
        }
    }

    /**
     * Get products by category
     * GET /api/products/category/:categoryId
     */
    async getProductsByCategory(req, res) {
        try {
            const userId = req.user._id;
            const { categoryId } = req.params;

            const filters = {
                status: req.query.status
            };

            const result = await productService.getProductsByCategory(
                categoryId,
                userId,
                filters
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get products by category error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get products by category'
            });
        }
    }
}

module.exports = new ProductController();
