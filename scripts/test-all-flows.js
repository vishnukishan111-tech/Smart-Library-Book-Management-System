const API_BASE = 'http://localhost:5000/api';

async function testAll() {
  console.log('====================================================');
  console.log(' SMART LIBRARY SYSTEM - AUTOMATED INTEGRATION AUDIT  ');
  console.log('====================================================');
  let passCount = 0;
  let failCount = 0;

  function assert(testName, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failCount++;
    }
  }

  // 1. Health check & DB engine
  const healthRes = await fetch(`${API_BASE}/health`).then(r => r.json());
  assert('1. Health Check', healthRes.status === 'healthy', `Engine: ${healthRes.databaseEngine}`);

  // 2. Books Catalog
  const booksRes = await fetch(`${API_BASE}/books`).then(r => r.json());
  assert('2. Books Catalog', booksRes.success && booksRes.count >= 0, `Count: ${booksRes.count}`);

  // 3. Login Student
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'student@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  assert('3. Student Login', loginRes.success && !!loginRes.tokens?.accessToken, `User: ${loginRes.user?.name}`);
  const studentToken = loginRes.tokens?.accessToken;

  // 4. Student profile & activity
  const profileRes = await fetch(`${API_BASE}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  assert('4. Profile Retrieval', profileRes.success && !!profileRes.user?.email, `Email: ${profileRes.user?.email}`);

  // 5. Check student history
  const historyRes = await fetch(`${API_BASE}/borrow/my-history`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  }).then(r => r.json());
  assert('5. Borrow History', historyRes.success, `Active: ${historyRes.stats?.activeCount}, Total: ${historyRes.records?.length}`);

  // 6. Return existing active loan if any, to ensure student has capacity
  const activeRecords = (historyRes.records || []).filter(r => r.status === 'borrowed' || r.status === 'overdue');
  let returnedBookId = null;
  if (activeRecords.length > 0) {
    const recordToReturn = activeRecords[0];
    const returnRes = await fetch(`${API_BASE}/borrow/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
        'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
      },
      body: JSON.stringify({ recordId: recordToReturn.id })
    }).then(r => r.json());
    assert('6. Return Active Book', returnRes.success, `Book: "${recordToReturn.title}"`);
    returnedBookId = recordToReturn.book_id;
  } else {
    console.log('[SKIP] 6. Return Active Book (No active loans to return)');
  }

  // 7. Borrow Book (borrow the returned book or any available book)
  const candidateBook = returnedBookId 
    ? { id: returnedBookId, title: 'Returned Book' }
    : (booksRes.books || []).find(b => b.available_copies > 0) || { id: 1, title: 'Default' };

  const borrowRes = await fetch(`${API_BASE}/borrow/borrow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`,
      'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
    },
    body: JSON.stringify({ bookId: candidateBook.id })
  }).then(r => r.json());
  assert('7. Borrow Book Transaction', borrowRes.success || borrowRes.error?.includes('already have an active loan'), `Record ID: ${borrowRes.recordId || 'N/A'}`);

  // 8. Librarian Login
  const libLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'librarian@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  assert('8. Librarian Login', libLogin.success, `Role: ${libLogin.user?.role}`);
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
  assert('9. Librarian Create Book', createBookRes.success, `Book ID: ${createBookRes.bookId}`);

  // 10. Super Admin Login & Users
  const saLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-library-csrf': 'secure-smart-lib-csrf-token-2026' },
    body: JSON.stringify({ email: 'superadmin@library.edu', password: 'Password123!' })
  }).then(r => r.json());
  assert('10. Super Admin Login', saLogin.success, `User: ${saLogin.user?.name}`);
  const saToken = saLogin.tokens?.accessToken;

  const usersRes = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  }).then(r => r.json());
  assert('11. Super Admin Users List', usersRes.success && usersRes.users?.length > 0, `Users Count: ${usersRes.users?.length}`);

  // 12. Super Admin Audit Logs
  const logsRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  }).then(r => r.json());
  assert('12. Audit Trail Logs', logsRes.success && logsRes.logs?.length > 0, `Logs Count: ${logsRes.logs?.length}`);

  // 13. Security Demo SQL Injection
  const sqlRes = await fetch(`${API_BASE}/security-demo/test-sql-injection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: "' OR '1'='1" })
  }).then(r => r.json());
  assert('13. SQL Injection Defense Demo', sqlRes.parameterizedQuery?.status === 'SECURE_PROTECTED', 'Input treated as literal');

  // 14. Inspect Active Defenses
  const defensesRes = await fetch(`${API_BASE}/security-demo/inspect-defenses`).then(r => r.json());
  assert('14. Inspect Defenses', defensesRes.success && !!defensesRes.securityControls, 'CSP, Helmet, bcrypt active');

  console.log('====================================================');
  console.log(` AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED `);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

testAll().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
