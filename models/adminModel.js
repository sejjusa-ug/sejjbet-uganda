const db = require('./db');

async function getAdminByUsername(username) {
  const [rows] = await db.query(
    'SELECT * FROM admin_users WHERE username = ?',
    [username]
  );
  return rows[0];
}

async function createAdmin(username, password_hash, email = null, role = 'moderator') {
  await db.query(
    `INSERT INTO admin_users (username, password_hash, email, role)
     VALUES (?, ?, ?, ?)`,
    [username, password_hash, email, role]
  );
}

module.exports = { getAdminByUsername, createAdmin };