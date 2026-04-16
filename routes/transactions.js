const express = require('express');
const router = express.Router();
const { getDb, getAppwriteSdk } = require('../db');

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

function getAppwriteDbInfo() {
  return {
    databaseId: process.env.APPWRITE_DATABASE_ID,
    transactionsCollectionId: process.env.TRANSACTIONS_COLLECTION_ID,
  };
}

// Get all transactions for user (with optional filters)
router.get('/', async (req, res) => {
  try {
    const databases = getDb();
    const sdk = getAppwriteSdk();
    const userId = req.session.userId;
    const { month, year, type, money_type } = req.query;

    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });
    const { databaseId, transactionsCollectionId } = getAppwriteDbInfo();

    let queries = [sdk.Query.equal('user_id', userId)];

    if (month && year) {
      queries.push(sdk.Query.equal('month', month.padStart(2, '0')));
      queries.push(sdk.Query.equal('year', year));
    } else if (year) {
      queries.push(sdk.Query.equal('year', year));
    }

    if (type) {
      queries.push(sdk.Query.equal('type', type));
    }

    if (money_type) {
      queries.push(sdk.Query.equal('money_type', money_type));
    }

    // Since Appwrite requires indexes for ordering, we'll try to apply but fallback to manual sort if it fails in case user hasn't setup index.
    queries.push(sdk.Query.orderDesc('date'));
    queries.push(sdk.Query.orderDesc('created_at'));
    queries.push(sdk.Query.limit(100)); // Default limit

    const snapshot = await databases.listDocuments(
      databaseId,
      transactionsCollectionId,
      queries
    );

    const transactions = snapshot.documents.map(doc => {
      const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...data } = doc;
      return { id: $id, ...data };
    });

    res.json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: err.message || 'Terjadi kesalahan server.' });
  }
});

// Add new transaction
router.post('/', async (req, res) => {
  try {
    const databases = getDb();
    const sdk = getAppwriteSdk();
    const userId = req.session.userId;
    const { type, amount, money_type, source, category, description, date } = req.body;

    if (!type || !amount || !money_type || !date) {
      return res.status(400).json({ error: 'Field wajib harus diisi (type, amount, money_type, date)' });
    }

    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });
    const { databaseId, transactionsCollectionId } = getAppwriteDbInfo();

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
      created_at: new Date().toISOString()
    };

    const doc = await databases.createDocument(
      databaseId,
      transactionsCollectionId,
      sdk.ID.unique(),
      newTransaction
    );
    
    res.json({ 
      success: true, 
      transaction: { id: doc.$id, ...newTransaction } 
    });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const databases = getDb();
    const sdk = getAppwriteSdk();
    const userId = req.session.userId;
    const { id } = req.params;

    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });
    const { databaseId, transactionsCollectionId } = getAppwriteDbInfo();

    const doc = await databases.getDocument(
      databaseId,
      transactionsCollectionId,
      id
    );

    if (doc.user_id !== userId) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    await databases.deleteDocument(
      databaseId,
      transactionsCollectionId,
      id
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    if (err.code === 404) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get summary
router.get('/summary', async (req, res) => {
  try {
    const databases = getDb();
    const sdk = getAppwriteSdk();
    const userId = req.session.userId;

    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });
    const { databaseId, transactionsCollectionId } = getAppwriteDbInfo();

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    // In a real app we might paginate or aggregate on server, but for simplicity we fetch max points. Appwrite listDocuments max limit is 5000.
    const snapshot = await databases.listDocuments(
      databaseId,
      transactionsCollectionId,
      [
        sdk.Query.equal('user_id', userId),
        sdk.Query.limit(5000)
      ]
    );
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let digitalIncome = 0;
    let digitalExpense = 0;

    snapshot.documents.forEach(data => {
      const amount = data.amount;

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
    const databases = getDb();
    const sdk = getAppwriteSdk();
    const userId = req.session.userId;

    if (!databases || !sdk) return res.status(500).json({ error: 'Database not initialized' });
    const { databaseId, transactionsCollectionId } = getAppwriteDbInfo();

    const snapshot = await databases.listDocuments(
      databaseId,
      transactionsCollectionId,
      [
        sdk.Query.equal('user_id', userId),
        sdk.Query.limit(5000)
      ]
    );
    
    const allTransactions = snapshot.documents;

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
      const income = monthlyTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthlyTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

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
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
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
