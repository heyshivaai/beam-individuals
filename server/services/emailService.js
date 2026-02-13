/**
 * BEAM for Individuals - Email Service
 * 
 * Handles sending verification codes, password resets, and monthly BEAM reports
 * Uses Nodemailer for SMTP email delivery
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Email configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

let transporter = null;

/**
 * Initialize email transporter
 */
function initializeTransporter() {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('⚠ Email credentials not configured. Email service disabled.');
      return false;
    }

    transporter = nodemailer.createTransport(emailConfig);
    console.log('✓ Email service initialized');
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize email service:', error.message);
    return false;
  }
}

/**
 * Send verification code email
 */
async function sendVerificationCode(email, code, deviceName = null) {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    const deviceInfo = deviceName ? ` on ${deviceName}` : '';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .code { background: white; border: 2px solid #667eea; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border-radius: 4px; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BEAM for Individuals</h1>
              <p>Verification Code</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You requested to sign in to your BEAM account${deviceInfo}.</p>
              <p>Your verification code is:</p>
              <div class="code">${code}</div>
              <p>This code expires in 10 minutes.</p>
              <p>If you didn't request this code, you can safely ignore this email.</p>
              <div class="footer">
                <p>&copy; 2026 BEAM for Individuals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailConfig.auth.user,
      to: email,
      subject: 'Your BEAM Verification Code',
      html,
    });

    console.log(`✓ Verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send verification code to ${email}:`, error.message);
    return false;
  }
}

/**
 * Send monthly BEAM report
 */
async function sendMonthlyReport(email, ownerName, businessName, report) {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    const reportMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 4px; }
            .metric { display: inline-block; width: 48%; margin: 1%; padding: 10px; background: white; border-radius: 4px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
            .metric-label { font-size: 12px; color: #999; margin-top: 5px; }
            .threat-critical { color: #e74c3c; }
            .threat-high { color: #e67e22; }
            .threat-medium { color: #f39c12; }
            .threat-low { color: #27ae60; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
            .cta { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BEAM Report</h1>
              <p>${reportMonth}</p>
            </div>
            <div class="content">
              <p>Hello ${ownerName},</p>
              <p>Your monthly BEAM report for <strong>${businessName}</strong> is ready.</p>
              
              <div class="section">
                <h3>Threat Assessment</h3>
                <div class="metric">
                  <div class="metric-value threat-${report.threat_level.toLowerCase()}">${report.threat_level}</div>
                  <div class="metric-label">Threat Level</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${report.threat_score}</div>
                  <div class="metric-label">Threat Score</div>
                </div>
              </div>

              <div class="section">
                <h3>Competitors</h3>
                <p>We identified <strong>${report.competitor_count}</strong> active competitors in your market.</p>
                <p>Top competitors:</p>
                <ul>
                  ${report.top_competitors.slice(0, 3).map(c => `<li>${c.name} (Threat: ${c.threat_level})</li>`).join('')}
                </ul>
              </div>

              <div class="section">
                <h3>AI Search Keywords</h3>
                <p>Top keywords for AI search visibility:</p>
                <ul>
                  ${report.top_keywords.slice(0, 5).map(k => `<li>${k.keyword} (Relevance: ${k.relevance_score}%)</li>`).join('')}
                </ul>
              </div>

              <div class="section">
                <h3>Recommended Actions</h3>
                <p>We have ${report.recommendations.length} recommended actions to improve your AI visibility.</p>
              </div>

              <center>
                <a href="${process.env.APP_URL || 'https://beam.example.com'}/dashboard" class="cta">View Full Report</a>
              </center>

              <div class="footer">
                <p>&copy; 2026 BEAM for Individuals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailConfig.auth.user,
      to: email,
      subject: `Your BEAM Report for ${businessName} - ${reportMonth}`,
      html,
    });

    console.log(`✓ Monthly report sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send report to ${email}:`, error.message);
    return false;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email, resetLink) {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>BEAM for Individuals</h1>
              <p>Password Reset</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You requested to reset your password. Click the button below to create a new password.</p>
              <center>
                <a href="${resetLink}" class="cta">Reset Password</a>
              </center>
              <p>This link expires in 24 hours.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <div class="footer">
                <p>&copy; 2026 BEAM for Individuals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailConfig.auth.user,
      to: email,
      subject: 'Reset Your BEAM Password',
      html,
    });

    console.log(`✓ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send password reset email to ${email}:`, error.message);
    return false;
  }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(email, ownerName) {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
            .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to BEAM</h1>
              <p>AI-Powered Threat Assessment for Your Business</p>
            </div>
            <div class="content">
              <p>Hello ${ownerName},</p>
              <p>Welcome to BEAM for Individuals! We're excited to help you understand and respond to competitive threats.</p>
              
              <div class="feature">
                <h4>🎯 Threat Assessment</h4>
                <p>Get real-time insights into how your business stacks up against competitors.</p>
              </div>

              <div class="feature">
                <h4>🔍 Competitor Discovery</h4>
                <p>Automatically discover and analyze your top 5 competitors.</p>
              </div>

              <div class="feature">
                <h4>📊 AI Search Keywords</h4>
                <p>Find the keywords that matter for AI-driven search engines.</p>
              </div>

              <div class="feature">
                <h4>📈 Monthly Reports</h4>
                <p>Receive detailed monthly BEAM reports with actionable recommendations.</p>
              </div>

              <p>Get started by adding your first website to your BEAM account.</p>
              
              <center>
                <a href="${process.env.APP_URL || 'https://beam.example.com'}/dashboard" class="cta">Go to Dashboard</a>
              </center>

              <p>Questions? Contact our support team at support@beam.example.com</p>

              <div class="footer">
                <p>&copy; 2026 BEAM for Individuals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailConfig.auth.user,
      to: email,
      subject: 'Welcome to BEAM for Individuals',
      html,
    });

    console.log(`✓ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send welcome email to ${email}:`, error.message);
    return false;
  }
}

/**
 * Test email configuration
 */
async function testConfiguration() {
  if (!transporter) {
    console.error('Email service not initialized');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✓ Email configuration verified');
    return true;
  } catch (error) {
    console.error('✗ Email configuration error:', error.message);
    return false;
  }
}

module.exports = {
  initializeTransporter,
  sendVerificationCode,
  sendMonthlyReport,
  sendPasswordReset,
  sendWelcomeEmail,
  testConfiguration,
};
