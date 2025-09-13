const { Pool } = require('pg');

/**
 * ExamGenius AI Database Configuration
 * PostgreSQL connection pool with production optimizations
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to try connecting before timing out
});

// Connection event logging
pool.on('connect', (client) => {
  console.log('🔗 New client connected to ExamGenius AI database');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
