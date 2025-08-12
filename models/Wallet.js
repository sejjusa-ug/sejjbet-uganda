const db = require('./db');

async function createWallet(userId) {
  await db.execute(
    `INSERT INTO sejjwallets (user_id, balance, created_at)
     VALUES (?, ?, NOW())`,
    [userId, 0.00]
  );
}

async function getWalletByUserId(userId) {
  const [rows] = await db.execute(
    `SELECT id, balance, created_at FROM sejjwallets WHERE user_id = ?`,
    [userId]
  );
  return rows[0];
}

async function updateWalletBalance(userId, newBalance) {
  await db.execute(
    `UPDATE sejjwallets SET balance = ? WHERE user_id = ?`,
    [newBalance, userId]
  );
}

module.exports = {
  createWallet,
  getWalletByUserId,
  updateWalletBalance
};