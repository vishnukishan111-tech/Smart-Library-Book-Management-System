const db = require('../db');
const { logAudit } = require('../middleware/audit');

/**
 * Search and Filter Books with Parameterized Queries
 */
async function getBooks(req, res) {
  try {
    const { search = '', category = '', author = '', availability = 'all' } = req.query;

    let sql = `SELECT id, isbn, title, author, category, cover_image, 
                      total_copies, available_copies, shelf_location, 
                      published_year, description, created_at 
               FROM books 
               WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    // Search query parameterization
    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(title) LIKE $${paramIndex} OR LOWER(author) LIKE $${paramIndex} OR LOWER(isbn) LIKE $${paramIndex})`;
      params.push(`%${search.trim().toLowerCase()}%`);
      paramIndex++;
    }

    // Category filter (case-insensitive)
    if (category && category !== 'All' && category.trim() !== '') {
      sql += ` AND LOWER(category) = LOWER($${paramIndex})`;
      params.push(category.trim());
      paramIndex++;
    }

    // Author filter
    if (author && author.trim() !== '') {
      sql += ` AND LOWER(author) LIKE $${paramIndex}`;
      params.push(`%${author.trim().toLowerCase()}%`);
      paramIndex++;
    }

    // Availability filter
    if (availability === 'available') {
      sql += ` AND available_copies > 0`;
    } else if (availability === 'unavailable') {
      sql += ` AND available_copies = 0`;
    }

    sql += ` ORDER BY id ASC`;

    const result = await db.query(sql, params);

    // Also get categories list for the filter dropdown
    const catResult = await db.query(`SELECT DISTINCT category FROM books ORDER BY category ASC`);
    const categories = catResult.rows.map(r => r.category);

    return res.json({
      success: true,
      count: result.rows.length,
      books: result.rows,
      categories
    });
  } catch (err) {
    console.error('[GET BOOKS ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve book catalog.'
    });
  }
}

/**
 * Get Single Book Details
 */
async function getBookById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM books WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Book not found.'
      });
    }

    // Fetch active borrowers if admin/super_admin
    let activeBorrowers = [];
    if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
      const borrowersRes = await db.query(
        `SELECT br.id, br.borrow_date, br.due_date, br.status,
                u.name as student_name, u.email as student_email, u.student_id
         FROM borrow_records br
         JOIN users u ON br.user_id = u.id
         WHERE br.book_id = $1 AND br.status IN ('borrowed', 'overdue')`,
        [id]
      );
      activeBorrowers = borrowersRes.rows;
    }

    return res.json({
      success: true,
      book: result.rows[0],
      activeBorrowers
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve book details.'
    });
  }
}

/**
 * Add New Book (Admin / Super Admin)
 */
async function createBook(req, res) {
  try {
    const {
      isbn,
      title,
      author,
      category,
      cover_image = '',
      total_copies = 1,
      shelf_location = 'A-101',
      published_year = new Date().getFullYear(),
      description = ''
    } = req.body;

    if (!isbn || !title || !author || !category) {
      return res.status(400).json({
        success: false,
        error: 'ISBN, title, author, and category are required fields.'
      });
    }

    // Check duplicate ISBN
    const existing = await db.query('SELECT id FROM books WHERE isbn = $1', [isbn.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A book with this ISBN already exists in the catalog.'
      });
    }

    const copies = parseInt(total_copies, 10) || 1;
    const insertRes = await db.query(
      `INSERT INTO books (isbn, title, author, category, cover_image, total_copies, available_copies, shelf_location, published_year, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        isbn.trim(),
        title.trim(),
        author.trim(),
        category.trim(),
        cover_image.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        copies,
        copies,
        shelf_location.trim(),
        published_year,
        description.trim()
      ]
    );

    const newBookId = insertRes.lastID || (insertRes.rows && insertRes.rows[0]?.id);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BOOK_CREATED',
      entityType: 'book',
      entityId: newBookId,
      details: { title, author, isbn, total_copies: copies },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Book successfully added to catalog.',
      bookId: newBookId
    });
  } catch (err) {
    console.error('[CREATE BOOK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create book record.'
    });
  }
}

/**
 * Update Book (Admin / Super Admin)
 */
async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      category,
      cover_image,
      total_copies,
      available_copies,
      shelf_location,
      published_year,
      description
    } = req.body;

    const existing = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Book not found.' });
    }

    const current = existing.rows[0];
    const newTotal = total_copies !== undefined ? parseInt(total_copies, 10) : current.total_copies;
    const newAvail = available_copies !== undefined ? parseInt(available_copies, 10) : current.available_copies;

    if (newAvail > newTotal) {
      return res.status(400).json({
        success: false,
        error: 'Available copies cannot exceed total copies.'
      });
    }

    await db.query(
      `UPDATE books 
       SET title = $1, author = $2, category = $3, cover_image = $4,
           total_copies = $5, available_copies = $6, shelf_location = $7,
           published_year = $8, description = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        title || current.title,
        author || current.author,
        category || current.category,
        cover_image || current.cover_image,
        newTotal,
        newAvail,
        shelf_location || current.shelf_location,
        published_year || current.published_year,
        description || current.description,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BOOK_UPDATED',
      entityType: 'book',
      entityId: id,
      details: { title, total_copies: newTotal, available_copies: newAvail },
      req
    });

    return res.json({
      success: true,
      message: 'Book details updated successfully.'
    });
  } catch (err) {
    console.error('[UPDATE BOOK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update book.'
    });
  }
}

/**
 * Delete Book (Admin / Super Admin)
 */
async function deleteBook(req, res) {
  try {
    const { id } = req.params;

    // Check if copies are currently borrowed
    const borrowedCheck = await db.query(
      `SELECT count(*) as count FROM borrow_records WHERE book_id = $1 AND status IN ('borrowed', 'overdue')`,
      [id]
    );

    if (parseInt(borrowedCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete book: Copies are currently checked out by students.'
      });
    }

    // Delete borrow records first or rely on cascade
    await db.query('DELETE FROM borrow_records WHERE book_id = $1', [id]);
    await db.query('DELETE FROM books WHERE id = $1', [id]);

    await logAudit({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'BOOK_DELETED',
      entityType: 'book',
      entityId: id,
      req
    });

    return res.json({
      success: true,
      message: 'Book successfully deleted from catalog.'
    });
  } catch (err) {
    console.error('[DELETE BOOK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete book.'
    });
  }
}

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
