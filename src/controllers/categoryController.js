const categoryService = require('../services/categoryService');

class CategoryController {
    /**
     * Create a new category
     * POST /api/categories
     */
    async createCategory(req, res) {
        try {
            const userId = req.user._id;

            const result = await categoryService.createCategory(
                userId,
                req.body
            );

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create category error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create category'
            });
        }
    }

    /**
     * Get all categories with optional filters
     * GET /api/categories
     */
    async getCategories(req, res) {
        try {
            const userId = req.user._id;

            const filters = {
                status: req.query.status,
                parentId: req.query.parentId,
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await categoryService.getCategories(
                userId,
                filters
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get categories error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get categories'
            });
        }
    }

    /**
     * Get category tree structure
     * GET /api/categories/tree
     */
    async getCategoryTree(req, res) {
        try {
            const userId = req.user._id;

            const result = await categoryService.getCategoryTree(userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get category tree error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get category tree'
            });
        }
    }

    /**
     * Get category statistics
     * GET /api/categories/stats
     */
    async getCategoryStats(req, res) {
        try {
            const userId = req.user._id;

            const result = await categoryService.getCategoryStats(userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get category stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get category statistics'
            });
        }
    }

    /**
     * Get a single category by ID
     * GET /api/categories/:id
     */
    async getCategoryById(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await categoryService.getCategoryById(
                id,
                userId
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get category by ID error:', error);
            return res.status(error.message === 'Category not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get category'
            });
        }
    }

    /**
     * Update a category
     * PUT /api/categories/:id
     */
    async updateCategory(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await categoryService.updateCategory(
                id,
                userId,
                req.body
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update category error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update category'
            });
        }
    }

    /**
     * Delete a category
     * DELETE /api/categories/:id
     */
    async deleteCategory(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await categoryService.deleteCategory(
                id,
                userId
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete category error:', error);
            return res.status(error.message === 'Category not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to delete category'
            });
        }
    }

    /**
     * Bulk update categories
     * PATCH /api/categories/bulk
     */
    async bulkUpdateCategories(req, res) {
        try {
            const userId = req.user._id;
            const { updates } = req.body;

            if (!updates || !Array.isArray(updates)) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required'
                });
            }

            const result = await categoryService.bulkUpdateCategories(
                userId,
                updates
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Bulk update categories error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to bulk update categories'
            });
        }
    }

    /**
     * Reorder categories
     * PATCH /api/categories/reorder
     */
    async reorderCategories(req, res) {
        try {
            const userId = req.user._id;
            const { categoryOrders } = req.body;

            if (!categoryOrders || !Array.isArray(categoryOrders)) {
                return res.status(400).json({
                    success: false,
                    message: 'Category orders array is required'
                });
            }

            const result = await categoryService.reorderCategories(
                userId,
                categoryOrders
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Reorder categories error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to reorder categories'
            });
        }
    }
}

module.exports = new CategoryController();
