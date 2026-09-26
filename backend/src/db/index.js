require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let pgPool = null;
let sqliteDb = null;
let activeEngine = 'none';

function getDatabaseUrl() {
  return process.env.DATABASE_URL;
}

async function initPostgres() {
  try {
    const pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
    // Test query
    const res = await pool.query('SELECT NOW()');
    console.log('[DB] Connected to PostgreSQL / Supabase successfully at:', res.rows[0].now);
    pgPool = pool;
    activeEngine = 'postgres';
    return true;
  } catch (err) {
    console.warn('[DB] PostgreSQL / Supabase connection failed or not reachable:', err.message);
    return false;
  }
}

function initSqlite() {
  return new Promise((resolve, reject) => {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'library.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DB] SQLite connection failed:', err);
        return reject(err);
      }
      console.log('[DB] Connected to embedded SQLite database at:', dbPath);
      sqliteDb = db;
      activeEngine = 'sqlite';
      resolve(true);
    });
  });
}

// Convert PostgreSQL parameterized query syntax ($1, $2, ...) to SQLite syntax (?) if on SQLite
function normalizeQuery(sql) {
  if (activeEngine === 'sqlite') {
    // Replace $1, $2, ... with ?
    return sql.replace(/\$\d+/g, '?');
  }
  return sql;
}

// Unified parameterized query interface
async function query(sql, params = []) {
  if (activeEngine === 'postgres' && pgPool) {
    const start = Date.now();
    const res = await pgPool.query(sql, params);
    const duration = Date.now() - start;
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      duration
    };
  }

  if (activeEngine === 'sqlite' && sqliteDb) {
    const start = Date.now();
    const normalizedSql = normalizeQuery(sql);
    
    return new Promise((resolve, reject) => {
      // Determine if query is SELECT or modifying (INSERT, UPDATE, DELETE)
      const trimmed = normalizedSql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING')) {
        sqliteDb.all(normalizedSql, params, function(err, rows) {
          if (err) return reject(err);
          resolve({
            rows: rows || [],
            rowCount: rows ? rows.length : 0,
            duration: Date.now() - start
          });
        });
      } else {
        sqliteDb.run(normalizedSql, params, function(err) {
          if (err) return reject(err);
          resolve({
            rows: [{ id: this.lastID }],
            rowCount: this.changes,
            lastID: this.lastID,
            duration: Date.now() - start
          });
        });
      }
    });
  }

  throw new Error('[DB] Database is not initialized');
}

// Auto seed SQLite if using SQLite
async function bootstrapSqlite() {
  const runSql = (sql) => new Promise((resolve, reject) => {
    sqliteDb.exec(sql, (err) => (err ? reject(err) : resolve()));
  });

  // Create tables in SQLite
  await runSql(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      two_factor_enabled BOOLEAN DEFAULT 0,
      two_factor_secret TEXT DEFAULT NULL,
      failed_login_attempts INTEGER DEFAULT 0,
      lockout_until DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      cover_image TEXT,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      shelf_location TEXT DEFAULT 'A-101',
      published_year INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      book_id INTEGER NOT NULL REFERENCES books(id),
      borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      return_date DATETIME DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'borrowed',
      fine_amount REAL DEFAULT 0.00,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL,
      failure_reason TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if roles exist
  const roleCheck = await query('SELECT count(*) as count FROM roles');
  if (roleCheck.rows[0].count == 0) {
    console.log('[DB] Seeding initial database data...');
    // Seed roles
    await runSql(`
      INSERT OR IGNORE INTO roles (id, name, description) VALUES
      (1, 'student', 'Enrolled student with privileges to browse catalog and borrow books'),
      (2, 'admin', 'Library Administrator / Librarian managing inventory and records'),
      (3, 'super_admin', 'Chief System Administrator with privileges across user roles and audit logs');

      INSERT OR IGNORE INTO users (id, student_id, name, email, password_hash, role_id, two_factor_enabled) VALUES
      (1, 'SA-0001', 'Marcus Vance (Super Admin)', 'superadmin@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 3, 0),
      (2, 'LIB-1001', 'Sarah Connor (Head Librarian)', 'librarian@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 2, 0),
      (3, 'STU-2024', 'Alex Chen (Student)', 'student@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, 0),
      (4, 'STU-2025', 'Maria Garcia (Student)', 'maria@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, 0);

      INSERT OR IGNORE INTO books (id, isbn, title, author, category, cover_image, total_copies, available_copies, shelf_location, published_year, description) VALUES
      (1, '978-0131103627', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Computer Science', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', 5, 4, 'CS-Sec-A1', 1988, 'The definitive reference guide and manual for C programming by its creators.'),
      (2, '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson', 'Algorithms', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&auto=format&fit=crop&q=80', 8, 7, 'ALG-Sec-B2', 2009, 'Comprehensive textbook on algorithms, data structures, and computational complexity.'),
      (3, '978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Software Engineering', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80', 6, 5, 'SE-Sec-C1', 2008, 'Best practices, principles, and architectural guidelines for writing readable code.'),
      (4, '978-0596007126', 'Head First Design Patterns', 'Eric Freeman, Elisabeth Robson', 'Software Engineering', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80', 4, 3, 'SE-Sec-C2', 2004, 'A brain-friendly guide to object-oriented software design patterns and real-world architecture.'),
      (5, '978-0262035613', 'Deep Learning', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 'Artificial Intelligence', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', 5, 5, 'AI-Sec-D1', 2016, 'Foundational textbook covering mathematical concepts and modern neural networks.'),
      (6, '978-1449355739', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Distributed Systems', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', 7, 6, 'DS-Sec-E3', 2017, 'The big ideas behind reliable, scalable, and maintainable large-scale systems.'),
      (7, '978-0321751041', 'The Art of Computer Programming', 'Donald E. Knuth', 'Computer Science', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80', 3, 2, 'CS-Sec-A3', 1997, 'The monumental treatise on fundamental algorithms and information structures.'),
      (8, '978-1118991626', 'Web Application Hacker''s Handbook', 'Dafydd Stuttard, Marcus Pinto', 'Cybersecurity', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80', 4, 3, 'SEC-Sec-F1', 2011, 'Essential guide to discovering and defending security flaws in modern web apps.');

      INSERT OR IGNORE INTO borrow_records (id, user_id, book_id, borrow_date, due_date, return_date, status, fine_amount, notes) VALUES
      (1, 3, 1, datetime('now', '-5 days'), datetime('now', '+9 days'), NULL, 'borrowed', 0.00, 'Student research project'),
      (2, 3, 3, datetime('now', '-20 days'), datetime('now', '-6 days'), NULL, 'overdue', 3.00, 'Overdue return notice sent'),
      (3, 4, 2, datetime('now', '-15 days'), datetime('now', '-1 day'), datetime('now', '-2 days'), 'returned', 0.00, 'Returned on time in pristine condition');

      INSERT OR IGNORE INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, user_agent) VALUES
      (1, 'superadmin@library.edu', 'SYSTEM_INITIALIZED', 'system', 'sys-0', 'Library management system initialized with security policy enforcement', '127.0.0.1', 'System/Bootstrapper'),
      (2, 'librarian@library.edu', 'BOOK_CREATED', 'book', '8', 'Cataloged "Web Application Hacker''s Handbook" with ISBN 978-1118991626', '192.168.1.10', 'Mozilla/5.0 Admin Client'),
      (3, 'student@library.edu', 'BOOK_BORROWED', 'borrow_record', '1', 'Borrowed "The C Programming Language"', '192.168.1.45', 'Mozilla/5.0 Student Portal');
    `);
    console.log('[DB] Seeding completed successfully.');
  }
}

async function initializeDatabase() {
  const dbUrl = getDatabaseUrl();
  if (dbUrl) {
    const pgSuccess = await initPostgres();
    if (pgSuccess) return activeEngine;
  }
  await initSqlite();
  await bootstrapSqlite();
  return activeEngine;
}

module.exports = {
  initializeDatabase,
  query,
  getDbType: () => activeEngine,
  getPgPool: () => pgPool,
  getSqliteDb: () => sqliteDb
};
