/**
 * BEAM for Individuals - Database Connection Module
 * 
 * Manages MySQL connection pool and provides database access
 * with connection pooling, error handling, and query logging.
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beam_individuals',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  charset: 'utf8mb4',
};

let pool = null;

/**
 * Initialize database connection pool
 */
async function initializePool() {
  try {
    pool = mysql.createPool(config);
    
    // Test connection
    const connection = await pool.getConnection();
    const [result] = await connection.execute('SELECT 1 as test');
    connection.release();
    
    console.log('✓ Database connection pool initialized');
    console.log(`  Host: ${config.host}:${config.port}`);
    console.log(`  Database: ${config.database}`);
    console.log(`  Connection Limit: ${config.connectionLimit}`);
    
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize database connection pool');
    console.error(error.message);
    return false;
  }
}

/**
 * Get database connection from pool
 */
async function getConnection() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return await pool.getConnection();
}

/**
 * Execute a query
 */
async function query(sql, values = []) {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, values);
    return results;
  } finally {
    connection.release();
  }
}

/**
 * Execute a query and return first row
 */
async function queryOne(sql, values = []) {
  const results = await query(sql, values);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close database connection pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    console.log('✓ Database connection pool closed');
  }
}

/**
 * Health check - verify database connectivity
 */
async function healthCheck() {
  try {
    const result = await queryOne('SELECT 1 as status');
    return result ? true : false;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
}

module.exports = {
  initializePool,
  getConnection,
  query,
  queryOne,
  transaction,
  closePool,
  healthCheck,
};
