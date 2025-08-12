const db = require('../models/db');

// Get latest 100 transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        t.id,
        t.user_id,
        u.first_name,
        u.last_name,
        t.type,
        t.amount,
        t.method,
        t.status,
        t.created_at
      FROM sejjtransactions t
      JOIN sejjbetusers u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
};

// Create a new transaction (deposit or withdrawal)
exports.createTransaction = async (req, res) => {
  const { user_id, wallet_id, amount, type, method, status } = req.body;

  if (!user_id || !wallet_id || !amount || !type || !method) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Insert transaction
    const [result] = await conn.query(
      `INSERT INTO sejjtransactions (user_id, wallet_id, amount, type, method, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, wallet_id, amount, type, method, status || 'pending']
    );

    // Update wallet balance
    const updateQuery = type === 'deposit'
      ? `UPDATE sejjwallets SET balance = balance + ? WHERE id = ?`
      : `UPDATE sejjwallets SET balance = balance - ? WHERE id = ?`;

    await conn.query(updateQuery, [amount, wallet_id]);

    await conn.commit();

    res.status(201).json({
      message: "Transaction created successfully",
      transaction_id: result.insertId
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Transaction failed." });
  } finally {
    conn.release();
  }
};
