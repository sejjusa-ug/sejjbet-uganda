const bcrypt = require('bcrypt');

async function verifyPassword(inputPassword, storedHash) {
  return await bcrypt.compare(inputPassword, storedHash);
}

async function hashPassword(rawPassword) {
  return await bcrypt.hash(rawPassword, 10);
}

module.exports = { verifyPassword, hashPassword };