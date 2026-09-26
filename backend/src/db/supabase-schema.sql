-- ==============================================================================
-- SMART LIBRARY BOOK MANAGEMENT SYSTEM - COMPLETE SUPABASE SQL SCHEMA & RLS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DROP EXISTING OBJECTS (FOR CLEAN RE-RUNS IF NEEDED)
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
DROP POLICY IF EXISTS "Super Admins manage roles" ON roles;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Super Admins manage all users" ON users;
DROP POLICY IF EXISTS "Public and students can view catalog books" ON books;
DROP POLICY IF EXISTS "Admins and Super Admins can insert books" ON books;
DROP POLICY IF EXISTS "Admins and Super Admins can update books" ON books;
DROP POLICY IF EXISTS "Admins and Super Admins can delete books" ON books;
DROP POLICY IF EXISTS "Students view only their own borrow records" ON borrow_records;
DROP POLICY IF EXISTS "Students can create borrow record for themselves" ON borrow_records;
DROP POLICY IF EXISTS "Admins and Super Admins manage borrow records" ON borrow_records;
DROP POLICY IF EXISTS "Super Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users view own login attempts" ON login_attempts;
DROP POLICY IF EXISTS "System insert login attempts" ON login_attempts;

-- 3. TABLES DEFINITION

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100) DEFAULT NULL,
    failed_login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- BOOKS TABLE
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    cover_image TEXT,
    total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0 AND available_copies <= total_copies),
    shelf_location VARCHAR(50) DEFAULT 'A-101',
    published_year INT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- BORROW RECORDS TABLE
CREATE TABLE IF NOT EXISTS borrow_records (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    borrow_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrow_user ON borrow_records(user_id);
CREATE INDEX IF NOT EXISTS idx_borrow_book ON borrow_records(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_status ON borrow_records(status);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- LOGIN ATTEMPTS TABLE (Security Activity Monitoring)
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'LOCKED', '2FA_CHALLENGE')),
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_created ON login_attempts(created_at DESC);

-- ==============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

-- Function to lookup the authenticated user's assigned role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
    SELECT r.name 
    FROM users u 
    JOIN roles r ON u.role_id = r.id 
    WHERE u.email = auth.jwt() ->> 'email'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to lookup the authenticated user's ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INT AS $$
    SELECT u.id 
    FROM users u 
    WHERE u.email = auth.jwt() ->> 'email'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 5. ENABLE ROW-LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY POLICIES
-- ==============================================================================

-- --- ROLES POLICIES ---
-- Any authenticated or anonymous user can read available roles
CREATE POLICY "Anyone can view roles"
ON roles FOR SELECT
USING (true);

-- Only Super Admins can alter roles
CREATE POLICY "Super Admins manage roles"
ON roles FOR ALL
USING (get_current_user_role() = 'super_admin');

-- --- USERS POLICIES ---
-- Users can view their own profile, Admins and Super Admins can view all
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (
    id = get_current_user_id() 
    OR get_current_user_role() IN ('admin', 'super_admin')
);

-- Super Admins have full access to manage users and roles
CREATE POLICY "Super Admins manage all users"
ON users FOR ALL
USING (get_current_user_role() = 'super_admin');

-- --- BOOKS POLICIES ---
-- Anyone (Students, Faculty, Public) can search and view book inventory
CREATE POLICY "Public and students can view catalog books"
ON books FOR SELECT
USING (true);

-- Admins and Super Admins can add new books
CREATE POLICY "Admins and Super Admins can insert books"
ON books FOR INSERT
WITH CHECK (get_current_user_role() IN ('admin', 'super_admin'));

-- Admins and Super Admins can update book details and stock
CREATE POLICY "Admins and Super Admins can update books"
ON books FOR UPDATE
USING (get_current_user_role() IN ('admin', 'super_admin'));

-- Admins and Super Admins can delete books
CREATE POLICY "Admins and Super Admins can delete books"
ON books FOR DELETE
USING (get_current_user_role() IN ('admin', 'super_admin'));

-- --- BORROW RECORDS POLICIES ---
-- Requirement: Students can only view their own borrow history; Admins view all
CREATE POLICY "Students view only their own borrow records"
ON borrow_records FOR SELECT
USING (
    user_id = get_current_user_id() 
    OR get_current_user_role() IN ('admin', 'super_admin')
);

-- Students can record a borrow for themselves
CREATE POLICY "Students can create borrow record for themselves"
ON borrow_records FOR INSERT
WITH CHECK (
    user_id = get_current_user_id() 
    OR get_current_user_role() IN ('admin', 'super_admin')
);

-- Admins and Super Admins can manage, check in, and update borrow records
CREATE POLICY "Admins and Super Admins manage borrow records"
ON borrow_records FOR ALL
USING (get_current_user_role() IN ('admin', 'super_admin'));

-- --- AUDIT LOGS POLICIES ---
-- Requirement: Super Admin can manage and view system logs
CREATE POLICY "Super Admins can view audit logs"
ON audit_logs FOR SELECT
USING (get_current_user_role() = 'super_admin');

-- Allow backend services and system triggers to insert audit records
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- --- LOGIN ATTEMPTS POLICIES ---
-- Users can view their own recent login attempts for activity monitoring
CREATE POLICY "Users view own login attempts"
ON login_attempts FOR SELECT
USING (
    email = auth.jwt() ->> 'email'
    OR get_current_user_role() = 'super_admin'
);

-- Allow server auth flow to log login attempts
CREATE POLICY "System insert login attempts"
ON login_attempts FOR INSERT
WITH CHECK (true);

-- ==============================================================================
-- 7. SEED DATA FOR TESTING (Passwords: Password123!)
-- ==============================================================================

-- Insert Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'student', 'Enrolled student with privileges to browse catalog and borrow books'),
(2, 'admin', 'Library Administrator / Librarian managing inventory and records'),
(3, 'super_admin', 'Chief System Administrator with privileges across user roles and audit logs')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert Users (Password for all: Password123!)
INSERT INTO users (id, student_id, name, email, password_hash, role_id, two_factor_enabled) VALUES
(1, 'SA-0001', 'Marcus Vance (Super Admin)', 'superadmin@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 3, false),
(2, 'LIB-1001', 'Sarah Connor (Head Librarian)', 'librarian@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 2, false),
(3, 'STU-2024', 'Alex Chen (Student)', 'student@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, false),
(4, 'STU-2025', 'Maria Garcia (Student)', 'maria@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, false)
ON CONFLICT (email) DO NOTHING;

SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

-- Insert Books Catalog
INSERT INTO books (id, isbn, title, author, category, cover_image, total_copies, available_copies, shelf_location, published_year, description) VALUES
(1, '978-0131103627', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Computer Science', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', 5, 4, 'CS-Sec-A1', 1988, 'The definitive reference guide and manual for C programming by its creators.'),
(2, '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson', 'Algorithms', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=600&auto=format&fit=crop&q=80', 8, 7, 'ALG-Sec-B2', 2009, 'Comprehensive textbook on algorithms, data structures, and computational complexity.'),
(3, '978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Software Engineering', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80', 6, 5, 'SE-Sec-C1', 2008, 'Best practices, principles, and architectural guidelines for writing readable code.'),
(4, '978-0596007126', 'Head First Design Patterns', 'Eric Freeman, Elisabeth Robson', 'Software Engineering', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80', 4, 3, 'SE-Sec-C2', 2004, 'A brain-friendly guide to object-oriented software design patterns and real-world architecture.'),
(5, '978-0262035613', 'Deep Learning', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 'Artificial Intelligence', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', 5, 5, 'AI-Sec-D1', 2016, 'Foundational textbook covering mathematical concepts and modern neural networks.'),
(6, '978-1449355739', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Distributed Systems', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', 7, 6, 'DS-Sec-E3', 2017, 'The big ideas behind reliable, scalable, and maintainable large-scale systems.'),
(7, '978-0321751041', 'The Art of Computer Programming, Vol 1', 'Donald E. Knuth', 'Computer Science', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80', 3, 2, 'CS-Sec-A3', 1997, 'The monumental treatise on fundamental algorithms and information structures.'),
(8, '978-1118991626', 'Web Application Hacker''s Handbook', 'Dafydd Stuttard, Marcus Pinto', 'Cybersecurity', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80', 4, 3, 'SEC-Sec-F1', 2011, 'Essential guide to discovering and defending security flaws in modern web apps.')
ON CONFLICT (isbn) DO NOTHING;

SELECT setval('books_id_seq', (SELECT COALESCE(MAX(id), 1) FROM books));

-- Insert Sample Borrow Records
INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, return_date, status, fine_amount, notes) VALUES
(1, 3, 1, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '9 days', NULL, 'borrowed', 0.00, 'Student research project'),
(2, 3, 3, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '6 days', NULL, 'overdue', 3.00, 'Reminder email dispatched'),
(3, 4, 2, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '2 days', 'returned', 0.00, 'Returned on time in pristine condition')
ON CONFLICT (id) DO NOTHING;

SELECT setval('borrow_records_id_seq', (SELECT COALESCE(MAX(id), 1) FROM borrow_records));

-- Insert Sample Audit Trail
INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, user_agent) VALUES
(1, 'superadmin@library.edu', 'SYSTEM_INITIALIZED', 'system', 'sys-0', 'Library management system bootstrapped with Row-Level Security policies', '127.0.0.1', 'System/Bootstrapper'),
(2, 'librarian@library.edu', 'BOOK_CREATED', 'book', '8', 'Added "Web Application Hacker''s Handbook" to catalog inventory', '192.168.1.10', 'Mozilla/5.0 Admin Client'),
(3, 'student@library.edu', 'BOOK_BORROWED', 'borrow_record', '1', 'Borrowed "The C Programming Language"', '192.168.1.45', 'Mozilla/5.0 Student Portal')
ON CONFLICT DO NOTHING;
