const express = require('express');
const router = express.Router();
const { getDb, saveDatabase } = require('../db');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Belum login' });
  }
  next();
}

router.use(requireAuth);

// Get all transactions for user (with optional filters)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { month, year, type, money_type } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (month && year) {
      query += " AND strftime('%m', date) = ? AND strftime('%Y', date) = ?";
      params.push(month.padStart(2, '0'), year);
    } else if (year) {
      query += " AND strftime('%Y', date) = ?";
      params.push(year);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (money_type) {
      query += ' AND money_type = ?';
      params.push(money_type);
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = db.exec(query, params);

    if (result.length === 0) {
      return res.json([]);
    }

    const columns = result[0].columns;
    const transactions = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    res.json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Add new transaction
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { type, amount, money_type, source, category, description, date } = req.body;

    if (!type || !amount || !money_type || !date) {
      return res.status(400).json({ error: 'Field wajib harus diisi (type, amount, money_type, date)' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type harus income atau expense' });
    }

    if (!['cash', 'digital'].includes(money_type)) {
      return res.status(400).json({ error: 'Money type harus cash atau digital' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Jumlah harus lebih dari 0' });
    }

    db.run(
      'INSERT INTO transactions (user_id, type, amount, money_type, source, category, description, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, type, amount, money_type, source || '', category || 'Lainnya', description || '', date]
    );
    saveDatabase();

    // Get the inserted transaction
    const result = db.exec('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const transaction = {};
    columns.forEach((col, i) => { transaction[col] = row[i]; });

    res.json({ success: true, transaction });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { id } = req.params;

    // Verify ownership
    const check = db.exec('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0 || check[0].values.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    db.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
    saveDatabase();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get summary (total income, expense, balance for current month & all time)
router.get('/summary', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    // Monthly totals
    const monthlyIncome = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?",
      [userId, currentMonth, currentYear]
    );
    const monthlyExpense = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?",
      [userId, currentMonth, currentYear]
    );

    // All time totals
    const totalIncome = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income'",
      [userId]
    );
    const totalExpense = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense'",
      [userId]
    );

    // Cash vs Digital balance
    const cashIncome = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income' AND money_type = 'cash'",
      [userId]
    );
    const cashExpense = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense' AND money_type = 'cash'",
      [userId]
    );
    const digitalIncome = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income' AND money_type = 'digital'",
      [userId]
    );
    const digitalExpense = db.exec(
      "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense' AND money_type = 'digital'",
      [userId]
    );

    const getVal = (r) => (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : 0;

    const summary = {
      monthlyIncome: getVal(monthlyIncome),
      monthlyExpense: getVal(monthlyExpense),
      totalIncome: getVal(totalIncome),
      totalExpense: getVal(totalExpense),
      totalBalance: getVal(totalIncome) - getVal(totalExpense),
      cashBalance: getVal(cashIncome) - getVal(cashExpense),
      digitalBalance: getVal(digitalIncome) - getVal(digitalExpense),
    };

    res.json(summary);
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get chart data (monthly income vs expense for the last 6 months)
router.get('/chart-data', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    // Last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: String(d.getFullYear()),
        label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      });
    }

    const chartData = months.map(m => {
      const incomeResult = db.exec(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?",
        [userId, m.month, m.year]
      );
      const expenseResult = db.exec(
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?",
        [userId, m.month, m.year]
      );

      const getVal = (r) => (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : 0;

      return {
        label: m.label,
        income: getVal(incomeResult),
        expense: getVal(expenseResult)
      };
    });

    // Category breakdown for current month
    const categoryResult = db.exec(
      "SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ? GROUP BY category ORDER BY total DESC",
      [userId, String(now.getMonth() + 1).padStart(2, '0'), String(now.getFullYear())]
    );

    let categories = [];
    if (categoryResult.length > 0) {
      categories = categoryResult[0].values.map(row => ({
        category: row[0],
        total: row[1]
      }));
    }

    res.json({ monthly: chartData, categories });
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
