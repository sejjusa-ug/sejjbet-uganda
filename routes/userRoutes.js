const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserBalance,
  changeUserPassword
} = require('../controllers/userController').default;
const db = require('../models/db'); // adjust path if needed

router.post('/register', registerUser);
router.post('/login', loginUser);

// ✅ Change password route
router.post('/changepassword', changeUserPassword);

// ✅ GET /api/users/:id/balance from sejjwallets
router.get('/:id/balance', async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await db.query(
      'SELECT balance FROM sejjwallets WHERE user_id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const rawBalance = rows[0].balance;
    const formatted = formatUGX(rawBalance);

    res.json({ balance: formatted });
  } catch (err) {
    console.error('Balance fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === ADD DEPOSIT HANDLER with full transaction logging ===
router.post('/:id/deposit', async (req, res) => {
  const userId = req.params.id;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  try {
    await db.query(
      'UPDATE sejjwallets SET balance = balance + ? WHERE user_id = ?',
      [amount, userId]
    );

    const [walletRows] = await db.query(
      'SELECT id, balance FROM sejjwallets WHERE user_id = ?',
      [userId]
    );
    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found after deposit' });
    }

    const wallet = walletRows[0];

    const [userRows] = await db.query(
      'SELECT mobile, payment_method FROM sejjbetusers WHERE id = ?',
      [userId]
    );
    const user = userRows[0] || {};

    await db.query(
      `INSERT INTO sejjtransactions 
        (user_id, wallet_id, amount, new_balance, payment_method, mobile, transaction_type, description) 
       VALUES (?, ?, ?, ?, ?, ?, 'deposit', 'Deposit via API')`,
      [userId, wallet.id, amount, wallet.balance, user.payment_method || '', user.mobile || '']
    );

    const formatted = formatUGX(wallet.balance);
    res.json({ balance: formatted });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Deposit failed' });
  }
});
// === END ADD DEPOSIT HANDLER ===

// === WITHDRAW HANDLER with full transaction logging ===
router.post('/:id/withdraw', async (req, res) => {
  const userId = req.params.id;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid withdraw amount' });
  }

  try {
    const [walletRows] = await db.query(
      'SELECT id, balance FROM sejjwallets WHERE user_id = ?',
      [userId]
    );

    if (!walletRows || walletRows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const wallet = walletRows[0];

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);

    await db.query(
      'UPDATE sejjwallets SET balance = ? WHERE user_id = ?',
      [newBalance, userId]
    );

    const [userRows] = await db.query(
      'SELECT mobile, payment_method FROM sejjbetusers WHERE id = ?',
      [userId]
    );
    const user = userRows[0] || {};

    await db.query(
      `INSERT INTO sejjtransactions 
        (user_id, wallet_id, amount, new_balance, payment_method, mobile, transaction_type, description) 
       VALUES (?, ?, ?, ?, ?, ?, 'withdraw', 'Withdrawal via API')`,
      [userId, wallet.id, amount, newBalance, user.payment_method || '', user.mobile || '']
    );

    const formatted = formatUGX(newBalance);
    res.json({ balance: formatted });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});
// === END WITHDRAW HANDLER ===

// ✅ GET /api/users — fetch all users with wallet info
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.mobile,
        u.password_hash AS password,
        u.district,
        u.country,
        u.payment_method,
        DATE_FORMAT(u.created_at, '%e %b %Y, %l:%i %p') AS created_at,
        w.id AS wallet_id,
        DATE_FORMAT(w.created_at, '%e %b %Y, %l:%i %p') AS wallet_created_at,
        w.balance AS raw_balance
      FROM sejjbetusers u
      LEFT JOIN sejjwallets w ON u.id = w.user_id
      ORDER BY u.created_at DESC
    `);

    const users = rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      mobile: row.mobile,
      password: row.password,
      district: row.district,
      country: row.country,
      payment_method: row.payment_method,
      created_at: row.created_at,
      wallet_id: row.wallet_id,
      wallet_created_at: row.wallet_created_at,
      account_balance: formatUGX(row.raw_balance),
    }));

    res.json(users);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ DELETE /api/users/:id — remove user and wallet
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    await db.query('DELETE FROM sejjwallets WHERE user_id = ?', [userId]);
    const [result] = await db.query('DELETE FROM sejjbetusers WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User and wallet deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ PUT /api/users/:id — update user info and wallet balance
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, account_balance } = req.body;

  if (!first_name || !last_name || isNaN(account_balance)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    await db.query(
      'UPDATE sejjbetusers SET first_name = ?, last_name = ? WHERE id = ?',
      [first_name, last_name, userId]
    );

    await db.query(
      'UPDATE sejjwallets SET balance = ? WHERE user_id = ?',
      [account_balance, userId]
    );

    const formattedBalance = formatUGX(account_balance);

    res.json({
      first_name,
      last_name,
      account_balance: formattedBalance
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === NEW ROUTE: GET all transactions ===
router.get('/transactions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id,
        t.user_id,
        t.wallet_id,
        t.amount,
        t.new_balance,
        t.payment_method,
        t.mobile,
        t.transaction_type,
        t.description,
        DATE_FORMAT(CONVERT_TZ(t.created_at, '+00:00', '+03:00'), '%e %b %Y, %l:%i %p') AS created_at,
        u.first_name,
        u.last_name
      FROM sejjtransactions t
      LEFT JOIN sejjbetusers u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);

    const formatted = rows.map(tx => ({
      ...tx,
      amount: formatUGX(tx.amount),
      new_balance: formatUGX(tx.new_balance)
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === NEW ROUTE: GET transactions for a specific user ===
router.get('/:id/transactions', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id,
        t.user_id,
        t.wallet_id,
        t.amount,
        t.new_balance,
        t.payment_method,
        t.mobile,
        t.transaction_type,
        t.description,
        DATE_FORMAT(CONVERT_TZ(t.created_at, '+00:00', '+03:00'), '%e %b %Y, %l:%i %p') AS created_at,
        u.first_name,
        u.last_name
      FROM sejjtransactions t
      LEFT JOIN sejjbetusers u ON t.user_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100
    `, [userId]);

    const formatted = rows.map(tx => ({
      ...tx,
      amount: formatUGX(tx.amount),
      new_balance: formatUGX(tx.new_balance)
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch user transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 💰 Helper function to format UGX
function formatUGX(value) {
  const num = parseFloat(
    typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value
  );

  if (isNaN(num)) return 'UGX 0.00';

  return 'UGX ' + num.toLocaleString('en-UG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = router;
