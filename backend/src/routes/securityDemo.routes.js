const express = require('express');
const router = express.Router();
const securityDemoController = require('../controllers/securityDemo.controller');

// Public demo endpoints for presentation / judges
router.post('/test-sql-injection', securityDemoController.testSqlInjection);
router.get('/inspect-defenses', securityDemoController.inspectSecurityDefenses);

module.exports = router;
