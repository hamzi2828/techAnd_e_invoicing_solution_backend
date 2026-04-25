const express = require('express');
const blogAuthorController = require('../controllers/blogAuthorController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Blog Author Routes

// GET /api/blog-authors/stats - Get author statistics (protected)
router.get('/stats', protect, blogAuthorController.getAuthorStats);

// GET /api/blog-authors/active - Get active authors for blog creation (protected)
router.get('/active', protect, blogAuthorController.getActiveAuthors);

// POST /api/blog-authors/update-stats - Update all author stats (protected)
router.post('/update-stats', protect, blogAuthorController.updateAuthorStats);

// GET /api/blog-authors - Get all authors with pagination and filters
router.get('/', blogAuthorController.getAuthors);

// POST /api/blog-authors - Create a new author (protected)
router.post('/', protect, blogAuthorController.createAuthor);

// GET /api/blog-authors/:id - Get a single author by ID
router.get('/:id', blogAuthorController.getAuthorById);

// PUT /api/blog-authors/:id - Update an author (protected)
router.put('/:id', protect, blogAuthorController.updateAuthor);

// PATCH /api/blog-authors/:id/status - Update author status (protected)
router.patch('/:id/status', protect, blogAuthorController.updateAuthorStatus);

// DELETE /api/blog-authors/:id - Delete an author (protected)
router.delete('/:id', protect, blogAuthorController.deleteAuthor);

module.exports = router;
