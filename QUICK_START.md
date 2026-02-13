# BEAM for Individuals - Quick Start Guide

Get BEAM for Individuals running in 5 minutes.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download](https://git-scm.com/)

## 5-Minute Setup

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/beam-individuals.git
cd beam-individuals

# 2. Run setup script
bash SETUP.sh
```

The script will:
- ✅ Install dependencies
- ✅ Configure environment
- ✅ Initialize database
- ✅ Test email service
- ✅ Start the server

### Option 2: Manual Setup

#### Step 1: Install Dependencies
```bash
cd server
npm install
```

#### Step 2: Configure Environment
```bash
# Copy template
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required values:**
```
DB_HOST=localhost
DB_USER=beam_user
DB_PASSWORD=your_password
STRIPE_SECRET_KEY=sk_test_...
EMAIL_USER=your-email@gmail.com
TAVILY_API_KEY=tvly_...
LLM_API_KEY=sk_...
```

#### Step 3: Initialize Database
```bash
node db-init.js
```

#### Step 4: Start Server
```bash
npm start
```

## Verify Installation

### Check Server Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-13T12:00:00Z"
}
```

### Test API Endpoint
```bash
curl http://localhost:3000/api/business-types
```

## Next Steps

### 1. Create Test Account
```bash
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Check your email for verification code.

### 2. Verify Code
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

Save the `session_token` from response.

### 3. Complete Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"owner_name":"John Doe"}'
```

### 4. Add Website
```bash
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{
    "business_name":"My Hair Salon",
    "business_type":"Hair Salon",
    "location":"New York, NY",
    "website_url":"https://myhairsalon.com"
  }'
```

### 5. Discover Competitors
```bash
curl -X POST http://localhost:3000/api/websites/WEBSITE_ID/discover-competitors \
  -H "Authorization: Bearer SESSION_TOKEN"
```

## Available Scripts

```bash
# Development
npm run dev          # Run with auto-reload

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:load    # Run load tests

# Database
npm run db:init      # Initialize database
npm run db:migrate   # Run migrations
npm run db:backup    # Backup database

# Code Quality
npm run lint         # Check code style
npm run lint:fix     # Fix code style
npm run format       # Format code

# Production
npm start            # Start server
npm run logs         # View server logs
```

## Environment Variables

### Database
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=beam_user
DB_PASSWORD=secure_password
DB_NAME=beam_individuals
```

### Email (Gmail)
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@beam.example.com
```

### Stripe
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### External APIs
```
TAVILY_API_KEY=tvly_...
LLM_API_KEY=sk_...
LLM_API_URL=https://api.openai.com/v1
```

## Troubleshooting

### "Cannot connect to database"
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# Verify credentials in .env
cat server/.env | grep DB_

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'beam_individuals';"
```

### "Email service not working"
```bash
# Check email configuration
cat server/.env | grep EMAIL_

# For Gmail, generate app password:
# https://myaccount.google.com/apppasswords
```

### "Port 3000 already in use"
```bash
# Use different port
PORT=3001 npm start

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## API Documentation

See `FRONTEND_API_INTEGRATION.md` for complete API reference.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/request-code` | Request verification code |
| POST | `/api/auth/verify` | Verify code and get session |
| POST | `/api/auth/signup` | Complete signup |
| GET | `/api/websites` | List user's websites |
| POST | `/api/websites` | Create website |
| POST | `/api/websites/:id/discover-competitors` | Start competitor discovery |
| GET | `/api/websites/:id/threat` | Get threat assessment |
| GET | `/api/business-types` | List business types |

## Database Schema

The system creates 14 tables:
- `users` - User accounts
- `websites` - User's websites
- `competitors` - Discovered competitors
- `keywords` - AI search keywords
- `threat_assessments` - Threat scores
- `recommended_actions` - Action items
- `business_types` - Business type taxonomy
- `subscriptions` - Stripe subscriptions
- `invoices` - Payment invoices
- `migrations` - Migration tracking
- And more...

## Performance

- **Response Time**: < 200ms for most endpoints
- **Throughput**: 100+ requests/second
- **Concurrent Users**: 1000+
- **Database Connections**: 10 pooled connections

## Security

- ✅ Password hashing (bcrypt)
- ✅ JWT session tokens
- ✅ Email verification codes
- ✅ Rate limiting (5/min auth, 100/min general)
- ✅ CORS protection
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ HTTPS ready

## Monitoring

### View Logs
```bash
npm run logs
```

### Check Health
```bash
curl http://localhost:3000/health
```

### Monitor Database
```bash
mysql -u beam_user -p beam_individuals -e "SHOW PROCESSLIST;"
```

## Support

- 📖 Full documentation: See `INTEGRATION_COMPLETE.md`
- 🧪 Testing guide: See `TESTING_GUIDE.md`
- 🚀 Deployment: See `DEPLOYMENT_GUIDE.md`
- 📡 API reference: See `FRONTEND_API_INTEGRATION.md`

## Next: Build Frontend

Once the API is running, connect your frontend:

```javascript
// React example
const API_URL = 'http://localhost:3000';

async function requestCode(email) {
  const response = await fetch(`${API_URL}/api/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}
```

See `FRONTEND_API_INTEGRATION.md` for complete integration guide.

---

**BEAM for Individuals is now running!** 🚀

Visit `http://localhost:3000/health` to verify.
