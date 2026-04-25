const blogCategoryService = require('../services/blogCategoryService');

class BlogCategoryController {
    /**
     * Create a new blog category
     * POST /api/blog-categories
     */
    async createCategory(req, res) {
        try {
            const userId = req.user._id;

            const result = await blogCategoryService.createCategory(
                userId,
                req.body
            );

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create blog category error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create blog category'
            });
        }
    }

    /**
     * Get all blog categories with optional filters
     * GET /api/blog-categories
     */
    async getCategories(req, res) {
        try {
            const filters = {
                status: req.query.status,
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await blogCategoryService.getCategories(filters);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog categories error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blog categories'
            });
        }
    }

    /**
     * Get blog category statistics
     * GET /api/blog-categories/stats
     */
    async getCategoryStats(req, res) {
        try {
            const result = await blogCategoryService.getCategoryStats();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog category stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blog category statistics'
            });
        }
    }

    /**
     * Get a single blog category by ID
     * GET /api/blog-categories/:id
     */
    async getCategoryById(req, res) {
        try {
            const { id } = req.params;

            const result = await blogCategoryService.getCategoryById(id);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog category by ID error:', error);
            return res.status(error.message === 'Category not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get blog category'
            });
        }
    }

    /**
     * Get a blog category by slug
     * GET /api/blog-categories/slug/:slug
     */
    async getCategoryBySlug(req, res) {
        try {
            const { slug } = req.params;

            const result = await blogCategoryService.getCategoryBySlug(slug);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog category by slug error:', error);
            return res.status(error.message === 'Category not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get blog category'
            });
        }
    }

    /**
     * Update a blog category
     * PUT /api/blog-categories/:id
     */
    async updateCategory(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogCategoryService.updateCategory(
                id,
                userId,
                req.body
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog category error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog category'
            });
        }
    }

    /**
     * Update blog category status
     * PATCH /api/blog-categories/:id/status
     */
    async updateCategoryStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await blogCategoryService.updateCategoryStatus(
                id,
                userId,
                status
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog category status error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog category status'
            });
        }
    }

    /**
     * Delete a blog category (soft delete)
     * DELETE /api/blog-categories/:id
     */
    async deleteCategory(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogCategoryService.deleteCategory(id, userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete blog category error:', error);
            return res.status(error.message === 'Category not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to delete blog category'
            });
        }
    }

    /**
     * Update all blog counts
     * POST /api/blog-categories/update-counts
     */
    async updateBlogCounts(req, res) {
        try {
            const result = await blogCategoryService.updateAllBlogCounts();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog counts error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update blog counts'
            });
        }
    }
}

module.exports = new BlogCategoryController();
