# BEAM for Individuals - Database Migrations

This directory contains all database migration scripts for BEAM for Individuals.

## Overview

Migrations are SQL scripts that set up and evolve the database schema. They are executed in order and tracked in the `migrations` table to prevent re-execution.

## Migration Files

### 001_create_initial_schema.sql

Creates all core tables for BEAM for Individuals:

**Core Tables:**
- `users` - User accounts
- `auth_tokens` - Authentication tokens and verification codes
- `sessions` - Active user sessions
- `websites` - User websites/businesses
- `threat_assessments` - Threat assessments for websites
- `competitors` - Discovered competitors
- `keywords` - AI search keywords
- `recommended_actions` - Recommended actions for websites
- `beam_reports` - Monthly BEAM reports
- `subscriptions` - User subscriptions
- `competitor_discovery_jobs` - V4 multi-agent discovery jobs
- `audit_logs` - Audit trail of all user actions
- `business_types` - Business type taxonomy reference data

**Features:**
- Proper indexes for performance
- Foreign key constraints for data integrity
- Views for common queries
- Stored procedures for complex operations
- UTF-8 encoding for international support
- Audit trail for compliance

### 002_insert_taxonomy_data.sql

Populates the `business_types` table with 50+ business types organized by category:

**Categories:**
- Personal Care (5 types) - Hair Salon, Nail Spa, Barber Shop, Spa & Massage, Tattoo & Piercing
- Fitness & Wellness (3 types) - Gym, Yoga Studio, Pilates Studio
- Health & Medical (3 types) - Dental Office, Medical Clinic, Veterinary Clinic
- Home Services (5 types) - House Cleaning, Plumbing, Electrical, HVAC, Landscaping
- Food & Beverage (4 types) - Restaurant, Cafe, Bakery, Fast Food
- Retail & Shopping (4 types) - Clothing Boutique, Jewelry Store, Pet Store, Bookstore
- Professional Services (4 types) - Accounting, Legal, Real Estate, Consulting
- Education & Training (3 types) - Tutoring, Music School, Dance Studio
- Automotive (3 types) - Auto Repair, Car Wash, Tire Shop
- Entertainment & Recreation (3 types) - Movie Theater, Bowling Alley, Game Arcade
- Special Services (4 types) - Photography, Event Planning, Daycare, Pet Grooming

Each business type includes:
- Description
- Associated keywords
- Typical competitors
- Recommended action plan
- Pricing tier

## Running Migrations

### Prerequisites

1. **Database Created**: Ensure the database exists
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS beam_individuals;"
   ```

2. **Environment Variables**: Set up `.env` file with database credentials
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Dependencies Installed**: Install Node.js dependencies
   ```bash
   npm install
   ```

### Execution

Run all pending migrations:

```bash
node migrations/run-migrations.js
```

The script will:
1. Connect to the database
2. Check which migrations have already been executed
3. Execute only pending migrations in order
4. Track executed migrations in the `migrations` table

### Manual Execution

If you prefer to run migrations manually:

```bash
# Run first migration
mysql -u root -p beam_individuals < migrations/001_create_initial_schema.sql

# Run second migration
mysql -u root -p beam_individuals < migrations/002_insert_taxonomy_data.sql
```

## Database Schema

### Users Table
```sql
users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  owner_name VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
)
```

### Websites Table
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
  deleted_at TIMESTAMP
)
```

### Competitors Table
```sql
competitors (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  competitor_name VARCHAR(255),
  competitor_url VARCHAR(500),
  threat_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  threat_score INT,
  discovery_method ENUM('v4_multi_agent', 'manual', 'import'),
  confidence INT,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
)
```

### Threat Assessments Table
```sql
threat_assessments (
  id VARCHAR(36) PRIMARY KEY,
  website_id VARCHAR(36) FOREIGN KEY,
  threat_level ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
  threat_score INT,
  competitor_count INT,
  market_saturation ENUM('very_high', 'high', 'medium', 'low', 'very_low'),
  assessed_at TIMESTAMP
)
```

### Subscriptions Table
```sql
subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) FOREIGN KEY UNIQUE,
  status ENUM('active', 'canceled', 'expired', 'pending'),
  plan VARCHAR(50),
  price DECIMAL(10,2),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP,
  renewal_date TIMESTAMP,
  canceled_at TIMESTAMP
)
```

## Key Features

### Indexes
- Composite indexes on frequently queried columns
- Indexes on foreign keys for join performance
- Indexes on status and date columns for filtering

### Views
- `user_website_summary` - Website summary with threat and competitor counts
- `website_threat_summary` - Threat data with days since assessment

### Stored Procedures
- `sp_get_user_dashboard` - Get user dashboard statistics
- `sp_get_threat_trend` - Get threat trend over time

### Constraints
- Foreign key constraints for data integrity
- Unique constraints on email and subscriptions
- Check constraints on enums

### Soft Deletes
- `deleted_at` column for soft deletes
- Queries filter out soft-deleted records
- Maintains audit trail

## Data Retention

- User data: Retained indefinitely (unless deleted)
- Website data: Retained indefinitely (unless deleted)
- Threat assessments: Retained for 12 months (configurable)
- Reports: Retained for 12 months (configurable)
- Audit logs: Retained for 12 months (configurable)

## Backup & Recovery

### Backup Database
```bash
mysqldump -u root -p beam_individuals > beam_individuals_backup.sql
```

### Restore Database
```bash
mysql -u root -p beam_individuals < beam_individuals_backup.sql
```

## Troubleshooting

### Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
- Ensure MySQL server is running
- Check database credentials in `.env`
- Verify database host and port

### Table Already Exists
```
Error: Table 'users' already exists
```
- This is expected if migrations have already run
- The script skips already-executed migrations
- Check `migrations` table to see execution history

### Permission Denied
```
Error: Access denied for user 'root'@'localhost'
```
- Verify MySQL user has correct permissions
- Run: `GRANT ALL PRIVILEGES ON beam_individuals.* TO 'root'@'localhost';`

## Future Migrations

To add new migrations:

1. Create a new file: `migrations/003_add_new_feature.sql`
2. Follow the naming convention: `NNN_description.sql`
3. Include comments explaining changes
4. Run the migration runner to execute

Example:
```sql
-- ============================================================================
-- BEAM for Individuals - Add New Feature
-- ============================================================================

ALTER TABLE websites ADD COLUMN new_field VARCHAR(255);

INSERT INTO migrations (migration_name) VALUES ('003_add_new_feature');
```

## References

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Database Design Best Practices](https://en.wikipedia.org/wiki/Database_design)
- [SQL Migrations Guide](https://en.wikipedia.org/wiki/Schema_migration)
