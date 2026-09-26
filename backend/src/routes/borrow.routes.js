const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrow.controller');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// All borrow actions require authentication
router.use(authenticateToken);

// Students can borrow books
router.post('/borrow', borrowController.borrowBook);

// Students or Admins can return books
router.post('/return', borrowController.returnBook);

// Student view their own borrow history
router.get('/my-history', borrowController.getStudentBorrowHistory);

// Admin view all borrow records
router.get('/all-records', requireRoles('admin', 'super_admin'), borrowController.getAllBorrowRecords);

module.exports = router;
