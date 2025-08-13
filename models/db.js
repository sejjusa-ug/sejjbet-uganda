require('dotenv').config();
const mysql = require('mysql2');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const config = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

console.log('🔧 MySQL config:');
console.log(`HOST: ${config.host}`);
console.log(`USER: ${config.user}`);
console.log(`DB: ${config.database}`);
console.log(`PORT: ${config.port}`);

const pool = mysql.createPool(config);
const promisePool = pool.promise();

function tryConnect(retriesLeft = MAX_RETRIES) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(`❌ MySQL connection failed: ${err.message}`);
      if (retriesLeft > 0) {
        console.log(`🔁 Retrying in ${RETRY_DELAY_MS / 1000}s... (${MAX_RETRIES - retriesLeft + 1}/${MAX_RETRIES})`);
        setTimeout(() => tryConnect(retriesLeft - 1), RETRY_DELAY_MS);
      } else {
        console.error('🚫 All retries exhausted. MySQL connection failed.');
      }
    } else {
      console.log('✅ MySQL connected successfully');
      connection.release();
    }
  });
}

tryConnect();

module.exports = promisePool;