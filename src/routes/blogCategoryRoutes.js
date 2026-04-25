const express = require('express');
const blogCategoryController = require('../controllers/blogCategoryController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Blog Category Routes

// GET /api/blog-categories/stats - Get category statistics (protected)
router.get('/stats', protect, blogCategoryController.getCategoryStats);

// POST /api/blog-categories/update-counts - Update all blog counts (protected)
router.post('/update-counts', protect, blogCategoryController.updateBlogCounts);

// GET /api/blog-categories/slug/:slug - Get category by slug (public)
router.get('/slug/:slug', blogCategoryController.getCategoryBySlug);

// GET /api/blog-categories - Get all categories with pagination and filters
router.get('/', blogCategoryController.getCategories);

// POST /api/blog-categories - Create a new category (protected)
router.post('/', protect, blogCategoryController.createCategory);

// GET /api/blog-categories/:id - Get a single category by ID
router.get('/:id', blogCategoryController.getCategoryById);

// PUT /api/blog-categories/:id - Update a category (protected)
router.put('/:id', protect, blogCategoryController.updateCategory);

// PATCH /api/blog-categories/:id/status - Update category status (protected)
router.patch('/:id/status', protect, blogCategoryController.updateCategoryStatus);

// DELETE /api/blog-categories/:id - Delete a category (protected)
router.delete('/:id', protect, blogCategoryController.deleteCategory);

module.exports = router;
