const blogAuthorService = require('../services/blogAuthorService');

class BlogAuthorController {
    /**
     * Create a new blog author
     * POST /api/blog-authors
     */
    async createAuthor(req, res) {
        try {
            const userId = req.user._id;

            const result = await blogAuthorService.createAuthor(
                userId,
                req.body
            );

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create blog author error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create blog author'
            });
        }
    }

    /**
     * Get all blog authors with optional filters
     * GET /api/blog-authors
     */
    async getAuthors(req, res) {
        try {
            const filters = {
                status: req.query.status,
                role: req.query.role,
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await blogAuthorService.getAuthors(filters);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog authors error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blog authors'
            });
        }
    }

    /**
     * Get active authors for blog creation
     * GET /api/blog-authors/active
     */
    async getActiveAuthors(req, res) {
        try {
            const result = await blogAuthorService.getActiveAuthors();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get active blog authors error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get active blog authors'
            });
        }
    }

    /**
     * Get blog author statistics
     * GET /api/blog-authors/stats
     */
    async getAuthorStats(req, res) {
        try {
            const result = await blogAuthorService.getAuthorStats();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog author stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blog author statistics'
            });
        }
    }

    /**
     * Get a single blog author by ID
     * GET /api/blog-authors/:id
     */
    async getAuthorById(req, res) {
        try {
            const { id } = req.params;

            const result = await blogAuthorService.getAuthorById(id);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog author by ID error:', error);
            return res.status(error.message === 'Author not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get blog author'
            });
        }
    }

    /**
     * Update a blog author
     * PUT /api/blog-authors/:id
     */
    async updateAuthor(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogAuthorService.updateAuthor(
                id,
                userId,
                req.body
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog author error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog author'
            });
        }
    }

    /**
     * Update blog author status
     * PATCH /api/blog-authors/:id/status
     */
    async updateAuthorStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await blogAuthorService.updateAuthorStatus(
                id,
                userId,
                status
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog author status error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog author status'
            });
        }
    }

    /**
     * Delete a blog author (soft delete)
     * DELETE /api/blog-authors/:id
     */
    async deleteAuthor(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogAuthorService.deleteAuthor(id, userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete blog author error:', error);
            return res.status(error.message === 'Author not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to delete blog author'
            });
        }
    }

    /**
     * Update all author stats
     * POST /api/blog-authors/update-stats
     */
    async updateAuthorStats(req, res) {
        try {
            const result = await blogAuthorService.updateAllAuthorStats();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update author stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update author stats'
            });
        }
    }
}

module.exports = new BlogAuthorController();
