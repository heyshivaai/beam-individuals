# BEAM for Individuals - End-to-End Testing Guide

Complete guide for testing the full BEAM system from signup to monthly reports.

## Table of Contents

1. [Setup](#setup)
2. [Authentication Flow](#authentication-flow)
3. [Website Management](#website-management)
4. [Competitor Discovery](#competitor-discovery)
5. [Threat Assessment](#threat-assessment)
6. [Payment Processing](#payment-processing)
7. [Automation Testing](#automation-testing)
8. [Performance Testing](#performance-testing)
9. [Security Testing](#security-testing)

## Setup

### Prerequisites
```bash
# Start server
cd server
npm start

# In another terminal, verify health
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

## Authentication Flow

### Test 1: Request Verification Code

```bash
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Verification code sent to email"
}
```

**Verify:** Check email for 6-digit code

### Test 2: Verify Code

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "code":"123456"
  }'
```

Expected response:
```json
{
  "success": true,
  "session_token": "eyJhbGc...",
  "expires_in": 86400
}
```

**Save:** Store `session_token` for next requests

### Test 3: Complete Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{"owner_name":"John Doe"}'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "owner_name": "John Doe",
    "created_at": "2026-02-13T12:00:00Z"
  }
}
```

### Test 4: Verify Session

```bash
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "owner_name": "John Doe"
  }
}
```

## Website Management

### Test 5: Create Website

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

Expected response:
```json
{
  "success": true,
  "website": {
    "id": "website-uuid",
    "business_name": "My Hair Salon",
    "business_type": "Hair Salon",
    "location": "New York, NY",
    "website_url": "https://myhairsalon.com",
    "status": "active",
    "created_at": "2026-02-13T12:00:00Z"
  }
}
```

**Save:** Store `website.id` for next tests

### Test 6: List Websites

```bash
curl http://localhost:3000/api/websites \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "websites": [
    {
      "id": "website-uuid",
      "business_name": "My Hair Salon",
      "threat_level": null,
      "threat_score": null,
      "competitor_count": 0,
      "created_at": "2026-02-13T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Test 7: Get Website Details

```bash
curl http://localhost:3000/api/websites/WEBSITE_ID \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "website": {
    "id": "website-uuid",
    "business_name": "My Hair Salon",
    "business_type": "Hair Salon",
    "location": "New York, NY",
    "website_url": "https://myhairsalon.com",
    "status": "active",
    "created_at": "2026-02-13T12:00:00Z"
  }
}
```

## Competitor Discovery

### Test 8: Start Competitor Discovery

```bash
curl -X POST http://localhost:3000/api/websites/WEBSITE_ID/discover-competitors \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "job_id": "discovery-job-uuid",
  "status": "in_progress",
  "message": "Competitor discovery started"
}
```

**Note:** Discovery takes 30-60 seconds. Poll the threat endpoint to check status.

### Test 9: Poll for Results

```bash
# Run every 5 seconds until threat_level is populated
curl http://localhost:3000/api/websites/WEBSITE_ID/threat \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response (in progress):
```json
{
  "success": true,
  "threat": null,
  "status": "discovering"
}
```

Expected response (complete):
```json
{
  "success": true,
  "threat": {
    "threat_level": "MEDIUM",
    "threat_score": 55,
    "competitor_count": 5,
    "average_competitor_score": 62,
    "market_saturation": "medium",
    "ai_search_visibility": "low",
    "assessed_at": "2026-02-13T12:05:00Z"
  }
}
```

### Test 10: List Competitors

```bash
curl http://localhost:3000/api/websites/WEBSITE_ID/competitors \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "competitors": [
    {
      "id": "competitor-uuid",
      "competitor_name": "Competitor Hair Salon",
      "competitor_url": "https://competitor.com",
      "threat_level": "HIGH",
      "threat_score": 75,
      "confidence": 95,
      "discovered_at": "2026-02-13T12:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

## Threat Assessment

### Test 11: Get Threat History

```bash
curl "http://localhost:3000/api/websites/WEBSITE_ID/threat-history?months=3" \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "history": [
    {
      "month": "2026-02",
      "threat_level": "MEDIUM",
      "threat_score": 55,
      "competitor_count": 5,
      "average_competitor_score": 62
    }
  ]
}
```

### Test 12: Get Keywords

```bash
curl http://localhost:3000/api/websites/WEBSITE_ID/keywords \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "keywords": [
    {
      "id": "keyword-uuid",
      "keyword": "hair salon near me",
      "relevance_score": 95,
      "search_volume": 1200,
      "difficulty": "medium"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

## Payment Processing

### Test 13: Create Subscription

```bash
curl -X POST http://localhost:3000/api/subscription/create \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "subscription_id": "sub-uuid",
  "client_secret": "pi_XXXXX_secret_XXXXX",
  "amount": 99.00,
  "currency": "USD",
  "plan": "annual"
}
```

### Test 14: Get Subscription

```bash
curl http://localhost:3000/api/subscription \
  -H "Authorization: Bearer SESSION_TOKEN"
```

Expected response (no subscription):
```json
{
  "success": true,
  "subscription": null,
  "status": "inactive"
}
```

Expected response (with subscription):
```json
{
  "success": true,
  "subscription": {
    "id": "sub-uuid",
    "status": "active",
    "plan": "annual",
    "price": 99.00,
    "currency": "USD",
    "renewal_date": "2027-02-13T12:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2026-02-13T12:00:00Z"
  },
  "invoices": []
}
```

### Test 15: Test Stripe Webhook

```bash
# Simulate Stripe webhook event
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=TIMESTAMP,v1=SIGNATURE" \
  -d '{
    "id": "evt_test_123",
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_123",
        "customer": "cus_123",
        "status": "active"
      }
    }
  }'
```

Expected response:
```json
{
  "received": true
}
```

## Automation Testing

### Test 16: Verify Weekly Refresh Schedule

```bash
# Check cron job configuration
cat server/.env | grep WEEKLY_REFRESH_SCHEDULE

# Expected: 0 2 * * 1 (Monday 2 AM UTC)
```

### Test 17: Verify Monthly Report Schedule

```bash
# Check cron job configuration
cat server/.env | grep MONTHLY_REPORT_SCHEDULE

# Expected: 0 3 1 * * (1st of month 3 AM UTC)
```

### Test 18: Manual Trigger Weekly Refresh

```bash
# Trigger refresh manually
curl -X POST http://localhost:3000/api/admin/trigger-weekly-refresh \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Test 19: Manual Trigger Monthly Report

```bash
# Trigger report manually
curl -X POST http://localhost:3000/api/admin/trigger-monthly-report \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Performance Testing

### Test 20: Load Testing

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Expected: 100+ req/sec, < 200ms response time
```

### Test 21: Database Performance

```bash
# Check query performance
mysql -u beam_user -p beam_individuals -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
"

# Run queries and check slow query log
tail -f /var/log/mysql/slow.log
```

### Test 22: Concurrent Users

```bash
# Simulate 100 concurrent users
ab -n 1000 -c 100 http://localhost:3000/api/business-types

# Expected: All requests succeed, < 500ms response time
```

## Security Testing

### Test 23: SQL Injection Prevention

```bash
# Try SQL injection
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com\" OR \"1\"=\"1",
    "code":"123456"
  }'

# Expected: Error, not SQL injection
```

### Test 24: XSS Prevention

```bash
# Try XSS payload
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -d '{
    "business_name":"<script>alert(\"XSS\")</script>",
    "business_type":"Hair Salon",
    "location":"New York, NY",
    "website_url":"https://example.com"
  }'

# Expected: Payload sanitized or rejected
```

### Test 25: Rate Limiting

```bash
# Send 10 requests in quick succession
for i in {1..10}; do
  curl http://localhost:3000/api/auth/request-code \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done

# Expected: After 5 requests, get 429 Too Many Requests
```

### Test 26: CORS Protection

```bash
# Try request from different origin
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:3000/api/websites

# Expected: CORS headers not present for unauthorized origin
```

### Test 27: Authentication Required

```bash
# Try accessing protected endpoint without token
curl http://localhost:3000/api/websites

# Expected: 401 Unauthorized
```

## Test Summary

| Test | Endpoint | Expected Status | Notes |
|------|----------|-----------------|-------|
| Request Code | POST /auth/request-code | 200 | Email sent |
| Verify Code | POST /auth/verify | 200 | Token returned |
| Signup | POST /auth/signup | 200 | Account created |
| Create Website | POST /websites | 201 | Website created |
| List Websites | GET /websites | 200 | Websites returned |
| Discover Competitors | POST /discover-competitors | 200 | Job started |
| Get Threat | GET /threat | 200 | Threat level returned |
| Create Subscription | POST /subscription/create | 200 | Payment intent created |
| Webhook | POST /stripe/webhook | 200 | Event processed |
| Load Test | Multiple | 200 | 100+ req/sec |
| SQL Injection | POST /verify | 400 | Rejected |
| XSS | POST /websites | 400 | Sanitized |
| Rate Limit | Multiple | 429 | Limited after threshold |
| CORS | OPTIONS | 403 | Blocked |
| Auth Required | GET /websites | 401 | Unauthorized |

## Continuous Testing

### Automated Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:integration   # Integration tests
npm run test:load          # Load tests
npm run test:security      # Security audit
```

### Manual Testing Checklist
- [ ] Authentication flow works
- [ ] Website creation works
- [ ] Competitor discovery completes
- [ ] Threat assessment calculated
- [ ] Monthly reports generated
- [ ] Payments processed
- [ ] Emails sent
- [ ] Weekly refresh runs
- [ ] Rate limiting works
- [ ] Error messages clear

## Debugging

### Enable Debug Logging
```bash
DEBUG=* npm start
```

### Check Logs
```bash
tail -f /var/log/beam/app.log
```

### Monitor Database
```bash
mysql -u beam_user -p beam_individuals
SHOW PROCESSLIST;
SHOW SLOW LOGS;
```

### Stripe Testing
- Test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

---

**All tests should pass before deployment to production.**
