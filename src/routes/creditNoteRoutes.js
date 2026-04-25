const express = require('express');
const creditNoteController = require('../controllers/creditNoteController');
const { protect } = require('../../middleware/auth');

const router = express.Router();

// Credit Note Routes

// GET /api/credit-notes - Get all credit notes with pagination and filters
router.get('/', protect, creditNoteController.getCreditNotes);

// GET /api/credit-notes/stats - Get credit note statistics
router.get('/stats', protect, creditNoteController.getCreditNoteStats);

// GET /api/credit-notes/next-number/:companyId - Get next credit note number
router.get('/next-number/:companyId', protect, creditNoteController.getNextCreditNoteNumber);

// POST /api/credit-notes - Create a new credit note
router.post('/', protect, creditNoteController.createCreditNote);

// GET /api/credit-notes/:id - Get a single credit note by ID
router.get('/:id', protect, creditNoteController.getCreditNoteById);

// PUT /api/credit-notes/:id - Update a credit note (draft only)
router.put('/:id', protect, creditNoteController.updateCreditNote);

// DELETE /api/credit-notes/:id - Delete a credit note
router.delete('/:id', protect, creditNoteController.deleteCreditNote);

// POST /api/credit-notes/:id/send - Send credit note (mark as sent)
router.post('/:id/send', protect, creditNoteController.sendCreditNote);

// POST /api/credit-notes/:id/apply - Apply credit note to an invoice
router.post('/:id/apply', protect, creditNoteController.applyCreditNote);

// POST /api/credit-notes/:id/zatca/validate - Validate credit note against ZATCA rules
router.post('/:id/zatca/validate', protect, creditNoteController.validateCreditNote);

module.exports = router;
