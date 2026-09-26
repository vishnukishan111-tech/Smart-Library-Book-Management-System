const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { logAudit } = require('./audit');

/**
 * Verify JWT Access Token
 */
async function authenticateToken(req, res, next) {
  let token = null;

  // Extract from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessTokenSecret);
    
    // Check if user still exists and not locked out
    const userRes = await db.query(
      `SELECT u.id, u.student_id, u.name, u.email, u.role_id, r.name as role, u.lockout_until
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userRes.rows[0];

    // Check if account is locked
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      return res.status(423).json({
        success: false,
        error: `Account is temporarily locked until ${new Date(user.lockout_until).toLocaleTimeString()}.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    req.user = {
      id: user.id,
      studentId: user.student_id,
      name: user.name,
      email: user.email,
      roleId: user.role_id,
      role: user.role
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid or forged authentication token.',
      code: 'TOKEN_INVALID'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Supported roles: 'student', 'admin', 'super_admin'
 */
function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized attempt to audit log for security inspection
      await logAudit({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'ACCESS_DENIED_UNAUTHORIZED_ROLE',
        entityType: 'route',
        entityId: req.originalUrl,
        details: {
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          method: req.method
        },
        req
      });

      return res.status(403).json({
        success: false,
        error: `Access Denied: Role '${req.user.role}' lacks permission for this resource. Required: [${allowedRoles.join(', ')}]`,
        code: 'FORBIDDEN_ROLE'
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles
};
