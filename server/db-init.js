#!/usr/bin/env node

/**
 * BEAM for Individuals - Database Initialization Script
 * 
 * This script:
 * 1. Creates the database if it doesn't exist
 * 2. Runs all migrations
 * 3. Verifies the schema
 * 4. Outputs database connection info
 * 
 * Usage: node db-init.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
 * Create database if it doesn't exist
 */
async function createDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  const dbName = process.env.DB_NAME || 'beam_individuals';

  try {
    log.info(`Creating database: ${dbName}`);
    
    const connection = await mysql.createConnection(config);
    
    // Create database if not exists
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    
    log.success(`Database created or already exists: ${dbName}`);
    await connection.end();
    
    return true;
  } catch (error) {
    log.error(`Failed to create database: ${error.message}`);
    return false;
  }
}

/**
 * Run migrations
 */
function runMigrations() {
  try {
    log.info('Running migrations...');
    
    const migrationsPath = path.join(__dirname, 'migrations', 'run-migrations.js');
    execSync(`node ${migrationsPath}`, { stdio: 'inherit' });
    
    log.success('Migrations completed');
    return true;
  } catch (error) {
    log.error(`Failed to run migrations: ${error.message}`);
    return false;
  }
}

/**
 * Verify database schema
 */
async function verifySchema() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'beam_individuals',
  };

  try {
    log.info('Verifying database schema...');
    
    const connection = await mysql.createConnection(config);
    
    // Check tables
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [config.database]);

    log.success(`Found ${tables.length} tables:`);
    
    const requiredTables = [
      'users',
      'auth_tokens',
      'sessions',
      'websites',
      'threat_assessments',
      'competitors',
      'keywords',
      'recommended_actions',
      'beam_reports',
      'subscriptions',
      'competitor_discovery_jobs',
      'audit_logs',
      'business_types',
      'migrations',
    ];

    let allTablesPresent = true;
    for (const table of requiredTables) {
      const exists = tables.some((t) => t.TABLE_NAME === table);
      const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`  ${status} ${table}`);
      if (!exists) allTablesPresent = false;
    }

    if (!allTablesPresent) {
      log.warn('Some required tables are missing');
      return false;
    }

    // Check business types count
    const [businessTypes] = await connection.execute(
      'SELECT COUNT(*) as count FROM business_types'
    );

    const typeCount = businessTypes[0].count;
    log.success(`Business types populated: ${typeCount} types`);

    if (typeCount < 40) {
      log.warn(`Expected at least 40 business types, found ${typeCount}`);
    }

    await connection.end();
    return true;
  } catch (error) {
    log.error(`Failed to verify schema: ${error.message}`);
    return false;
  }
}

/**
 * Output database connection info
 */
function outputConnectionInfo() {
  log.section('Database Connection Information');
  
  console.log(`
  Host:     ${process.env.DB_HOST || 'localhost'}
  Port:     ${process.env.DB_PORT || 3306}
  Database: ${process.env.DB_NAME || 'beam_individuals'}
  User:     ${process.env.DB_USER || 'root'}
  
  Connection String:
  mysql://${process.env.DB_USER || 'root'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'beam_individuals'}
  `);
}

/**
 * Main initialization
 */
async function main() {
  log.section('BEAM for Individuals - Database Initialization');

  // Step 1: Create database
  log.info('Step 1: Creating database...');
  if (!(await createDatabase())) {
    log.error('Failed to create database');
    process.exit(1);
  }

  // Step 2: Run migrations
  log.info('Step 2: Running migrations...');
  if (!runMigrations()) {
    log.error('Failed to run migrations');
    process.exit(1);
  }

  // Step 3: Verify schema
  log.info('Step 3: Verifying schema...');
  if (!(await verifySchema())) {
    log.warn('Schema verification found issues');
  }

  // Step 4: Output connection info
  outputConnectionInfo();

  log.section('Database Initialization Complete');
  log.success('BEAM for Individuals database is ready!');
  
  process.exit(0);
}

// Run initialization
main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
