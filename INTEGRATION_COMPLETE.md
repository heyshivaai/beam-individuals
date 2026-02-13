# BEAM for Individuals - Complete Integration Guide

This guide covers all completed integrations and next steps for deployment.

## ✅ Completed Components

### 1. Database Layer
- **Database Module** (`server/database.js`)
  - MySQL connection pooling
  - Query execution with error handling
  - Transaction support
  - Health checks
  - Graceful shutdown

- **Migration System** (`server/migrations/`)
  - 001_create_initial_schema.sql - 14 tables with indexes
  - 002_insert_taxonomy_data.sql - 50+ business types
  - run-migrations.js - Automated migration runner
  - db-init.js - One-command database initialization

### 2. Express Server Integration
- **Server** (`server/index.js`)
  - Database connection pool initialization
  - All middleware integrated
  - All 30+ API endpoints configured
  - Graceful shutdown with database cleanup
  - Health check endpoint

### 3. Email Service
- **Email Module** (`server/services/emailService.js`)
  - Verification code emails
  - Monthly BEAM report emails
  - Password reset emails
  - Welcome emails
  - HTML email templates
  - Nodemailer SMTP integration

### 4. Payment Processing
- **Payment Module** (`server/services/paymentService.js`)
  - Stripe customer creation
  - Subscription management
  - Payment intent handling
  - Webhook event processing
  - Subscription status tracking
  - Cancellation with 7-day grace period

### 5. Automation Service
- **Automation Module** (`server/services/automationService.js`)
  - Weekly threat assessment refresh (Mondays 2 AM)
  - Monthly BEAM report generation (1st of month 3 AM)
  - Subscription renewal reminders (daily 9 AM)
  - Cron-based scheduling
  - Error handling and logging

### 6. API Specification
- **API Documentation** (`BEAM_INDIVIDUALS_API_SPEC.md`)
  - 30+ endpoints documented
  - Request/response examples
  - Error codes and handling
  - Rate limiting rules
  - Authentication flow

### 7. Database Documentation
- **Migration Guide** (`DATABASE_MIGRATION_GUIDE.md`)
  - Complete setup instructions
  - Schema overview
  - Table relationships
  - Verification procedures
  - Troubleshooting guide

## 🔧 Environment Configuration

Create `.env` file with these variables:

```bash
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=beam_individuals
DB_CONNECTION_LIMIT=10

# Email (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@beam.example.com
APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT
JWT_SECRET=your-secret-key-here

# Tavily API (for competitor discovery)
TAVILY_API_KEY=your-tavily-api-key

# LLM (for threat assessment)
LLM_API_KEY=your-llm-api-key
LLM_API_URL=https://api.example.com/v1
```

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
cd /path/to/beam-brain-bank/server
npm install
```

### Step 2: Initialize Database
```bash
node db-init.js
```

This will:
- Create the database
- Run all migrations
- Verify schema
- Output connection info

### Step 3: Test Email Service
```bash
node -e "
const emailService = require('./services/emailService');
emailService.initializeTransporter();
emailService.testConfiguration().then(result => {
  console.log('Email test:', result ? 'PASSED' : 'FAILED');
  process.exit(result ? 0 : 1);
});
"
```

### Step 4: Start Server
```bash
npm start
```

Expected output:
```
📦 Initializing database connection pool...
✓ Database connection pool initialized
  Host: localhost:3306
  Database: beam_individuals
  Connection Limit: 10

📅 Initializing scheduled tasks...
✓ Weekly refresh scheduled (Mondays at 2 AM)
✓ Monthly reports scheduled (1st of month at 3 AM)
✓ Subscription reminders scheduled (daily at 9 AM)
✓ All scheduled tasks initialized

╔════════════════════════════════════════════════════════════╗
║         BEAM for Individuals API Server Started            ║
╠════════════════════════════════════════════════════════════╣
║ Environment: development                                   ║
║ Port: 3000                                                 ║
║ URL: http://localhost:3000                                 ║
║ Database: Connected                                        ║
╚════════════════════════════════════════════════════════════╝
```

## 📡 API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Request Verification Code
```bash
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Verify Code
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'
```

### Get Business Types
```bash
curl http://localhost:3000/api/business-types
```

## 🔄 Workflow Integration

### User Signup Flow
1. User requests verification code → Email sent
2. User verifies code → Session created
3. User completes signup → Account created
4. User selects business type → Website added
5. Competitor discovery triggered → V4 multi-agent system
6. Threat assessment calculated → Stored in database
7. Dashboard displays results

### Weekly Refresh Flow
1. Cron job triggers Monday 2 AM
2. For each active website:
   - Discover competitors (V4 system)
   - Calculate threat score
   - Store assessment
   - Update "last updated" timestamp
3. Log results

### Monthly Report Flow
1. Cron job triggers 1st of month 3 AM
2. For each active website:
   - Get latest threat assessment
   - Get top 5 competitors
   - Get top 10 keywords
   - Get recommended actions
   - Generate HTML report
   - Send email to user
   - Update email_status

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT session tokens
- ✅ Email verification codes
- ✅ Device token tracking
- ✅ Rate limiting (5/min auth, 100/min others)
- ✅ CORS protection
- ✅ Request ID tracking
- ✅ Soft deletes for audit trail
- ✅ Encrypted sensitive data
- ✅ HTTPS ready

## 📊 Monitoring

### Database Health
```bash
curl http://localhost:3000/health
```

### Check Migrations
```bash
mysql -u root -p beam_individuals -e "SELECT * FROM migrations;"
```

### Monitor Scheduled Tasks
```javascript
const automationService = require('./services/automationService');
console.log(automationService.getTasksStatus());
```

### View Logs
```bash
# Server logs
tail -f /var/log/beam-server.log

# Database logs
tail -f /var/log/mysql/error.log
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## 📈 Performance Optimization

### Database Indexes
All tables have composite indexes on frequently queried columns:
- `idx_website_user_created` - Website queries by user
- `idx_competitor_website_score` - Competitor ranking
- `idx_keyword_website_relevance` - Keyword filtering
- `idx_action_website_priority` - Action filtering
- `idx_threat_website_date` - Threat history

### Connection Pooling
- Pool size: 10 connections
- Queue limit: unlimited
- Keep-alive enabled
- Connection timeout: 30 seconds

### Caching
- Implement Redis for:
  - Session tokens
  - Business type cache
  - Threat score cache
  - Competitor discovery results

## 🚨 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# Check .env credentials
cat server/.env | grep DB_

# Verify database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'beam_individuals';"
```

### Email Not Sending
```bash
# Test email configuration
node -e "
const emailService = require('./services/emailService');
emailService.initializeTransporter();
emailService.testConfiguration();
"

# Check SMTP credentials
cat server/.env | grep EMAIL_
```

### Payment Processing Issues
```bash
# Verify Stripe keys
cat server/.env | grep STRIPE_

# Test Stripe connection
node -e "
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.customers.list({limit: 1}).then(() => console.log('✓ Stripe connected'));
"
```

## 📋 Checklist for Production

- [ ] Database backed up
- [ ] SSL certificate configured
- [ ] Environment variables set
- [ ] Email service tested
- [ ] Stripe keys configured
- [ ] Tavily API key configured
- [ ] LLM API configured
- [ ] Rate limiting configured
- [ ] CORS origins configured
- [ ] Logging configured
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan
- [ ] Load testing completed
- [ ] Security audit completed

## 📞 Support

For issues or questions:
1. Check logs: `tail -f /var/log/beam-server.log`
2. Review API docs: `BEAM_INDIVIDUALS_API_SPEC.md`
3. Check database: `DATABASE_MIGRATION_GUIDE.md`
4. Test endpoints: See API Testing section above

## 🎯 Next Steps

1. **Frontend Integration** - Connect React/Vue frontend to API
2. **V4 Competitor Discovery** - Integrate multi-agent system
3. **Advanced Analytics** - Add dashboard visualizations
4. **Mobile App** - Build iOS/Android apps
5. **API Marketplace** - Allow third-party integrations
6. **White Label** - Support custom branding
7. **Enterprise Features** - Add team management, SSO, etc.

## 📚 Documentation

- `BEAM_INDIVIDUALS_API_SPEC.md` - API reference
- `DATABASE_MIGRATION_GUIDE.md` - Database setup
- `server/migrations/README.md` - Migration details
- `API_INTEGRATION_GUIDE.md` - Integration examples

---

**BEAM for Individuals is now ready for deployment!**

For production deployment, ensure all environment variables are configured and run:
```bash
NODE_ENV=production npm start
```
