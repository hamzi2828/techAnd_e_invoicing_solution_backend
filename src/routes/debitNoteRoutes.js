const express = require('express');
const debitNoteController = require('../controllers/debitNoteController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Debit Note Routes

// GET /api/debit-notes - Get all debit notes with pagination and filters
router.get('/', protect, debitNoteController.getDebitNotes);

// GET /api/debit-notes/stats - Get debit note statistics
router.get('/stats', protect, debitNoteController.getDebitNoteStats);

// GET /api/debit-notes/next-number/:companyId - Get next debit note number
router.get('/next-number/:companyId', protect, debitNoteController.getNextDebitNoteNumber);

// POST /api/debit-notes - Create a new debit note
router.post('/', protect, debitNoteController.createDebitNote);

// GET /api/debit-notes/:id - Get a single debit note by ID
router.get('/:id', protect, debitNoteController.getDebitNoteById);

// PUT /api/debit-notes/:id - Update a debit note (draft only)
router.put('/:id', protect, debitNoteController.updateDebitNote);

// DELETE /api/debit-notes/:id - Delete a debit note
router.delete('/:id', protect, debitNoteController.deleteDebitNote);

// PATCH /api/debit-notes/:id/status - Update debit note status
router.patch('/:id/status', protect, debitNoteController.updateDebitNoteStatus);

// POST /api/debit-notes/:id/send - Send debit note (mark as sent)
router.post('/:id/send', protect, debitNoteController.sendDebitNote);

// POST /api/debit-notes/:id/payments - Add payment to debit note
router.post('/:id/payments', protect, debitNoteController.addPayment);

// POST /api/debit-notes/:id/zatca/validate - Validate debit note against ZATCA rules
router.post('/:id/zatca/validate', protect, debitNoteController.validateDebitNote);

module.exports = router;
