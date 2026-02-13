# BEAM for Individuals - Testing Guide

Comprehensive testing guide for BEAM for Individuals API and services.

## Table of Contents

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [API Tests](#api-tests)
4. [Manual Testing](#manual-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)

## Unit Tests

### Database Module Tests

```bash
npm test -- database.test.js
```

**Test Cases:**
- Connection pool initialization
- Query execution
- Error handling
- Health checks
- Transaction support

### Email Service Tests

```bash
npm test -- emailService.test.js
```

**Test Cases:**
- Transporter initialization
- Verification code email
- Monthly report email
- Password reset email
- Welcome email
- Configuration testing

### Payment Service Tests

```bash
npm test -- paymentService.test.js
```

**Test Cases:**
- Customer creation
- Subscription creation
- Subscription retrieval
- Subscription cancellation
- Webhook verification
- Status checking

### Competitor Discovery Tests

```bash
npm test -- competitorDiscoveryService.test.js
```

**Test Cases:**
- Business context extraction
- Research agent execution
- Supervisor validation
- Threat calculation
- Database storage

### Threat Scoring Tests

```bash
npm test -- threatScoringService.test.js
```

**Test Cases:**
- Threat score calculation
- Threat level determination
- Market saturation assessment
- AI visibility estimation
- Recommendation generation

## Integration Tests

### End-to-End Authentication Flow

```bash
npm test -- auth.integration.test.js
```

**Test Scenario:**
1. Request verification code
2. Verify code
3. Complete signup
4. Create session
5. Verify session
6. Logout

### Website Management Flow

```bash
npm test -- websites.integration.test.js
```

**Test Scenario:**
1. Create website
2. Retrieve website
3. Update website
4. List websites
5. Delete website

### Competitor Discovery Flow

```bash
npm test -- competitorDiscovery.integration.test.js
```

**Test Scenario:**
1. Trigger competitor discovery
2. Monitor discovery progress
3. Retrieve competitors
4. Verify threat scores
5. Confirm competitor data

### Threat Assessment Flow

```bash
npm test -- threatAssessment.integration.test.js
```

**Test Scenario:**
1. Calculate threat score
2. Store assessment
3. Retrieve assessment
4. Get threat history
5. Generate recommendations

### Payment Flow

```bash
npm test -- payment.integration.test.js
```

**Test Scenario:**
1. Create Stripe customer
2. Create subscription
3. Verify subscription
4. Handle webhook
5. Cancel subscription

## API Tests

### Authentication Endpoints

```bash
# Request verification code
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify code
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# Complete signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"owner_name":"John Doe"}'

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Website Endpoints

```bash
# Create website
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{
    "business_name":"My Business",
    "business_type":"Hair Salon",
    "location":"New York, NY",
    "website_url":"https://mybusiness.com"
  }'

# List websites
curl http://localhost:3000/api/websites \
  -H "Authorization: Bearer SESSION_TOKEN"

# Get website
curl http://localhost:3000/api/websites/WEBSITE_ID \
  -H "Authorization: Bearer SESSION_TOKEN"

# Update website
curl -X PUT http://localhost:3000/api/websites/WEBSITE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"business_name":"Updated Name"}'

# Delete website
curl -X DELETE http://localhost:3000/api/websites/WEBSITE_ID \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Competitor Endpoints

```bash
# Discover competitors
curl -X POST http://localhost:3000/api/websites/WEBSITE_ID/discover-competitors \
  -H "Authorization: Bearer SESSION_TOKEN"

# List competitors
curl http://localhost:3000/api/websites/WEBSITE_ID/competitors \
  -H "Authorization: Bearer SESSION_TOKEN"

# Get competitor details
curl http://localhost:3000/api/websites/WEBSITE_ID/competitors/COMPETITOR_ID \
  -H "Authorization: Bearer SESSION_TOKEN"

# Delete competitor
curl -X DELETE http://localhost:3000/api/websites/WEBSITE_ID/competitors/COMPETITOR_ID \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Threat Endpoints

```bash
# Get current threat
curl http://localhost:3000/api/websites/WEBSITE_ID/threat \
  -H "Authorization: Bearer SESSION_TOKEN"

# Get threat history
curl http://localhost:3000/api/websites/WEBSITE_ID/threat-history?months=12 \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Keyword Endpoints

```bash
# Get keywords
curl http://localhost:3000/api/websites/WEBSITE_ID/keywords \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Report Endpoints

```bash
# Get latest report
curl http://localhost:3000/api/websites/WEBSITE_ID/reports/latest \
  -H "Authorization: Bearer SESSION_TOKEN"

# Get report history
curl http://localhost:3000/api/websites/WEBSITE_ID/reports/history \
  -H "Authorization: Bearer SESSION_TOKEN"
```

### Subscription Endpoints

```bash
# Get subscription
curl http://localhost:3000/api/subscription \
  -H "Authorization: Bearer SESSION_TOKEN"

# Cancel subscription
curl -X POST http://localhost:3000/api/subscription/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"reason":"Too expensive"}'
```

### Business Types Endpoints

```bash
# List all business types
curl http://localhost:3000/api/business-types

# Get by category
curl http://localhost:3000/api/business-types/category/Personal%20Care
```

## Manual Testing

### Test User Accounts

Create test accounts for different scenarios:

```javascript
// Test Account 1: Hair Salon
{
  email: 'salon@test.com',
  owner_name: 'John Salon',
  business_type: 'Hair Salon',
  location: 'New York, NY'
}

// Test Account 2: Gym
{
  email: 'gym@test.com',
  owner_name: 'Jane Gym',
  business_type: 'Gym & Fitness Center',
  location: 'Los Angeles, CA'
}

// Test Account 3: Restaurant
{
  email: 'restaurant@test.com',
  owner_name: 'Bob Restaurant',
  business_type: 'Restaurant',
  location: 'Chicago, IL'
}
```

### Manual Test Checklist

- [ ] User can request verification code
- [ ] Verification code email arrives
- [ ] User can verify code
- [ ] User can complete signup
- [ ] User can add website
- [ ] Competitor discovery starts
- [ ] Competitors appear in dashboard
- [ ] Threat score is calculated
- [ ] Keywords are generated
- [ ] Recommended actions appear
- [ ] User can update website
- [ ] User can delete website
- [ ] User can view threat history
- [ ] User can view competitor details
- [ ] User can create subscription
- [ ] Monthly report is generated
- [ ] Monthly report email is sent
- [ ] User can cancel subscription
- [ ] User can logout

## Performance Testing

### Load Testing

```bash
npm run test:load
```

**Load Test Scenarios:**
- 100 concurrent users
- 1000 requests per second
- 5-minute duration
- Monitor response times and errors

### Stress Testing

```bash
npm run test:stress
```

**Stress Test Scenarios:**
- Gradually increase load to failure
- Monitor database connections
- Monitor memory usage
- Monitor CPU usage

### Benchmark Tests

```bash
npm run test:benchmark
```

**Benchmark Scenarios:**
- Database query performance
- API response times
- Email sending speed
- Competitor discovery time

## Security Testing

### Authentication Security

```bash
# Test missing authorization header
curl http://localhost:3000/api/websites
# Expected: 401 Unauthorized

# Test invalid session token
curl http://localhost:3000/api/websites \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized

# Test expired session
curl http://localhost:3000/api/websites \
  -H "Authorization: Bearer expired_token"
# Expected: 401 Unauthorized
```

### Rate Limiting

```bash
# Test auth rate limiting (5 req/min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/request-code \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
# Expected: 6th request returns 429 Too Many Requests

# Test general rate limiting (100 req/min)
for i in {1..101}; do
  curl http://localhost:3000/api/business-types &
done
# Expected: 101st request returns 429 Too Many Requests
```

### Input Validation

```bash
# Test missing required fields
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"business_name":"Test"}'
# Expected: 400 Bad Request

# Test invalid email format
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email"}'
# Expected: 400 Bad Request

# Test SQL injection attempt
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"business_name":"Test\"; DROP TABLE users; --"}'
# Expected: 400 Bad Request (sanitized)
```

### CORS Testing

```bash
# Test CORS headers
curl -i -X OPTIONS http://localhost:3000/api/websites \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: 200 OK with CORS headers
```

### Data Privacy

```bash
# Test user cannot access other user's data
curl http://localhost:3000/api/websites/OTHER_USER_WEBSITE_ID \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
# Expected: 403 Forbidden
```

## Test Data Cleanup

```bash
# Delete test user
mysql -u root -p beam_individuals -e "
DELETE FROM users WHERE email LIKE 'test%@example.com';
"

# Reset sequences
mysql -u root -p beam_individuals -e "
ALTER TABLE users AUTO_INCREMENT = 1;
"
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:integration
```

## Test Coverage

Target coverage:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Check coverage:
```bash
npm run test:coverage
```

## Troubleshooting Tests

### Database Connection Error
```bash
# Ensure MySQL is running
mysql -u root -p -e "SELECT 1;"

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'beam_individuals';"
```

### Email Service Error
```bash
# Test email configuration
node -e "
const emailService = require('./services/emailService');
emailService.initializeTransporter();
emailService.testConfiguration();
"
```

### Stripe Error
```bash
# Verify Stripe keys
echo $STRIPE_SECRET_KEY
echo $STRIPE_PUBLISHABLE_KEY

# Test Stripe connection
node -e "
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.customers.list({limit: 1}).then(() => console.log('✓ Connected'));
"
```

## Test Reporting

Generate test reports:
```bash
npm test -- --reporter=html
npm test -- --reporter=json > test-results.json
npm run test:coverage -- --reporter=html
```

Reports are saved to:
- `coverage/` - Code coverage
- `test-results.html` - Test results
- `test-results.json` - JSON results

---

**All tests should pass before deployment to production.**
