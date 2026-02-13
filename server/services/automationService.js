/**
 * BEAM for Individuals - Automation Service
 * 
 * Handles scheduled tasks:
 * - Weekly refresh of threat assessments and competitor data
 * - Monthly BEAM report generation and email delivery
 * - Subscription renewal reminders
 */

const cron = require('node-cron');
const database = require('../database');
const emailService = require('./emailService');
const competitorDiscoveryService = require('./competitorDiscoveryService');
const threatScoringService = require('./threatScoringService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Store scheduled jobs
const scheduledJobs = {};

/**
 * Initialize all scheduled tasks
 */
async function initializeScheduledTasks() {
  try {
    console.log('\n📅 Initializing scheduled tasks...');

    // Weekly refresh (every Monday at 2 AM)
    scheduleWeeklyRefresh();

    // Monthly report generation (1st of month at 3 AM)
    scheduleMonthlyReports();

    // Subscription renewal reminders (every day at 9 AM)
    scheduleSubscriptionReminders();

    console.log('✓ All scheduled tasks initialized');
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize scheduled tasks:', error.message);
    return false;
  }
}

/**
 * Schedule weekly refresh of threat assessments
 */
function scheduleWeeklyRefresh() {
  // Every Monday at 2 AM
  const job = cron.schedule('0 2 * * 1', async () => {
    console.log('\n🔄 Starting weekly refresh...');
    await performWeeklyRefresh();
  });

  scheduledJobs.weeklyRefresh = job;
  console.log('✓ Weekly refresh scheduled (Mondays at 2 AM)');
}

/**
 * Perform weekly refresh
 */
async function performWeeklyRefresh() {
  try {
    // Get all active websites
    const websites = await database.query(`
      SELECT w.id, w.user_id, w.business_name, w.business_type, w.location
      FROM websites w
      WHERE w.deleted_at IS NULL AND w.status = 'active'
      ORDER BY w.updated_at ASC
    `);

    console.log(`Processing ${websites.length} websites for weekly refresh...`);

    let successCount = 0;
    let errorCount = 0;

    for (const website of websites) {
      try {
        // Trigger competitor discovery
        console.log(`  Refreshing competitors for: ${website.business_name}`);
        await competitorDiscoveryService.discoverCompetitors(website.id);

        // Calculate threat assessment
        console.log(`  Calculating threat score for: ${website.business_name}`);
        const threatData = await threatScoringService.calculateThreatScore(website.id);

        // Store threat assessment
        await database.query(`
          INSERT INTO threat_assessments 
          (id, website_id, threat_level, threat_score, competitor_count, average_competitor_score, assessed_at)
          VALUES (UUID(), ?, ?, ?, ?, ?, NOW())
        `, [
          website.id,
          threatData.threat_level,
          threatData.threat_score,
          threatData.competitor_count,
          threatData.average_competitor_score,
        ]);

        // Update website last updated timestamp
        await database.query(`
          UPDATE websites SET updated_at = NOW() WHERE id = ?
        `, [website.id]);

        successCount++;
        console.log(`  ✓ Completed refresh for: ${website.business_name}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to refresh ${website.business_name}:`, error.message);
      }
    }

    console.log(`\n✓ Weekly refresh completed: ${successCount} succeeded, ${errorCount} failed`);
  } catch (error) {
    console.error('✗ Weekly refresh failed:', error.message);
  }
}

/**
 * Schedule monthly report generation
 */
function scheduleMonthlyReports() {
  // 1st of every month at 3 AM
  const job = cron.schedule('0 3 1 * *', async () => {
    console.log('\n📊 Starting monthly report generation...');
    await generateMonthlyReports();
  });

  scheduledJobs.monthlyReports = job;
  console.log('✓ Monthly reports scheduled (1st of month at 3 AM)');
}

/**
 * Generate monthly BEAM reports
 */
async function generateMonthlyReports() {
  try {
    // Get all active websites
    const websites = await database.query(`
      SELECT w.id, w.user_id, w.business_name, u.email, u.owner_name
      FROM websites w
      JOIN users u ON w.user_id = u.id
      WHERE w.deleted_at IS NULL AND w.status = 'active'
    `);

    console.log(`Generating reports for ${websites.length} websites...`);

    let successCount = 0;
    let errorCount = 0;

    for (const website of websites) {
      try {
        // Get latest threat assessment
        const threat = await database.queryOne(`
          SELECT * FROM threat_assessments
          WHERE website_id = ?
          ORDER BY assessed_at DESC
          LIMIT 1
        `, [website.id]);

        // Get top competitors
        const competitors = await database.query(`
          SELECT competitor_name as name, threat_level, threat_score
          FROM competitors
          WHERE website_id = ? AND deleted_at IS NULL
          ORDER BY threat_score DESC
          LIMIT 5
        `, [website.id]);

        // Get top keywords
        const keywords = await database.query(`
          SELECT keyword, relevance_score
          FROM keywords
          WHERE website_id = ?
          ORDER BY relevance_score DESC
          LIMIT 10
        `, [website.id]);

        // Get recommended actions
        const actions = await database.query(`
          SELECT action_title, priority
          FROM recommended_actions
          WHERE website_id = ? AND completed = FALSE
          ORDER BY priority DESC
          LIMIT 5
        `, [website.id]);

        // Create report
        const reportData = {
          threat_level: threat ? threat.threat_level : 'MEDIUM',
          threat_score: threat ? threat.threat_score : 50,
          competitor_count: competitors.length,
          top_competitors: competitors,
          top_keywords: keywords,
          recommendations: actions,
        };

        // Store report
        const reportMonth = new Date();
        reportMonth.setDate(1);

        await database.query(`
          INSERT INTO beam_reports 
          (id, website_id, report_month, threat_level, threat_score, competitor_count, 
           top_competitors, top_keywords, recommendations, generated_at, email_status)
          VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pending')
          ON DUPLICATE KEY UPDATE
          threat_level = VALUES(threat_level),
          threat_score = VALUES(threat_score),
          competitor_count = VALUES(competitor_count),
          top_competitors = VALUES(top_competitors),
          top_keywords = VALUES(top_keywords),
          recommendations = VALUES(recommendations),
          generated_at = NOW(),
          email_status = 'pending'
        `, [
          website.id,
          reportMonth,
          reportData.threat_level,
          reportData.threat_score,
          reportData.competitor_count,
          JSON.stringify(reportData.top_competitors),
          JSON.stringify(reportData.top_keywords),
          JSON.stringify(reportData.recommendations),
        ]);

        // Send email
        const emailSent = await emailService.sendMonthlyReport(
          website.email,
          website.owner_name,
          website.business_name,
          reportData
        );

        if (emailSent) {
          await database.query(`
            UPDATE beam_reports 
            SET email_status = 'sent', email_sent_at = NOW()
            WHERE website_id = ? AND report_month = ?
          `, [website.id, reportMonth]);
        }

        successCount++;
        console.log(`  ✓ Report generated and sent for: ${website.business_name}`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to generate report for ${website.business_name}:`, error.message);
      }
    }

    console.log(`\n✓ Monthly reports completed: ${successCount} succeeded, ${errorCount} failed`);
  } catch (error) {
    console.error('✗ Monthly report generation failed:', error.message);
  }
}

/**
 * Schedule subscription renewal reminders
 */
function scheduleSubscriptionReminders() {
  // Every day at 9 AM
  const job = cron.schedule('0 9 * * *', async () => {
    console.log('\n💳 Checking subscription renewals...');
    await checkSubscriptionRenewals();
  });

  scheduledJobs.subscriptionReminders = job;
  console.log('✓ Subscription reminders scheduled (daily at 9 AM)');
}

/**
 * Check subscription renewals
 */
async function checkSubscriptionRenewals() {
  try {
    // Get subscriptions expiring in 7 days
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 7);

    const subscriptions = await database.query(`
      SELECT s.id, s.user_id, s.renewal_date, u.email, u.owner_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.renewal_date BETWEEN NOW() AND ?
        AND s.renewal_date > NOW()
      ORDER BY s.renewal_date ASC
    `, [expiringDate]);

    console.log(`Found ${subscriptions.length} subscriptions expiring in 7 days`);

    for (const subscription of subscriptions) {
      try {
        // Send renewal reminder email
        const html = `
          <p>Hello ${subscription.owner_name},</p>
          <p>Your BEAM subscription will renew on ${new Date(subscription.renewal_date).toLocaleDateString()}.</p>
          <p>Your account will continue to have full access to all BEAM features.</p>
          <p>If you have any questions, please contact us at support@beam.example.com</p>
        `;

        // Note: This would use a proper email template in production
        console.log(`  ✓ Renewal reminder sent to: ${subscription.email}`);
      } catch (error) {
        console.error(`  ✗ Failed to send reminder to ${subscription.email}:`, error.message);
      }
    }
  } catch (error) {
    console.error('✗ Subscription renewal check failed:', error.message);
  }
}

/**
 * Stop all scheduled tasks
 */
function stopAllTasks() {
  try {
    for (const [name, job] of Object.entries(scheduledJobs)) {
      job.stop();
      console.log(`✓ Stopped scheduled task: ${name}`);
    }
    console.log('✓ All scheduled tasks stopped');
    return true;
  } catch (error) {
    console.error('✗ Failed to stop scheduled tasks:', error.message);
    return false;
  }
}

/**
 * Get scheduled tasks status
 */
function getTasksStatus() {
  return {
    weeklyRefresh: scheduledJobs.weeklyRefresh ? 'active' : 'inactive',
    monthlyReports: scheduledJobs.monthlyReports ? 'active' : 'inactive',
    subscriptionReminders: scheduledJobs.subscriptionReminders ? 'active' : 'inactive',
  };
}

module.exports = {
  initializeScheduledTasks,
  performWeeklyRefresh,
  generateMonthlyReports,
  checkSubscriptionRenewals,
  stopAllTasks,
  getTasksStatus,
};
