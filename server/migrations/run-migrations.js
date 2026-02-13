#!/usr/bin/env node

/**
 * BEAM for Individuals - Database Migration Runner
 * 
 * This script executes all pending migrations in order.
 * Usage: node run-migrations.js [--env=development|production]
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beam_individuals',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

/**
 * Get list of migration files
 */
function getMigrationFiles() {
  const migrationsDir = __dirname;
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.match(/^\d+_.*\.sql$/))
    .sort();
}

/**
 * Get list of executed migrations from database
 */
async function getExecutedMigrations(connection) {
  try {
    const [rows] = await connection.execute(
      'SELECT migration_name FROM migrations ORDER BY executed_at'
    );
    return rows.map((row) => row.migration_name);
  } catch (error) {
    // Table doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Extract migration name from filename
 */
function getMigrationName(filename) {
  return filename.replace(/\.sql$/, '');
}

/**
 * Execute a migration file
 */
async function executeMigration(connection, filePath, migrationName) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolon but preserve them in the statements
    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    log.info(`Executing migration: ${migrationName}`);
    
    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (error) {
        // Some statements might fail if they already exist (CREATE IF NOT EXISTS)
        // This is expected and we can continue
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    log.success(`Migration completed: ${migrationName}`);
    return true;
  } catch (error) {
    log.error(`Migration failed: ${migrationName}`);
    console.error(error.message);
    return false;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  let connection;

  try {
    log.section('BEAM for Individuals - Database Migration Runner');
    log.info(`Connecting to database: ${config.database}`);

    // Create connection pool
    const pool = mysql.createPool(config);
    connection = await pool.getConnection();

    log.success('Connected to database');

    // Get migration files
    const migrationFiles = getMigrationFiles();
    if (migrationFiles.length === 0) {
      log.warn('No migration files found');
      return;
    }

    log.info(`Found ${migrationFiles.length} migration file(s)`);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(connection);
    log.info(`${executedMigrations.length} migration(s) already executed`);

    // Execute pending migrations
    let executedCount = 0;
    for (const file of migrationFiles) {
      const migrationName = getMigrationName(file);
      
      if (executedMigrations.includes(migrationName)) {
        log.info(`Skipping (already executed): ${migrationName}`);
        continue;
      }

      const filePath = path.join(__dirname, file);
      const success = await executeMigration(connection, filePath, migrationName);
      
      if (!success) {
        log.error('Migration failed. Aborting.');
        process.exit(1);
      }

      executedCount++;
    }

    if (executedCount === 0) {
      log.info('All migrations already executed. Database is up to date.');
    } else {
      log.success(`Successfully executed ${executedCount} migration(s)`);
    }

    log.section('Migration Summary');
    log.info(`Total migrations: ${migrationFiles.length}`);
    log.info(`Executed: ${executedCount}`);
    log.info(`Already applied: ${executedMigrations.length}`);

    await connection.release();
    process.exit(0);
  } catch (error) {
    log.error('Fatal error during migration');
    console.error(error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
