# BEAM for Individuals - Railway Deployment Guide

Deploy BEAM for Individuals to Railway in 5 minutes.

## Prerequisites

- Railway account (you already have one ✓)
- Git installed
- BEAM for Individuals code (ready ✓)

## Step 1: Initialize Git Repository

```bash
cd /home/ubuntu/beam-brain-bank
git init
git add .
git commit -m "Initial BEAM for Individuals commit"
```

## Step 2: Create Railway Project

### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Follow prompts:
# - Project name: beam-individuals
# - Service name: api
```

### Option B: Using Railway Dashboard

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub" or "Deploy from Git"
4. Connect your repository

## Step 3: Configure Environment Variables

In Railway Dashboard:

1. Go to your project
2. Click "Variables"
3. Add the following variables:

```
# Database
DB_HOST=<your-mysql-host>
DB_PORT=3306
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=beam_individuals

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASSWORD=<your-app-password>
EMAIL_FROM=noreply@beam.example.com
APP_URL=https://<your-railway-url>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# External APIs
TAVILY_API_KEY=tvly_...
LLM_API_KEY=sk_...
LLM_API_URL=https://api.openai.com/v1

# Server
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://<your-domain>,https://<your-railway-url>

# JWT
JWT_SECRET=<long-random-string>
```

## Step 4: Add MySQL Database (Optional)

If you don't have a MySQL database yet:

1. In Railway Dashboard, click "Add Service"
2. Select "MySQL"
3. Railway will create a MySQL instance
4. Copy the connection details to your environment variables

## Step 5: Deploy

### Using Railway CLI

```bash
# Push to Railway
railway up

# View logs
railway logs

# Get your URL
railway status
```

### Using Git Push

```bash
# Add Railway remote
git remote add railway <railway-git-url>

# Push to Railway
git push railway main
```

### Using Railway Dashboard

1. Go to your project
2. Click "Deployments"
3. Click "Deploy"
4. Select your branch (main)
5. Click "Deploy"

## Step 6: Initialize Database

After deployment:

```bash
# SSH into Railway container
railway shell

# Run migrations
cd server
node db-init.js

# Exit
exit
```

Or run migrations from your local machine:

```bash
# Connect to Railway MySQL
mysql -h <railway-host> -u <user> -p <database>

# Run migration files
source server/migrations/001_create_initial_schema.sql
source server/migrations/002_insert_taxonomy_data.sql
```

## Step 7: Verify Deployment

```bash
# Check health endpoint
curl https://<your-railway-url>/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2026-02-13T12:00:00Z"
# }
```

## Step 8: Configure Custom Domain (Optional)

1. In Railway Dashboard, go to your project
2. Click "Settings"
3. Click "Domains"
4. Add your custom domain
5. Update DNS records (Railway will provide instructions)

## Your Production URL

Once deployed, your API will be available at:

```
https://<project-name>.up.railway.app
```

Example: `https://beam-individuals.up.railway.app`

## Testing Your API

```bash
# Test authentication
curl -X POST https://<your-railway-url>/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test business types
curl https://<your-railway-url>/api/business-types

# Test health
curl https://<your-railway-url>/health
```

## Monitoring & Logs

### View Logs in Railway Dashboard
1. Go to your project
2. Click "Logs"
3. Filter by service

### View Logs via CLI
```bash
railway logs -f
```

### Monitor Metrics
1. Go to your project
2. Click "Metrics"
3. View CPU, memory, and network usage

## Troubleshooting

### Build Failed
```bash
# Check build logs
railway logs --service=api

# Rebuild
railway up --force
```

### Database Connection Error
```bash
# Verify environment variables
railway variables

# Check MySQL is running
railway shell
mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -D $DB_NAME -e "SELECT 1;"
```

### Port Already in Use
Railway automatically assigns ports. Check:
```bash
railway status
```

### Migrations Not Running
```bash
# SSH into container
railway shell

# Run manually
cd server
node db-init.js

# Check migrations table
mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -D $DB_NAME -e "SELECT * FROM migrations;"
```

## Environment Variables Reference

| Variable | Required | Example |
|----------|----------|---------|
| DB_HOST | Yes | mysql.railway.internal |
| DB_USER | Yes | root |
| DB_PASSWORD | Yes | password123 |
| DB_NAME | Yes | beam_individuals |
| STRIPE_SECRET_KEY | Yes | sk_test_... |
| EMAIL_USER | Yes | your-email@gmail.com |
| TAVILY_API_KEY | Yes | tvly_... |
| NODE_ENV | Yes | production |
| PORT | No | 3000 (auto-assigned) |

## Deployment Checklist

- [ ] Git repository initialized
- [ ] Railway project created
- [ ] Environment variables configured
- [ ] MySQL database created/connected
- [ ] Code deployed
- [ ] Database migrations run
- [ ] Health endpoint verified
- [ ] API endpoints tested
- [ ] Logs monitored
- [ ] Custom domain configured (optional)

## Next Steps

1. **Test all endpoints** - Use curl examples from QUICK_START.md
2. **Build frontend** - Connect React/Vue app to your Railway URL
3. **Monitor performance** - Watch Railway metrics dashboard
4. **Setup alerts** - Configure Railway notifications
5. **Scale if needed** - Add more replicas in Railway settings

## Support

- Railway Docs: https://docs.railway.app
- BEAM Docs: See DEPLOYMENT_GUIDE.md
- API Reference: See FRONTEND_API_INTEGRATION.md

---

**Your BEAM for Individuals API is now live on Railway!** 🚀
