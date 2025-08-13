const db = require('./db');
const bcrypt = require('bcrypt');

async function createUser(userData) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const [result] = await db.execute(
    `INSERT INTO sejjbetusers (first_name, last_name, mobile, password_hash, district, country, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userData.first_name,
      userData.last_name,
      userData.mobile,
      hashedPassword,
      userData.district,
      userData.country,
      userData.payment_method
    ]
  );
  return result.insertId;
}

async function getUserById(userId) {
  const [rows] = await db.execute(
    `SELECT id, first_name, last_name, mobile, district, country, payment_method, created_at
     FROM sejjbetusers
     WHERE id = ?`,
    [userId]
  );
  return rows[0];
}

async function getUserByMobile(mobile) {
  const [rows] = await db.execute(
    `SELECT id, first_name, last_name, mobile, district, country, payment_method, created_at, password_hash
     FROM sejjbetusers
     WHERE mobile = ?`,
    [mobile]
  );
  return rows[0];
}

async function verifyPassword(inputPassword, hashedPassword) {
  return bcrypt.compare(inputPassword, hashedPassword);
}

module.exports = {
  createUser,
  getUserById,
  getUserByMobile,
  verifyPassword
};