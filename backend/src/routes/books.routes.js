const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books.controller');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/security');

// Public catalog search with rate limiter
router.get('/', searchLimiter, booksController.getBooks);

// Get book by id (optional auth to reveal borrower info to admins)
router.get('/:id', (req, res, next) => {
  // If authorization header is present, authenticate to supply req.user
  if (req.headers.authorization) {
    return authenticateToken(req, res, next);
  }
  next();
}, booksController.getBookById);

// Admin & Super Admin CRUD operations
router.post('/', authenticateToken, requireRoles('admin', 'super_admin'), booksController.createBook);
router.put('/:id', authenticateToken, requireRoles('admin', 'super_admin'), booksController.updateBook);
router.delete('/:id', authenticateToken, requireRoles('admin', 'super_admin'), booksController.deleteBook);

module.exports = router;
