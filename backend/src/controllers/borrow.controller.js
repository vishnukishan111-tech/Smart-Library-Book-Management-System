const db = require('../db');
const { logAudit } = require('../middleware/audit');

// Default borrow duration: 14 days
const BORROW_DURATION_DAYS = 14;
const DAILY_OVERDUE_FINE = 1.00; // $1.00 / day

/**
 * Helper to update overdue statuses dynamically
 */
async function refreshOverdueRecords() {
  try {
    // Find all records past due date that are still marked as borrowed
    const overdueRes = await db.query(
      `SELECT id, due_date FROM borrow_records 
       WHERE status = 'borrowed' AND due_date < CURRENT_TIMESTAMP`
    );

    for (const record of overdueRes.rows) {
      const daysLate = Math.ceil((new Date() - new Date(record.due_date)) / (1000 * 60 * 60 * 24));
      const fine = Math.max(0, daysLate * DAILY_OVERDUE_FINE);
      await db.query(
        `UPDATE borrow_records SET status = 'overdue', fine_amount = $1 WHERE id = $2`,
        [fine, record.id]
      );
    }
  } catch (err) {
    console.error('[OVERDUE REFRESH ERROR]', err.message);
  }
}

/**
 * Borrow a book (Student / Admin)
 */
async function borrowBook(req, res) {
  try {
    const { bookId, targetUserId } = req.body;
    const userId = (req.user.role === 'student' || !targetUserId) ? req.user.id : targetUserId;

    if (!bookId) {
      return res.status(400).json({ success: false, error: 'Book ID is required.' });
    }

    // Check if book exists and has available copies (atomic transaction check)
    const bookRes = await db.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Book not found.' });
    }

    const book = bookRes.rows[0];
    if (book.available_copies <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No copies currently available. All copies are currently checked out.'
      });
    }

    // Check if student already has this book borrowed
    const activeBorrow = await db.query(
      `SELECT id FROM borrow_records WHERE user_id = $1 AND book_id = $2 AND status IN ('borrowed', 'overdue')`,
      [userId, bookId]
    );

    if (activeBorrow.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active loan for this book.'
      });
    }

    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + BORROW_DURATION_DAYS);

    // Decrement available copies
    await db.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [bookId]
    );

    // Create borrow record
    const recordRes = await db.query(
      `INSERT INTO borrow_records (user_id, book_id, due_date, status, fine_amount)
       VALUES ($1, $2, $3, 'borrowed', 0.00)
       RETURNING id`,
      [userId, bookId, dueDate.toISOString()]
    );

    const recordId = recordRes.lastID || (recordRes.rows && recordRes.rows[0]?.id);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BOOK_BORROWED',
      entityType: 'borrow_record',
      entityId: recordId,
      details: { bookId, bookTitle: book.title, dueDate: dueDate.toISOString() },
      req
    });

    return res.status(201).json({
      success: true,
      message: `Successfully borrowed "${book.title}". Due date is ${dueDate.toLocaleDateString()}.`,
      recordId,
      dueDate
    });
  } catch (err) {
    console.error('[BORROW BOOK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete borrow transaction.'
    });
  }
}

/**
 * Return a book
 */
async function returnBook(req, res) {
  try {
    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ success: false, error: 'Borrow Record ID is required.' });
    }

    // Find the record
    const recordRes = await db.query(
      `SELECT br.*, b.title as book_title
       FROM borrow_records br
       JOIN books b ON br.book_id = b.id
       WHERE br.id = $1`,
      [recordId]
    );

    if (recordRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Borrow record not found.' });
    }

    const record = recordRes.rows[0];

    // Authorization check: students can only return their own books unless admin
    if (req.user.role === 'student' && record.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: You can only return books borrowed under your account.'
      });
    }

    if (record.status === 'returned') {
      return res.status(400).json({
        success: false,
        error: 'This book has already been marked as returned.'
      });
    }

    const now = new Date();
    const returnDateIso = now.toISOString();

    // Check for late fee
    let fineAmount = 0.00;
    if (new Date(record.due_date) < now) {
      const daysLate = Math.ceil((now - new Date(record.due_date)) / (1000 * 60 * 60 * 24));
      fineAmount = Math.max(0, daysLate * DAILY_OVERDUE_FINE);
    }

    // Mark as returned
    await db.query(
      `UPDATE borrow_records 
       SET status = 'returned', return_date = $1, fine_amount = $2 
       WHERE id = $3`,
      [returnDateIso, fineAmount, recordId]
    );

    // Increment available copies
    await db.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
      [record.book_id]
    );

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BOOK_RETURNED',
      entityType: 'borrow_record',
      entityId: recordId,
      details: {
        bookId: record.book_id,
        bookTitle: record.book_title,
        returnedAt: returnDateIso,
        fineAmount
      },
      req
    });

    return res.json({
      success: true,
      message: `"${record.book_title}" returned successfully.${fineAmount > 0 ? ` Overdue fine assessed: $${fineAmount.toFixed(2)}` : ''}`,
      fineAmount
    });
  } catch (err) {
    console.error('[RETURN BOOK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process book return.'
    });
  }
}

/**
 * Get Student Borrow History & Active Loans
 */
async function getStudentBorrowHistory(req, res) {
  try {
    await refreshOverdueRecords();

    const userId = req.user.id;

    const historyRes = await db.query(
      `SELECT br.id, br.borrow_date, br.due_date, br.return_date, br.status, br.fine_amount,
              b.id as book_id, b.title, b.author, b.isbn, b.category, b.cover_image, b.shelf_location
       FROM borrow_records br
       JOIN books b ON br.book_id = b.id
       WHERE br.user_id = $1
       ORDER BY br.borrow_date DESC`,
      [userId]
    );

    // Calculate quick stats
    const active = historyRes.rows.filter(r => r.status === 'borrowed');
    const overdue = historyRes.rows.filter(r => r.status === 'overdue');
    const returned = historyRes.rows.filter(r => r.status === 'returned');
    const totalFines = historyRes.rows.reduce((sum, r) => sum + (parseFloat(r.fine_amount) || 0), 0);

    return res.json({
      success: true,
      records: historyRes.rows,
      stats: {
        activeCount: active.length,
        overdueCount: overdue.length,
        returnedCount: returned.length,
        totalFines: totalFines.toFixed(2)
      }
    });
  } catch (err) {
    console.error('[STUDENT HISTORY ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch borrowing history.'
    });
  }
}

/**
 * Admin: Get All Borrow & Return Records
 */
async function getAllBorrowRecords(req, res) {
  try {
    await refreshOverdueRecords();

    const { status = 'all', search = '' } = req.query;

    let sql = `
      SELECT br.id, br.borrow_date, br.due_date, br.return_date, br.status, br.fine_amount, br.notes,
             b.id as book_id, b.title as book_title, b.isbn, b.shelf_location,
             u.id as user_id, u.name as user_name, u.email as user_email, u.student_id
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      JOIN users u ON br.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (status !== 'all' && ['borrowed', 'returned', 'overdue'].includes(status)) {
      sql += ` AND br.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(b.title) LIKE $${pIdx} OR LOWER(u.name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR LOWER(u.student_id) LIKE $${pIdx})`;
      params.push(`%${search.trim().toLowerCase()}%`);
      pIdx++;
    }

    sql += ` ORDER BY br.borrow_date DESC`;

    const result = await db.query(sql, params);

    // Aggregate counts
    const countsRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'borrowed' THEN 1 END) as active_borrowed,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
        COALESCE(SUM(fine_amount), 0) as total_fines
      FROM borrow_records
    `);

    return res.json({
      success: true,
      records: result.rows,
      summary: countsRes.rows[0]
    });
  } catch (err) {
    console.error('[ALL RECORDS ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch borrowing records.'
    });
  }
}

module.exports = {
  borrowBook,
  returnBook,
  getStudentBorrowHistory,
  getAllBorrowRecords
};
