require('dotenv').config(); // Load .env variables if any locally

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
  } else {
    console.log('✅ MySQL connected successfully');
    connection.release();
  }
});

module.exports = pool.promise();
