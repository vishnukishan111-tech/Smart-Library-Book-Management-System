const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// Super Admin exclusive routes
router.use(authenticateToken, requireRoles('super_admin'));

router.get('/users', adminController.getUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.post('/users/:userId/unlock', adminController.unlockUserAccount);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/system-status', adminController.getSystemStatus);

module.exports = router;
