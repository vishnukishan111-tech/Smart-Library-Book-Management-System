const db = require('../db');

/**
 * Log an audit trail entry for compliance and security
 */
async function logAudit({
  userId = null,
  userEmail = null,
  action,
  entityType = null,
  entityId = null,
  details = null,
  req = null
}) {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'Unknown';

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      userAgent = req.headers['user-agent'] || 'Unknown';
      if (!userId && req.user) {
        userId = req.user.id;
        userEmail = req.user.email;
      }
    }

    const detailString = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    await db.query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userEmail, action, entityType, String(entityId || ''), detailString, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}

/**
 * Log login attempts for activity monitoring and brute-force tracking
 */
async function logLoginAttempt({
  email,
  status,
  failureReason = null,
  req = null
}) {
  try {
    let ipAddress = '127.0.0.1';
    let userAgent = 'Unknown';

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      userAgent = req.headers['user-agent'] || 'Unknown';
    }

    await db.query(
      `INSERT INTO login_attempts (email, ip_address, user_agent, status, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, ipAddress, userAgent, status, failureReason]
    );
  } catch (err) {
    console.error('[LOGIN ATTEMPT LOG ERROR]', err.message);
  }
}

module.exports = {
  logAudit,
  logLoginAttempt
};
