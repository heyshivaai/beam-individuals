# BEAM for Individuals - Database Migration Guide

This guide walks you through setting up the BEAM for Individuals database from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Database Schema Overview](#database-schema-overview)
4. [Migration Files](#migration-files)
5. [Running Migrations](#running-migrations)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Data Management](#data-management)

## Prerequisites

### Required Software

1. **MySQL Server** (5.7+ or 8.0+)
   - Download: https://dev.mysql.com/downloads/mysql/
   - Verify: `mysql --version`

2. **Node.js** (14+ or 16+)
   - Download: https://nodejs.org/
   - Verify: `node --version`

3. **npm** (6+ or 7+)
   - Included with Node.js
   - Verify: `npm --version`

### Environment Setup

1. **Start MySQL Server**
   ```bash
   # macOS (Homebrew)
   brew services start mysql
   
   # Linux (Ubuntu)
   sudo service mysql start
   
   # Windows
   # Use MySQL Installer or start from Services
   ```

2. **Verify MySQL Connection**
   ```bash
   mysql -u root -p
   # Enter password (empty by default)
   # Type: exit
   ```

3. **Install Node Dependencies**
   ```bash
   cd /path/to/beam-brain-bank/server
   npm install
   ```

4. **Create .env File**
   ```bash
   cp .env.example .env
   ```

5. **Edit .env with Database Credentials**
   ```bash
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=beam_individuals
   ```

## Quick Start

Run the complete database initialization in one command:

```bash
cd /path/to/beam-brain-bank/server
node db-init.js
```

This will:
1. ✅ Create the database
2. ✅ Run all migrations
3. ✅ Verify the schema
4. ✅ Output connection information

**Expected Output:**
```
ℹ BEAM for Individuals - Database Initialization
ℹ Step 1: Creating database...
✓ Database created or already exists: beam_individuals
ℹ Step 2: Running migrations...
✓ Migration completed: 001_create_initial_schema
✓ Migration completed: 002_insert_taxonomy_data
ℹ Step 3: Verifying schema...
✓ Found 14 tables:
  ✓ users
  ✓ auth_tokens
  ✓ sessions
  ✓ websites
  ✓ threat_assessments
  ✓ competitors
  ✓ keywords
  ✓ recommended_actions
  ✓ beam_reports
  ✓ subscriptions
  ✓ competitor_discovery_jobs
  ✓ audit_logs
  ✓ business_types
  ✓ migrations

✓ Business types populated: 50 types

Database Connection Information:
  Host:     localhost
  Port:     3306
  Database: beam_individuals
  User:     root
  
✓ BEAM for Individuals database is ready!
```

## Database Schema Overview

### Core Tables

#### Users Table
Stores user account information.

```sql
users (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  email VARCHAR(255) UNIQUE,             -- User email
  owner_name VARCHAR(255),               -- Business owner name
  created_at TIMESTAMP,                  -- Account creation
  updated_at TIMESTAMP,                  -- Last update
  deleted_at TIMESTAMP NULL              -- Soft delete
)
```

**Relationships:**
- One user has many websites
- One user has one subscription
- One user has many sessions
- One user has many auth tokens

#### Websites Table
Stores user websites/businesses.

```sql
websites (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  location VARCHAR(255),
  website_url VARCHAR(500),
  status ENUM('analyzing', 'active', 'paused', 'error'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP NULL
)
```

**Relationships:**
- One website has many threat assessments
- One website has many competitors
- One website has many keywords
- One website has many recommended actions
- One website has many BEAM reports
- One website has many discovery jobs

#### Threat Assessments Table
Stores threat level assessments for websites.

```sql
threat_assessments (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  threat_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  threat_score INT (0-100),
  competitor_count INT,
  average_competitor_score INT,
  market_saturation ENUM('very_high', 'high', 'medium', 'low', 'very_low'),
  ai_search_visibility ENUM('very_high', 'high', 'medium', 'low', 'very_low'),
  assessed_at TIMESTAMP
)
```

**Key Features:**
- One assessment per website per day (unique constraint)
- Tracks threat trends over time
- Includes market saturation and AI visibility

#### Competitors Table
Stores discovered competitors.

```sql
competitors (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  competitor_name VARCHAR(255),
  competitor_url VARCHAR(500),
  threat_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  threat_score INT (0-100),
  discovery_method ENUM('v4_multi_agent', 'manual', 'import'),
  confidence INT (0-100),
  ai_search_visibility INT,
  google_reviews_count INT,
  google_rating DECIMAL(3,2),
  discovered_at TIMESTAMP,
  deleted_at TIMESTAMP NULL
)
```

**Key Features:**
- Tracks discovery method (V4 multi-agent, manual, or import)
- Includes confidence scores
- Stores social media presence as JSON
- Soft deletes for audit trail

#### Keywords Table
Stores AI search keywords for websites.

```sql
keywords (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  keyword VARCHAR(255),
  relevance_score INT (0-100),
  source ENUM('website_content', 'competitor_analysis', 'business_type', 'ai_generated'),
  search_volume INT,
  difficulty INT (0-100),
  competitor_ranking_count INT,
  discovered_at TIMESTAMP
)
```

**Key Features:**
- Tracks keyword source
- Includes search volume and difficulty
- Shows how many competitors rank for each keyword

#### Subscriptions Table
Stores user subscription information.

```sql
subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY UNIQUE,
  status ENUM('active', 'canceled', 'expired', 'pending'),
  plan VARCHAR(50),
  price DECIMAL(10,2),
  currency VARCHAR(3),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP,
  renewal_date TIMESTAMP,
  canceled_at TIMESTAMP NULL
)
```

**Key Features:**
- One subscription per user
- Stripe integration
- Tracks renewal dates
- Stores cancellation reasons

#### Business Types Table
Taxonomy reference data for business types.

```sql
business_types (
  id VARCHAR(36) PRIMARY KEY,
  category VARCHAR(100),
  type_name VARCHAR(255),
  description TEXT,
  keywords JSON,
  typical_competitors JSON,
  action_plan JSON,
  pricing_tier VARCHAR(50)
)
```

**Key Features:**
- 50+ pre-populated business types
- Organized by category
- Includes recommended action plans
- Stores keywords and typical competitors as JSON

### Supporting Tables

#### Auth Tokens Table
Stores authentication tokens and verification codes.

```sql
auth_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY,
  email VARCHAR(255),
  token_type ENUM('verification_code', 'device_token', 'session_token'),
  token_value VARCHAR(255),
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at TIMESTAMP
)
```

#### Sessions Table
Stores active user sessions.

```sql
sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY,
  session_token VARCHAR(500) UNIQUE,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  expires_at TIMESTAMP,
  last_activity_at TIMESTAMP
)
```

#### Recommended Actions Table
Stores recommended actions for websites.

```sql
recommended_actions (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  action_title VARCHAR(255),
  action_description TEXT,
  priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  category VARCHAR(100),
  estimated_impact ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  estimated_effort ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  completed BOOLEAN,
  completed_at TIMESTAMP NULL
)
```

#### BEAM Reports Table
Stores monthly BEAM reports.

```sql
beam_reports (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  report_month DATE,
  threat_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  threat_score INT,
  competitor_count INT,
  top_competitors JSON,
  top_keywords JSON,
  recommendations JSON,
  report_content LONGTEXT,
  generated_at TIMESTAMP,
  email_sent_at TIMESTAMP NULL,
  email_status ENUM('pending', 'sent', 'failed')
)
```

**Key Features:**
- One report per website per month (unique constraint)
- Stores full HTML report content
- Tracks email delivery status
- Stores top competitors and keywords as JSON

#### Competitor Discovery Jobs Table
Tracks V4 multi-agent discovery jobs.

```sql
competitor_discovery_jobs (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  status ENUM('pending', 'in_progress', 'completed', 'failed'),
  discovery_method VARCHAR(50),
  research_agent_1_result JSON,
  research_agent_2_result JSON,
  research_agent_3_result JSON,
  supervisor_result JSON,
  competitors_found INT,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP NULL
)
```

#### Audit Logs Table
Stores audit trail of all user actions.

```sql
audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY,
  action VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id VARCHAR(36),
  changes JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP
)
```

### Views

#### user_website_summary
Provides summary of user's websites with threat and competitor data.

```sql
SELECT 
  w.id, w.user_id, w.business_name, w.business_type, w.location,
  ta.threat_level, ta.threat_score,
  COUNT(DISTINCT c.id) as competitor_count,
  COUNT(DISTINCT k.id) as keyword_count,
  MAX(ta.assessed_at) as last_assessed
FROM websites w
LEFT JOIN threat_assessments ta ON w.id = ta.website_id
LEFT JOIN competitors c ON w.id = c.website_id
LEFT JOIN keywords k ON w.id = k.website_id
WHERE w.deleted_at IS NULL
GROUP BY w.id, ...
```

#### website_threat_summary
Provides threat assessment summary with days since assessment.

```sql
SELECT 
  w.id, w.business_name,
  ta.threat_level, ta.threat_score, ta.competitor_count,
  DATEDIFF(CURDATE(), DATE(ta.assessed_at)) as days_since_assessment
FROM websites w
LEFT JOIN threat_assessments ta ON w.id = ta.website_id
WHERE w.deleted_at IS NULL
ORDER BY ta.assessed_at DESC
```

### Stored Procedures

#### sp_get_user_dashboard
Returns dashboard statistics for a user.

```sql
CALL sp_get_user_dashboard('user-id');
-- Returns: total_websites, active_websites, total_competitors, 
--          average_threat_score, critical_websites, high_threat_websites
```

#### sp_get_threat_trend
Returns threat trend over time for a website.

```sql
CALL sp_get_threat_trend('website-id', 12);
-- Returns: month, threat_level, threat_score, competitor_count, 
--          average_competitor_score for last 12 months
```

## Migration Files

### 001_create_initial_schema.sql

**Size:** ~2,500 lines
**Execution Time:** ~5 seconds

**Creates:**
- 14 core tables with proper indexes
- 2 views for common queries
- 2 stored procedures
- Migration tracking table

**Key Features:**
- UTF-8 encoding for international support
- Foreign key constraints for data integrity
- Composite indexes for performance
- Soft deletes for audit trail
- Proper timestamp handling

### 002_insert_taxonomy_data.sql

**Size:** ~800 lines
**Execution Time:** ~2 seconds

**Populates:**
- 50+ business types across 11 categories
- Keywords for each business type
- Typical competitors for each type
- Recommended action plans
- Pricing tier information

**Categories:**
1. Personal Care (5 types)
2. Fitness & Wellness (3 types)
3. Health & Medical (3 types)
4. Home Services (5 types)
5. Food & Beverage (4 types)
6. Retail & Shopping (4 types)
7. Professional Services (4 types)
8. Education & Training (3 types)
9. Automotive (3 types)
10. Entertainment & Recreation (3 types)
11. Special Services (4 types)

## Running Migrations

### Automatic (Recommended)

```bash
cd /path/to/beam-brain-bank/server
node db-init.js
```

This runs the complete initialization process.

### Manual Migration Execution

```bash
# Run migration runner
node migrations/run-migrations.js
```

The runner will:
1. Connect to the database
2. Check which migrations have been executed
3. Run only pending migrations
4. Track execution in the migrations table

### Direct SQL Execution

```bash
# Run first migration
mysql -u root -p beam_individuals < migrations/001_create_initial_schema.sql

# Run second migration
mysql -u root -p beam_individuals < migrations/002_insert_taxonomy_data.sql
```

## Verification

### Check Database Creation

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'beam_individuals';"
```

Expected output:
```
+----------------------+
| Database             |
+----------------------+
| beam_individuals     |
+----------------------+
```

### Check Tables

```bash
mysql -u root -p beam_individuals -e "SHOW TABLES;"
```

Expected output:
```
+-----------------------------------+
| Tables_in_beam_individuals        |
+-----------------------------------+
| audit_logs                        |
| auth_tokens                       |
| beam_reports                      |
| business_types                    |
| competitor_discovery_jobs         |
| competitors                       |
| keywords                          |
| migrations                        |
| recommended_actions               |
| sessions                          |
| subscriptions                     |
| threat_assessments                |
| users                             |
| websites                          |
+-----------------------------------+
```

### Check Business Types

```bash
mysql -u root -p beam_individuals -e "SELECT COUNT(*) as count FROM business_types;"
```

Expected output:
```
+-------+
| count |
+-------+
|    50 |
+-------+
```

### Check Migration History

```bash
mysql -u root -p beam_individuals -e "SELECT * FROM migrations;"
```

Expected output:
```
+----+----------------------------+---------------------+
| id | migration_name             | executed_at         |
+----+----------------------------+---------------------+
|  1 | 001_create_initial_schema  | 2026-02-13 10:00:00 |
|  2 | 002_insert_taxonomy_data   | 2026-02-13 10:00:05 |
+----+----------------------------+---------------------+
```

### Verify Schema Integrity

```bash
mysql -u root -p beam_individuals -e "
SELECT 
  TABLE_NAME,
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'beam_individuals' AND TABLE_NAME = t.TABLE_NAME) as column_count,
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'beam_individuals' AND TABLE_NAME = t.TABLE_NAME) as index_count
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_SCHEMA = 'beam_individuals'
ORDER BY TABLE_NAME;
"
```

## Troubleshooting

### Issue: "Access denied for user 'root'@'localhost'"

**Solution:**
```bash
# Check MySQL is running
mysql -u root

# If password required, use:
mysql -u root -p

# Reset root password (MySQL 5.7+)
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';"
```

### Issue: "Can't connect to MySQL server on 'localhost'"

**Solution:**
```bash
# Check if MySQL is running
# macOS
brew services list | grep mysql

# Linux
sudo service mysql status

# Start MySQL
# macOS
brew services start mysql

# Linux
sudo service mysql start
```

### Issue: "Database 'beam_individuals' doesn't exist"

**Solution:**
```bash
# Create database manually
mysql -u root -p -e "CREATE DATABASE beam_individuals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
node migrations/run-migrations.js
```

### Issue: "Table 'users' already exists"

**Solution:**
This is expected if migrations have already run. The script skips already-executed migrations.

```bash
# Check migration history
mysql -u root -p beam_individuals -e "SELECT * FROM migrations;"

# If you want to reset (WARNING: deletes all data)
mysql -u root -p -e "DROP DATABASE beam_individuals;"
node db-init.js
```

### Issue: "Out of memory" during migration

**Solution:**
```bash
# Increase MySQL max_allowed_packet
mysql -u root -p -e "SET GLOBAL max_allowed_packet=67108864;"

# Or edit my.cnf
[mysqld]
max_allowed_packet=67M
```

### Issue: "Syntax error in SQL statement"

**Solution:**
- Check .env file has correct database credentials
- Ensure MySQL version is 5.7+ or 8.0+
- Check for special characters in password (escape if needed)

## Data Management

### Backup Database

```bash
# Full backup
mysqldump -u root -p beam_individuals > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup specific table
mysqldump -u root -p beam_individuals users > users_backup.sql

# Backup with structure only
mysqldump -u root -p --no-data beam_individuals > schema_backup.sql
```

### Restore Database

```bash
# Full restore
mysql -u root -p beam_individuals < backup_20260213_100000.sql

# Restore specific table
mysql -u root -p beam_individuals < users_backup.sql
```

### Export Data

```bash
# Export as CSV
mysql -u root -p beam_individuals -e "SELECT * FROM users;" > users.csv

# Export with headers
mysql -u root -p beam_individuals -e "SELECT * FROM users \G" > users.txt
```

### Delete User Data (GDPR)

```bash
-- Soft delete (keeps audit trail)
UPDATE users SET deleted_at = NOW() WHERE id = 'user-id';

-- Hard delete (removes all data)
DELETE FROM users WHERE id = 'user-id';
-- Cascading deletes will remove all related records
```

## Performance Optimization

### Add Indexes for Queries

```sql
-- Add index for common queries
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_website_user ON websites(user_id, created_at);
CREATE INDEX idx_competitor_threat ON competitors(website_id, threat_score);

-- Check index usage
ANALYZE TABLE users;
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

### Monitor Database Size

```bash
# Check database size
mysql -u root -p -e "
SELECT 
  table_schema,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables
WHERE table_schema = 'beam_individuals'
GROUP BY table_schema;
"
```

### Optimize Tables

```bash
# Optimize all tables
mysql -u root -p beam_individuals -e "OPTIMIZE TABLE users, websites, competitors, keywords, threat_assessments;"
```

## Next Steps

After database setup:

1. **Configure API Server** - Update `server/index.js` with database connection
2. **Connect Frontend** - Update BEAM app to use API endpoints
3. **Add V4 Integration** - Connect competitor discovery system
4. **Implement Email Service** - Set up verification codes and reports
5. **Add Payment Processing** - Integrate Stripe for subscriptions
6. **Deploy to Production** - Set up production database and backups

## References

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Database Design Best Practices](https://en.wikipedia.org/wiki/Database_design)
- [SQL Migration Strategies](https://en.wikipedia.org/wiki/Schema_migration)
- [GDPR Data Retention](https://gdpr-info.eu/)
