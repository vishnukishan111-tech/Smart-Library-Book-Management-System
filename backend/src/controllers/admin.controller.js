const db = require('../db');
const { logAudit } = require('../middleware/audit');

/**
 * Super Admin: Get all users with roles
 */
async function getUsers(req, res) {
  try {
    const result = await db.query(
      `SELECT u.id, u.student_id, u.name, u.email, u.role_id, r.name as role,
              u.two_factor_enabled, u.failed_login_attempts, u.lockout_until,
              u.created_at,
              (SELECT COUNT(*) FROM borrow_records br WHERE br.user_id = u.id AND br.status IN ('borrowed', 'overdue')) as active_loans
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );

    const rolesRes = await db.query('SELECT * FROM roles ORDER BY id ASC');

    return res.json({
      success: true,
      users: result.rows,
      roles: rolesRes.rows
    });
  } catch (err) {
    console.error('[GET USERS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
  }
}

/**
 * Super Admin: Update user role
 */
async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, error: 'Role ID is required.' });
    }

    // Prevent modifying own super_admin role to prevent accidental lockout
    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot alter your own super-admin role directly.'
      });
    }

    // Check user exists
    const userCheck = await db.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Check role exists
    const roleCheck = await db.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Role does not exist.' });
    }

    const newRoleName = roleCheck.rows[0].name;

    await db.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleId, userId]);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'USER_ROLE_CHANGED',
      entityType: 'user',
      entityId: userId,
      details: { targetUserName: userCheck.rows[0].name, newRoleId: roleId, newRoleName },
      req
    });

    return res.json({
      success: true,
      message: `User role for "${userCheck.rows[0].name}" successfully updated to "${newRoleName}".`
    });
  } catch (err) {
    console.error('[UPDATE ROLE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update user role.' });
  }
}

/**
 * Super Admin: Unlock a locked account manually
 */
async function unlockUserAccount(req, res) {
  try {
    const { userId } = req.params;

    const userCheck = await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    await db.query(
      'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1',
      [userId]
    );

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ADMIN_UNLOCKED_USER',
      entityType: 'user',
      entityId: userId,
      details: { unlockedUserEmail: userCheck.rows[0].email },
      req
    });

    return res.json({
      success: true,
      message: `User account for "${userCheck.rows[0].name}" has been unlocked and failed login counter reset.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to unlock user.' });
  }
}

/**
 * Super Admin: Get Audit Logs with search & filter
 */
async function getAuditLogs(req, res) {
  try {
    const { action = '', email = '', limit = 100 } = req.query;

    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let pIdx = 1;

    if (action && action.trim() !== '') {
      sql += ` AND action = $${pIdx}`;
      params.push(action.trim());
      pIdx++;
    }

    if (email && email.trim() !== '') {
      sql += ` AND LOWER(user_email) LIKE $${pIdx}`;
      params.push(`%${email.trim().toLowerCase()}%`);
      pIdx++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${pIdx}`;
    params.push(parseInt(limit, 10) || 100);

    const result = await db.query(sql, params);

    return res.json({
      success: true,
      logs: result.rows
    });
  } catch (err) {
    console.error('[GET AUDIT LOGS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
}

/**
 * Super Admin: System Health, Metrics & Database Engine Status
 */
async function getSystemStatus(req, res) {
  try {
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    const booksCount = await db.query('SELECT COUNT(*) as count FROM books');
    const activeBorrows = await db.query("SELECT COUNT(*) as count FROM borrow_records WHERE status IN ('borrowed', 'overdue')");
    const totalBorrows = await db.query('SELECT COUNT(*) as count FROM borrow_records');
    const auditCount = await db.query('SELECT COUNT(*) as count FROM audit_logs');
    const lockouts = await db.query("SELECT COUNT(*) as count FROM users WHERE lockout_until IS NOT NULL AND lockout_until > CURRENT_TIMESTAMP");

    return res.json({
      success: true,
      system: {
        databaseEngine: db.getDbType() === 'postgres' ? 'PostgreSQL / Supabase (Cloud)' : 'Embedded SQLite Engine (Turnkey Ready)',
        serverUptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        securityHeadersActive: true,
        jwtSecurityEnabled: true,
        rateLimitingActive: true,
        csrfProtectionActive: true
      },
      metrics: {
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalBooks: parseInt(booksCount.rows[0].count, 10),
        activeBorrows: parseInt(activeBorrows.rows[0].count, 10),
        totalBorrowTransactions: parseInt(totalBorrows.rows[0].count, 10),
        totalAuditLogs: parseInt(auditCount.rows[0].count, 10),
        currentlyLockedUsers: parseInt(lockouts.rows[0].count, 10)
      }
    });
  } catch (err) {
    console.error('[SYSTEM STATUS ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve system status.' });
  }
}

module.exports = {
  getUsers,
  updateUserRole,
  unlockUserAccount,
  getAuditLogs,
  getSystemStatus
};
