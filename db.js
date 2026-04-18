const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
  // Tambahkan SSL agar bisa konek ke RDS dari luar/lokal
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;