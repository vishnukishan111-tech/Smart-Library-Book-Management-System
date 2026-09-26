-- ============================================================
-- SMART LIBRARY SYSTEM - SEED DATA (PostgreSQL / Supabase)
-- Password for all default accounts: Password123!
-- ============================================================

-- Insert Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'student', 'Enrolled student with privileges to browse catalog, borrow books, view history and track due dates')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) VALUES
(2, 'admin', 'Library Administrator / Librarian with authority to manage inventory, catalog, and borrow records')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) VALUES
(3, 'super_admin', 'Chief System Administrator with privileges across user roles, security audits, and system configuration')
ON CONFLICT (name) DO NOTHING;

-- Insert Users (Password: Password123!)
INSERT INTO users (id, student_id, name, email, password_hash, role_id, two_factor_enabled) VALUES
(1, 'SA-0001', 'Marcus Vance (Super Admin)', 'superadmin@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 3, false),
(2, 'LIB-1001', 'Sarah Connor (Head Librarian)', 'librarian@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 2, false),
(3, 'STU-2024', 'Alex Chen (Student)', 'student@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, false),
(4, 'STU-2025', 'Maria Garcia (Student)', 'maria@library.edu', '$2b$10$HA3j8fY5JiTR1f9BvKpw6.F8PyKvvdoAWNnhEf5/HNZAvGgllezK.', 1, false)
ON CONFLICT (email) DO NOTHING;

-- Reset sequence for users
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

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

-- Reset sequence for books
SELECT setval('books_id_seq', (SELECT MAX(id) FROM books));

-- Insert Sample Borrow Records
INSERT INTO borrow_records (id, user_id, book_id, borrow_date, due_date, return_date, status, fine_amount, notes) VALUES
(1, 3, 1, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '9 days', NULL, 'borrowed', 0.00, 'Student research project'),
(2, 3, 3, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '6 days', NULL, 'overdue', 3.00, 'Reminder email dispatched'),
(3, 4, 2, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '2 days', 'returned', 0.00, 'Returned on time in pristine condition')
ON CONFLICT (id) DO NOTHING;

SELECT setval('borrow_records_id_seq', (SELECT MAX(id) FROM borrow_records));

-- Insert Initial Audit Logs
INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, user_agent) VALUES
(1, 'superadmin@library.edu', 'SYSTEM_INITIALIZED', 'system', 'sys-0', 'Library management system schema bootstrapped with security controls', '127.0.0.1', 'System/Bootstrapper'),
(2, 'librarian@library.edu', 'BOOK_CREATED', 'book', '8', 'Added "Web Application Hacker''s Handbook" to catalog inventory', '192.168.1.10', 'Mozilla/5.0 Admin Client'),
(3, 'student@library.edu', 'BOOK_BORROWED', 'borrow_record', '1', 'Borrowed "The C Programming Language"', '192.168.1.45', 'Mozilla/5.0 Student Portal');
