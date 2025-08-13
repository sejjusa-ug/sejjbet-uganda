require('dotenv').config();

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
  port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,  // add this line!
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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
