const express = require('express');
const blogController = require('../controllers/blogController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Blog Routes

// GET /api/blogs/stats - Get blog statistics (protected)
router.get('/stats', protect, blogController.getBlogStats);

// GET /api/blogs/published - Get published blogs (public)
router.get('/published', blogController.getPublishedBlogs);

// GET /api/blogs/featured - Get featured blogs (public)
router.get('/featured', blogController.getFeaturedBlogs);

// GET /api/blogs/tags - Get all unique tags (public)
router.get('/tags', blogController.getAllTags);

// GET /api/blogs/tag/:tag - Get blogs by tag (public)
router.get('/tag/:tag', blogController.getBlogsByTag);

// POST /api/blogs/publish-scheduled - Publish scheduled blogs (protected, for cron)
router.post('/publish-scheduled', protect, blogController.publishScheduledBlogs);

// GET /api/blogs/slug/:slug - Get blog by slug (public)
router.get('/slug/:slug', blogController.getBlogBySlug);

// GET /api/blogs - Get all blogs with pagination and filters (protected)
router.get('/', protect, blogController.getBlogs);

// POST /api/blogs - Create a new blog (protected)
router.post('/', protect, blogController.createBlog);

// GET /api/blogs/:id - Get a single blog by ID (protected)
router.get('/:id', protect, blogController.getBlogById);

// PUT /api/blogs/:id - Update a blog (protected)
router.put('/:id', protect, blogController.updateBlog);

// PATCH /api/blogs/:id/status - Update blog status (protected)
router.patch('/:id/status', protect, blogController.updateBlogStatus);

// DELETE /api/blogs/:id - Delete a blog (protected)
router.delete('/:id', protect, blogController.deleteBlog);

module.exports = router;
