const blogService = require('../services/blogService');

class BlogController {
    /**
     * Create a new blog
     * POST /api/blogs
     */
    async createBlog(req, res) {
        try {
            const userId = req.user._id;

            const result = await blogService.createBlog(
                userId,
                req.body
            );

            return res.status(201).json(result);

        } catch (error) {
            console.error('Create blog error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to create blog'
            });
        }
    }

    /**
     * Get all blogs with optional filters (admin)
     * GET /api/blogs
     */
    async getBlogs(req, res) {
        try {
            const filters = {
                status: req.query.status,
                category: req.query.category,
                author: req.query.author,
                tag: req.query.tag,
                isFeatured: req.query.isFeatured,
                search: req.query.search,
                sortBy: req.query.sortBy,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await blogService.getBlogs(filters);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blogs error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blogs'
            });
        }
    }

    /**
     * Get published blogs (public API)
     * GET /api/blogs/published
     */
    async getPublishedBlogs(req, res) {
        try {
            const filters = {
                category: req.query.category,
                author: req.query.author,
                tag: req.query.tag,
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await blogService.getPublishedBlogs(filters);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get published blogs error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get published blogs'
            });
        }
    }

    /**
     * Get featured blogs
     * GET /api/blogs/featured
     */
    async getFeaturedBlogs(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;

            const result = await blogService.getFeaturedBlogs(limit);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get featured blogs error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get featured blogs'
            });
        }
    }

    /**
     * Get blog statistics
     * GET /api/blogs/stats
     */
    async getBlogStats(req, res) {
        try {
            const result = await blogService.getBlogStats();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blog statistics'
            });
        }
    }

    /**
     * Get all tags
     * GET /api/blogs/tags
     */
    async getAllTags(req, res) {
        try {
            const result = await blogService.getAllTags();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get tags error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get tags'
            });
        }
    }

    /**
     * Get blogs by tag
     * GET /api/blogs/tag/:tag
     */
    async getBlogsByTag(req, res) {
        try {
            const { tag } = req.params;
            const filters = {
                page: req.query.page,
                limit: req.query.limit
            };

            const result = await blogService.getBlogsByTag(tag, filters);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blogs by tag error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get blogs by tag'
            });
        }
    }

    /**
     * Get a single blog by ID
     * GET /api/blogs/:id
     */
    async getBlogById(req, res) {
        try {
            const { id } = req.params;

            const result = await blogService.getBlogById(id);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog by ID error:', error);
            return res.status(error.message === 'Blog not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get blog'
            });
        }
    }

    /**
     * Get a blog by slug (public)
     * GET /api/blogs/slug/:slug
     */
    async getBlogBySlug(req, res) {
        try {
            const { slug } = req.params;
            const incrementViews = req.query.incrementViews !== 'false';

            const result = await blogService.getBlogBySlug(slug, incrementViews);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Get blog by slug error:', error);
            return res.status(error.message === 'Blog not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to get blog'
            });
        }
    }

    /**
     * Update a blog
     * PUT /api/blogs/:id
     */
    async updateBlog(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogService.updateBlog(
                id,
                userId,
                req.body
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog'
            });
        }
    }

    /**
     * Update blog status
     * PATCH /api/blogs/:id/status
     */
    async updateBlogStatus(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;
            const { status } = req.body;

            const result = await blogService.updateBlogStatus(
                id,
                userId,
                status
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error('Update blog status error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to update blog status'
            });
        }
    }

    /**
     * Delete a blog (soft delete)
     * DELETE /api/blogs/:id
     */
    async deleteBlog(req, res) {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await blogService.deleteBlog(id, userId);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Delete blog error:', error);
            return res.status(error.message === 'Blog not found' ? 404 : 400).json({
                success: false,
                message: error.message || 'Failed to delete blog'
            });
        }
    }

    /**
     * Publish scheduled blogs (for cron job)
     * POST /api/blogs/publish-scheduled
     */
    async publishScheduledBlogs(req, res) {
        try {
            const result = await blogService.publishScheduledBlogs();

            return res.status(200).json(result);

        } catch (error) {
            console.error('Publish scheduled blogs error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to publish scheduled blogs'
            });
        }
    }
}

module.exports = new BlogController();
