const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Category Routes

// GET /api/categories/tree - Get category tree structure
router.get('/tree', protect, categoryController.getCategoryTree);

// GET /api/categories/stats - Get category statistics
router.get('/stats', protect, categoryController.getCategoryStats);

// PATCH /api/categories/reorder - Reorder categories
router.patch('/reorder', protect, categoryController.reorderCategories);

// PATCH /api/categories/bulk - Bulk update categories
router.patch('/bulk', protect, categoryController.bulkUpdateCategories);

// GET /api/categories - Get all categories with pagination and filters
router.get('/', protect, categoryController.getCategories);

// POST /api/categories - Create a new category
router.post('/', protect, categoryController.createCategory);

// GET /api/categories/:id - Get a single category by ID
router.get('/:id', protect, categoryController.getCategoryById);

// PUT /api/categories/:id - Update a category
router.put('/:id', protect, categoryController.updateCategory);

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', protect, categoryController.deleteCategory);

module.exports = router;
