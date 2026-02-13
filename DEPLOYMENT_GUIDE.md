# BEAM for Individuals - Deployment Guide

Complete guide for deploying BEAM for Individuals to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, API)
- [ ] Code coverage > 80%
- [ ] No TypeScript/ESLint errors
- [ ] No security vulnerabilities (npm audit)
- [ ] All dependencies up to date

### Documentation
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Deployment guide reviewed
- [ ] Runbooks created
- [ ] Architecture diagram updated

### Security
- [ ] SSL/TLS certificates obtained
- [ ] API keys secured in vault
- [ ] Database credentials secured
- [ ] CORS origins configured
- [ ] Rate limiting configured
- [ ] Security headers configured

### Testing
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] Backup/restore tested
- [ ] Failover tested
- [ ] Disaster recovery tested

### Operations
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Logging configured
- [ ] Health checks configured
- [ ] Runbooks prepared

## Infrastructure Setup

### Cloud Provider Options

#### Option 1: AWS
```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name beam-key \
  --security-groups beam-sg

# Create RDS MySQL database
aws rds create-db-instance \
  --db-instance-identifier beam-db \
  --db-instance-class db.t3.small \
  --engine mysql \
  --master-username admin \
  --master-user-password SECURE_PASSWORD
```

#### Option 2: DigitalOcean
```bash
# Create droplet
doctl compute droplet create beam-server \
  --region nyc3 \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb

# Create managed database
doctl databases create \
  --engine mysql \
  --region nyc3 \
  --num-nodes 1 \
  beam-database
```

#### Option 3: Heroku
```bash
# Create app
heroku create beam-for-individuals

# Add MySQL add-on
heroku addons:create cleardb:ignite

# Deploy
git push heroku main
```

### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install MySQL client
sudo apt install -y mysql-client

# Install Git
sudo apt install -y git

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Database Setup

### Create Database

```bash
# Connect to MySQL
mysql -h DATABASE_HOST -u admin -p

# Create database
CREATE DATABASE beam_individuals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'beam_user'@'%' IDENTIFIED BY 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON beam_individuals.* TO 'beam_user'@'%';
FLUSH PRIVILEGES;
```

### Run Migrations

```bash
# Clone repository
git clone https://github.com/your-org/beam-individuals.git
cd beam-individuals/server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with production values

# Run migrations
node db-init.js
```

### Verify Setup

```bash
# Check database
mysql -h DATABASE_HOST -u beam_user -p beam_individuals -e "SHOW TABLES;"

# Check migrations
mysql -h DATABASE_HOST -u beam_user -p beam_individuals -e "SELECT * FROM migrations;"

# Check business types
mysql -h DATABASE_HOST -u beam_user -p beam_individuals -e "SELECT COUNT(*) FROM business_types;"
```

## Application Deployment

### Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/your-org/beam-individuals.git
cd beam-individuals/server
sudo chown -R www-data:www-data /var/www/beam-individuals
```

### Install Dependencies

```bash
npm ci --production
```

### Configure Environment

```bash
sudo cp .env.example .env
sudo nano .env
# Edit with production values
```

### Start Application

```bash
# Using PM2
pm2 start index.js --name "beam-api" --instances max

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u www-data --hp /var/www
```

### Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/beam

# Add configuration:
upstream beam_api {
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
}

server {
  listen 80;
  server_name beam.example.com;

  # Redirect to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name beam.example.com;

  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/beam.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/beam.example.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Proxy to Node.js
  location / {
    proxy_pass http://beam_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Static files
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/beam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d beam.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Configuration

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://beam.example.com

# Database
DB_HOST=beam-db.example.com
DB_PORT=3306
DB_USER=beam_user
DB_PASSWORD=SECURE_PASSWORD
DB_NAME=beam_individuals
DB_CONNECTION_LIMIT=20

# Email
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=sg_XXXXX
EMAIL_FROM=noreply@beam.example.com
APP_URL=https://beam.example.com

# Stripe
STRIPE_SECRET_KEY=sk_live_XXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# JWT
JWT_SECRET=LONG_RANDOM_STRING_HERE

# Tavily API
TAVILY_API_KEY=tvly_XXXXX

# LLM
LLM_API_KEY=sk_XXXXX
LLM_API_URL=https://api.openai.com/v1

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/beam/app.log
```

### Database Optimization

```bash
# Optimize tables
mysql -u beam_user -p beam_individuals -e "
OPTIMIZE TABLE users, websites, competitors, keywords, threat_assessments;
"

# Create indexes
mysql -u beam_user -p beam_individuals < /var/www/beam-individuals/server/migrations/indexes.sql

# Enable query cache
mysql -u beam_user -p beam_individuals -e "
SET GLOBAL query_cache_size = 268435456;
SET GLOBAL query_cache_type = 1;
"
```

## Monitoring

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# PM2 logs
pm2 logs beam-api

# Real-time logs
tail -f /var/log/beam/app.log
```

### Database Monitoring

```bash
# Check connections
mysql -u beam_user -p beam_individuals -e "SHOW PROCESSLIST;"

# Check slow queries
mysql -u beam_user -p beam_individuals -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
"

# Monitor table sizes
mysql -u beam_user -p beam_individuals -e "
SELECT 
  TABLE_NAME, 
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'beam_individuals'
ORDER BY size_mb DESC;
"
```

### Health Checks

```bash
# API health
curl https://beam.example.com/health

# Database health
curl https://beam.example.com/health | jq .database

# Setup monitoring
# Add to cron (every 5 minutes)
*/5 * * * * curl -s https://beam.example.com/health | grep -q healthy || send_alert
```

### Alerting

```bash
# Setup Datadog
npm install --save datadog-browser-rum

# Setup Sentry
npm install --save @sentry/node

# Setup PagerDuty
# Configure webhook alerts
```

## Backup & Recovery

### Database Backup

```bash
# Daily backup
0 2 * * * mysqldump -h DATABASE_HOST -u beam_user -p SECURE_PASSWORD beam_individuals > /backups/beam_$(date +\%Y\%m\%d).sql

# Upload to S3
0 3 * * * aws s3 cp /backups/beam_$(date +\%Y\%m\%d).sql s3://beam-backups/

# Cleanup old backups
0 4 * * * find /backups -name "beam_*.sql" -mtime +30 -delete
```

### Database Restore

```bash
# Restore from backup
mysql -h DATABASE_HOST -u beam_user -p beam_individuals < /backups/beam_20260213.sql

# Verify restore
mysql -u beam_user -p beam_individuals -e "SELECT COUNT(*) FROM users;"
```

### Application Backup

```bash
# Backup code
tar -czf /backups/beam-code-$(date +%Y%m%d).tar.gz /var/www/beam-individuals

# Upload to S3
aws s3 cp /backups/beam-code-*.tar.gz s3://beam-backups/
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs beam-api

# Check port
lsof -i :3000

# Check database connection
mysql -h DATABASE_HOST -u beam_user -p beam_individuals -e "SELECT 1;"

# Check environment variables
cat /var/www/beam-individuals/server/.env
```

### Database Connection Error

```bash
# Check MySQL is running
mysql -h DATABASE_HOST -u beam_user -p -e "SELECT 1;"

# Check credentials
mysql -h DATABASE_HOST -u beam_user -p beam_individuals -e "SHOW TABLES;"

# Check network connectivity
telnet DATABASE_HOST 3306
```

### High CPU Usage

```bash
# Check running processes
top

# Check Node.js memory
node --max-old-space-size=4096 index.js

# Check database queries
mysql -u beam_user -p beam_individuals -e "SHOW FULL PROCESSLIST;"
```

### High Memory Usage

```bash
# Restart application
pm2 restart beam-api

# Check for memory leaks
node --inspect index.js

# Monitor memory
watch -n 1 'ps aux | grep node'
```

### Slow API Responses

```bash
# Check database performance
mysql -u beam_user -p beam_individuals -e "SHOW SLOW LOGS;"

# Check Nginx logs
tail -f /var/log/nginx/access.log

# Profile application
node --prof index.js
```

## Post-Deployment

### Verification

```bash
# Check API endpoints
curl https://beam.example.com/health
curl https://beam.example.com/api/business-types

# Check database
mysql -u beam_user -p beam_individuals -e "SELECT COUNT(*) FROM users;"

# Check email service
curl -X POST https://beam.example.com/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check payment service
# Verify Stripe webhook is configured
```

### Performance Baseline

```bash
# Measure response times
ab -n 1000 -c 10 https://beam.example.com/api/business-types

# Check database query times
mysql -u beam_user -p beam_individuals -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
"

# Monitor for 24 hours
# Review slow query log
```

### Security Verification

```bash
# Check SSL configuration
ssllabs.com/ssltest/analyze.html?d=beam.example.com

# Check security headers
curl -I https://beam.example.com

# Check CORS configuration
curl -H "Origin: https://example.com" -I https://beam.example.com

# Check rate limiting
for i in {1..10}; do curl https://beam.example.com/api/auth/request-code; done
```

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
pm2 stop beam-api

# Revert code
cd /var/www/beam-individuals
git revert HEAD

# Reinstall dependencies
npm ci --production

# Start previous version
pm2 start index.js --name "beam-api"

# Verify
curl https://beam.example.com/health
```

## Maintenance

### Regular Tasks

- [ ] Daily: Check logs, monitor health
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Update dependencies, security patches
- [ ] Quarterly: Full system audit, capacity planning
- [ ] Annually: Disaster recovery drill

### Updates

```bash
# Update dependencies
npm update

# Update Node.js
nvm install 18.0.0
nvm use 18.0.0

# Update system
sudo apt update && sudo apt upgrade -y
```

---

**BEAM for Individuals is now deployed to production!**

For ongoing support, refer to:
- Monitoring dashboard
- Application logs
- Database logs
- Nginx logs
- PM2 monitoring
