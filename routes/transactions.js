const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Belum login' });
  }
  next();
}

router.use(requireAuth);

// Helper to get month and year from YYYY-MM-DD
function getMonthYear(dateStr) {
  const parts = dateStr.split('-');
  return {
    year: parts[0],
    month: parts[1]
  };
}

// Get all transactions for user (with optional filters)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { month, year, type, money_type } = req.query;

    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (month && year) {
      sql += ' AND month = ? AND year = ?';
      params.push(String(month).padStart(2, '0'), String(year));
    } else if (year) {
      sql += ' AND year = ?';
      params.push(String(year));
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (money_type) {
      sql += ' AND money_type = ?';
      params.push(money_type);
    }

    sql += ' ORDER BY date DESC, created_at DESC LIMIT 100';

    const [rows] = await db.query(sql, params);

    const transactions = rows.map(r => ({
      ...r,
      amount: Number(r.amount),
    }));

    res.json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan server.' });
  }
});

// Add new transaction
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { type, amount, money_type, source, category, description, date } = req.body;

    if (!type || !amount || !money_type || !date) {
      return res.status(400).json({ error: 'Field wajib harus diisi (type, amount, money_type, date)' });
    }

    const { month, year } = getMonthYear(date);

    const newTransaction = {
      user_id: userId,
      type,
      amount: parseFloat(amount),
      money_type,
      source: source || '',
      category: category || 'Lainnya',
      description: description || '',
      date,
      month,
      year,
    };

    const [result] = await db.query(
      `INSERT INTO transactions
        (user_id, type, amount, money_type, source, category, description, date, month, year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTransaction.user_id,
        newTransaction.type,
        newTransaction.amount,
        newTransaction.money_type,
        newTransaction.source,
        newTransaction.category,
        newTransaction.description,
        newTransaction.date,
        newTransaction.month,
        newTransaction.year,
      ]
    );

    res.json({
      success: true,
      transaction: { id: result.insertId, ...newTransaction }
    });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get summary
router.get('/summary', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    const [rows] = await db.query(
      'SELECT type, amount, money_type, month, year FROM transactions WHERE user_id = ?',
      [userId]
    );

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let digitalIncome = 0;
    let digitalExpense = 0;

    rows.forEach(data => {
      const amount = Number(data.amount);

      if (data.type === 'income') {
        totalIncome += amount;
        if (data.month === currentMonth && data.year === currentYear) monthlyIncome += amount;
        if (data.money_type === 'cash') cashIncome += amount;
        if (data.money_type === 'digital') digitalIncome += amount;
      } else {
        totalExpense += amount;
        if (data.month === currentMonth && data.year === currentYear) monthlyExpense += amount;
        if (data.money_type === 'cash') cashExpense += amount;
        if (data.money_type === 'digital') digitalExpense += amount;
      }
    });

    res.json({
      monthlyIncome,
      monthlyExpense,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
      cashBalance: cashIncome - cashExpense,
      digitalBalance: digitalIncome - digitalExpense,
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get chart data
router.get('/chart-data', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const [allTransactions] = await db.query(
      'SELECT type, amount, category, month, year FROM transactions WHERE user_id = ?',
      [userId]
    );

    // Last 6 months labels
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
      const monthlyTrans = allTransactions.filter(t => t.month === m.month && t.year === m.year);
      const income = monthlyTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthlyTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        label: m.label,
        income,
        expense
      };
    });

    // Category breakdown (current month)
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());
    const currentMonthExpenses = allTransactions.filter(t =>
      t.type === 'expense' && t.month === currentMonth && t.year === currentYear
    );

    const categoriesMap = {};
    currentMonthExpenses.forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + Number(t.amount);
    });

    const categories = Object.keys(categoriesMap)
      .map(cat => ({ category: cat, total: categoriesMap[cat] }))
      .sort((a, b) => b.total - a.total);

    res.json({ monthly: chartData, categories });
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
