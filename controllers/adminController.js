const { getAdminByUsername, createAdmin } = require('../models/adminModel');
const { verifyPassword, hashPassword } = require('../utils/authUtils');

async function loginAdmin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const isValid = await verifyPassword(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  return res.status(200).json({ message: 'Login successful' });
}

async function registerAdmin(req, res) {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const existing = await getAdminByUsername(username);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const password_hash = await hashPassword(password);
  await createAdmin(username, password_hash, email, role || 'moderator');

  return res.status(201).json({ message: 'Admin registered successfully' });
}

module.exports = { loginAdmin, registerAdmin };