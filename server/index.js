/**
 * BEAM for Individuals - Express Server
 * 
 * Complete API server with integrated middleware, controllers, and routes
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import database module
const database = require('./database');

// Import middleware
const {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  createRateLimiter,
  asyncHandler
} = require('./middleware/errorHandler');

const {
  validateRequestVerificationCode,
  validateVerifyCode,
  validateCompleteSignup,
  validateCreateWebsite,
  validateUpdateWebsite,
  validateAddCompetitor,
  validateCreateAction,
  validateCancelSubscription,
  validatePagination,
  validateThreatHistoryQuery,
  validateActionPriorityFilter
} = require('./middleware/validation');

const {
  verifySession,
  verifyOwnership,
  requireAuth
} = require('./middleware/auth');

// Import controllers
const controllers = require('./controllers');

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Request ID middleware
app.use(requestIdMiddleware);

// Rate limiting
app.use('/api/auth/', createRateLimiter(5, 60000)); // 5 requests per minute for auth
app.use('/api/', createRateLimiter(100, 60000)); // 100 requests per minute for others

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.post('/api/auth/request-code', 
  validateRequestVerificationCode,
  asyncHandler(controllers.auth.requestVerificationCode)
);

app.post('/api/auth/verify', 
  validateVerifyCode,
  asyncHandler(controllers.auth.verifyCode)
);

app.post('/api/auth/signup', 
  verifySession,
  validateCompleteSignup,
  asyncHandler(controllers.auth.completeSignup)
);

app.post('/api/auth/logout', 
  verifySession,
  asyncHandler(controllers.auth.logout)
);

// ─────────────────────────────────────────────────────────────────────────
// WEBSITE ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites', 
  verifySession,
  validatePagination,
  asyncHandler(controllers.websites.getWebsites)
);

app.get('/api/websites/:websiteId', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.websites.getWebsite)
);

app.post('/api/websites', 
  verifySession,
  validateCreateWebsite,
  asyncHandler(controllers.websites.createWebsite)
);

app.put('/api/websites/:websiteId', 
  verifySession,
  verifyOwnership('website'),
  validateUpdateWebsite,
  asyncHandler(controllers.websites.updateWebsite)
);

app.delete('/api/websites/:websiteId', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.websites.deleteWebsite)
);

// ─────────────────────────────────────────────────────────────────────────
// THREAT ASSESSMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites/:websiteId/threat', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.threatAssessment.getThreatAssessment)
);

app.get('/api/websites/:websiteId/threat-history', 
  verifySession,
  verifyOwnership('website'),
  validateThreatHistoryQuery,
  asyncHandler(controllers.threatAssessment.getThreatHistory)
);

// ─────────────────────────────────────────────────────────────────────────
// COMPETITOR ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites/:websiteId/competitors', 
  verifySession,
  verifyOwnership('website'),
  validatePagination,
  asyncHandler(controllers.competitors.getCompetitors)
);

app.post('/api/websites/:websiteId/competitors', 
  verifySession,
  verifyOwnership('website'),
  validateAddCompetitor,
  asyncHandler(controllers.competitors.addCompetitor)
);

app.delete('/api/websites/:websiteId/competitors/:competitorId', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.competitors.deleteCompetitor)
);

app.post('/api/websites/:websiteId/discover-competitors', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.competitors.discoverCompetitors)
);

// ─────────────────────────────────────────────────────────────────────────
// KEYWORD ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites/:websiteId/keywords', 
  verifySession,
  verifyOwnership('website'),
  validatePagination,
  asyncHandler(controllers.keywords.getKeywords)
);

// ─────────────────────────────────────────────────────────────────────────
// RECOMMENDED ACTIONS ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites/:websiteId/actions', 
  verifySession,
  verifyOwnership('website'),
  validateActionPriorityFilter,
  validatePagination,
  asyncHandler(controllers.actions.getActions)
);

app.post('/api/websites/:websiteId/actions', 
  verifySession,
  verifyOwnership('website'),
  validateCreateAction,
  asyncHandler(controllers.actions.createAction)
);

app.patch('/api/websites/:websiteId/actions/:actionId/complete', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.actions.completeAction)
);

// ─────────────────────────────────────────────────────────────────────────
// REPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/websites/:websiteId/reports/latest', 
  verifySession,
  verifyOwnership('website'),
  asyncHandler(controllers.reports.getLatestReport)
);

app.get('/api/websites/:websiteId/reports/history', 
  verifySession,
  verifyOwnership('website'),
  validatePagination,
  asyncHandler(controllers.reports.getReportHistory)
);

// ─────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/subscription', 
  verifySession,
  asyncHandler(controllers.subscription.getSubscription)
);

app.post('/api/subscription/cancel', 
  verifySession,
  validateCancelSubscription,
  asyncHandler(controllers.subscription.cancelSubscription)
);

// ─────────────────────────────────────────────────────────────────────────
// BUSINESS TYPES ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/business-types', 
  asyncHandler(controllers.businessTypes.getBusinessTypes)
);

app.get('/api/business-types/category/:category', 
  asyncHandler(controllers.businessTypes.getBusinessTypesByCategory)
);

// ─────────────────────────────────────────────────────────────────────────
// USER ACCOUNT ROUTES
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/user/profile', 
  verifySession,
  asyncHandler(controllers.user.getProfile)
);

app.put('/api/user/profile', 
  verifySession,
  asyncHandler(controllers.user.updateProfile)
);

app.post('/api/user/change-email', 
  verifySession,
  asyncHandler(controllers.user.changeEmail)
);

app.post('/api/user/delete-account', 
  verifySession,
  asyncHandler(controllers.user.deleteAccount)
);

// ============================================================================
// STATIC FILES
// ============================================================================

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve BEAM app files
app.get('/beam', (req, res) => {
  res.sendFile(path.join(__dirname, '../beam-app.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database connection pool
    console.log('\n📦 Initializing database connection pool...');
    const dbInitialized = await database.initializePool();
    
    if (!dbInitialized) {
      console.error('Failed to initialize database. Exiting.');
      process.exit(1);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         BEAM for Individuals API Server Started            ║
╠════════════════════════════════════════════════════════════╣
║ Environment: ${NODE_ENV.padEnd(45)}║
║ Port: ${PORT.toString().padEnd(52)}║
║ URL: http://localhost:${PORT.toString().padEnd(44)}║
║ Database: Connected                                        ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\nSIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await database.closePool();
        console.log('✓ Server shut down');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      server.close(async () => {
        await database.closePool();
        console.log('✓ Server shut down');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}



module.exports = app;
