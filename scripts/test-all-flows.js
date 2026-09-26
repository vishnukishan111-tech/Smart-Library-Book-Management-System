const API_BASE = 'http://localhost:5000/api';

async function testAll() {
  console.log('--- STARTING COMPREHENSIVE ENDPOINT AUDIT ---');

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`).then(r => r.json());
  console.log('1. Health check:', healthRes.status, 'DB:', healthRes.databaseEngine);

  // 2. Books Catalog
  const booksRes = await fetch(`${API_BASE}/books`).then(r => r.json());
  console.log('2. Books count:', booksRes.count);

  // 3. Login Student
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'student@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  console.log('3. Student Login:', loginRes.success, 'Token received:', !!loginRes.tokens?.accessToken);
  const studentToken = loginRes.tokens?.accessToken;

  // 4. Student profile & activity
  const profileRes = await fetch(`${API_BASE}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  console.log('4. Profile:', profileRes.user?.name, 'Recent attempts count:', profileRes.recentLoginAttempts?.length);

  // 5. Borrow Book
  const borrowRes = await fetch(`${API_BASE}/borrow/borrow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`,
      'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
    },
    body: JSON.stringify({ bookId: 2 }) // CLRS
  }).then(r => r.json());
  console.log('5. Borrow Book (CLRS):', borrowRes.success ? 'SUCCESS' : borrowRes.error, 'Record ID:', borrowRes.recordId);

  // 6. Student History
  const historyRes = await fetch(`${API_BASE}/borrow/my-history`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  console.log('6. Student History records count:', historyRes.records?.length, 'Active:', historyRes.stats?.activeCount);

  // 7. Return Book if borrowed
  if (borrowRes.recordId) {
    const returnRes = await fetch(`${API_BASE}/borrow/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
        'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
      },
      body: JSON.stringify({ recordId: borrowRes.recordId })
    }).then(r => r.json());
    console.log('7. Return Book:', returnRes.success ? 'SUCCESS' : returnRes.error);
  }

  // 8. Librarian Login
  const libLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'librarian@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  const libToken = libLogin.tokens?.accessToken;

  // 9. Librarian create book
  const newIsbn = `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const createBookRes = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${libToken}`,
      'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
    },
    body: JSON.stringify({
      isbn: newIsbn,
      title: 'Automated Test Book ' + Date.now(),
      author: 'QA Automation',
      category: 'Software Engineering',
      total_copies: 3,
      shelf_location: 'TEST-01'
    })
  }).then(r => r.json());
  console.log('9. Librarian Create Book:', createBookRes.success ? 'SUCCESS' : createBookRes.error, 'Book ID:', createBookRes.bookId);

  // 10. Super Admin Login & Users
  const saLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'superadmin@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  const saToken = saLogin.tokens?.accessToken;

  const usersRes = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  }).then(r => r.json());
  console.log('10. Super Admin Users count:', usersRes.users?.length);

  // 11. Super Admin Audit Logs
  const logsRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  }).then(r => r.json());
  console.log('11. Super Admin Audit Logs count:', logsRes.logs?.length);

  // 12. Security Demo SQL Injection
  const sqlRes = await fetch(`${API_BASE}/security-demo/test-sql-injection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: "' OR '1'='1" })
  }).then(r => r.json());
  console.log('12. SQL Demo Parameterized Query Matches:', sqlRes.parameterizedQuery?.matchesFound, 'Protected:', sqlRes.parameterizedQuery?.status);

  console.log('--- AUDIT FINISHED ---');
}

testAll().catch(console.error);
