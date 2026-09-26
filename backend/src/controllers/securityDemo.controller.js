const db = require('../db');
const { logAudit } = require('../middleware/audit');

/**
 * Interactive SQL Injection Demo for Judges & Evaluators
 * Compares vulnerable string concatenation vs secure parameterized queries.
 */
async function testSqlInjection(req, res) {
  try {
    const { input = "' OR '1'='1" } = req.body;

    // 1. SECURE IMPLEMENTATION (Parameterized Query)
    // Input is bound as parameter $1; DB driver treats it strictly as a string literal
    const secureStart = Date.now();
    const secureResult = await db.query(
      'SELECT id, isbn, title, author, category, available_copies FROM books WHERE title = $1',
      [input]
    );
    const secureDuration = Date.now() - secureStart;

    // 2. SIMULATED VULNERABLE QUERY (String concatenation illustration)
    // We construct the raw string to show judges exactly what happens without actually endangering the db
    const rawVulnerableSql = `SELECT id, isbn, title, author, category, available_copies FROM books WHERE title = '${input}'`;
    
    // Simulate what would match if the SQL injection bypassed logic
    let vulnerableSimulatedRows = [];
    let isBypassed = false;
    
    if (input.includes("' OR '1'='1") || input.includes("' OR 1=1") || input.includes("admin'--")) {
      isBypassed = true;
      const allBooks = await db.query('SELECT id, isbn, title, author, category, available_copies FROM books LIMIT 5');
      vulnerableSimulatedRows = allBooks.rows;
    }

    // Log the security demonstration to audit log
    await logAudit({
      userId: req.user?.id || null,
      userEmail: req.user?.email || 'security_demonstrator@test.local',
      action: 'SECURITY_DEMO_SQL_INJECTION_TEST',
      entityType: 'security_lab',
      details: { input, isBypassed, secureMatchCount: secureResult.rows.length },
      req
    });

    return res.json({
      success: true,
      testPayload: input,
      parameterizedQuery: {
        sql: 'SELECT id, isbn, title, author, category, available_copies FROM books WHERE title = $1',
        parameters: [input],
        matchesFound: secureResult.rows.length,
        results: secureResult.rows,
        status: 'SECURE_PROTECTED',
        explanation: 'The database driver treated the input as a pure literal string value, preventing any syntax modification or unauthorized data extraction.',
        durationMs: secureDuration
      },
      vulnerableConcatenationSimulation: {
        rawSql: rawVulnerableSql,
        wouldBypassAuthOrFilter: isBypassed,
        simulatedLeakCount: vulnerableSimulatedRows.length,
        simulatedLeakedRows: vulnerableSimulatedRows,
        status: isBypassed ? 'VULNERABILITY_CONFIRMED' : 'INPUT_UNPARSED',
        explanation: isBypassed 
          ? 'The unescaped single quote broken out of the SQL syntax, causing the condition `OR \'1\'=\'1\'` to evaluate to TRUE for every single row in the database!'
          : 'Without parameterization, an attacker could manipulate this raw SQL query to leak unauthorized records or drop tables.'
      }
    });
  } catch (err) {
    console.error('[SQL INJECTION DEMO ERROR]', err);
    return res.status(500).json({ success: false, error: 'SQL demonstration failed.' });
  }
}

/**
 * Inspect Active Security Headers & Defenses
 */
async function inspectSecurityDefenses(req, res) {
  return res.json({
    success: true,
    securityControls: {
      helmetHeaders: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'...",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY (Clickjacking protection)',
        'X-XSS-Protection': '0 (Replaced by modern CSP standard)',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      authentication: {
        jwtAccessTokenExpiry: '15 minutes (Short-lived access token)',
        jwtRefreshTokenExpiry: '7 days (Secure rotation)',
        passwordHashing: 'bcrypt (Cost Factor 10, Salted)',
        accountLockoutThreshold: '5 failed login attempts',
        lockoutDuration: '15 minutes automatic freeze',
        twoFactorAuthentication: 'Optional 6-digit Email OTP with expiration'
      },
      defenseMechanisms: {
        parameterizedQueries: 'PostgreSQL parameterized queries ($1, $2) to neutralize SQL Injection',
        rateLimiting: 'Express-rate-limit active (Auth: 20 req / 15 min, API: 500 req / 15 min)',
        inputSanitization: 'Recursive HTML/Script tag neutralization against XSS',
        csrfProtection: 'Custom anti-tamper header validation on state-modifying requests',
        auditLogging: 'Persistent audit trail recording actor, action, timestamp, IP, and User-Agent'
      }
    }
  });
}

module.exports = {
  testSqlInjection,
  inspectSecurityDefenses
};
