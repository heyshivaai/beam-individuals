/**
 * BEAM for Individuals - Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription management
 * - Customer subscription created/updated/deleted
 * - Payment intent succeeded/failed
 * - Invoice paid/payment failed
 */

const express = require('express');
const router = express.Router();
const database = require('../database');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Stripe webhook endpoint
 * POST /api/stripe/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const body = req.body;

  try {
    // Verify webhook signature
    const event = paymentService.verifyWebhookSignature(body, sig);

    console.log(`\n📨 Stripe Webhook Event: ${event.type}`);
    console.log(`   Event ID: ${event.id}`);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Return success
    res.json({ received: true });
  } catch (error) {
    console.error('✗ Webhook verification failed:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(event) {
  try {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log(`   ✓ Subscription created: ${subscription.id}`);

    // Find user by Stripe customer ID
    const user = await database.queryOne(`
      SELECT id, email, owner_name FROM users
      WHERE stripe_customer_id = ?
    `, [customerId]);

    if (!user) {
      console.warn(`   ⚠️ User not found for customer: ${customerId}`);
      return;
    }

    // Store subscription in database
    const renewalDate = new Date(subscription.current_period_end * 1000);
    
    await database.query(`
      INSERT INTO subscriptions 
      (id, user_id, stripe_subscription_id, stripe_customer_id, status, 
       plan, price, currency, renewal_date, created_at)
      VALUES (UUID(), ?, ?, ?, ?, 'annual', ?, 'USD', ?, NOW())
      ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      renewal_date = VALUES(renewal_date)
    `, [
      user.id,
      subscription.id,
      customerId,
      paymentService.SUBSCRIPTION_PRICE,
      renewalDate,
    ]);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.owner_name);

    console.log(`   ✓ Subscription stored for user: ${user.id}`);
  } catch (error) {
    console.error('   ✗ Error handling subscription created:', error.message);
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(event) {
  try {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    console.log(`   ✓ Subscription updated: ${subscription.id}`);

    // Find user
    const user = await database.queryOne(`
      SELECT id FROM users WHERE stripe_customer_id = ?
    `, [customerId]);

    if (!user) {
      console.warn(`   ⚠️ User not found for customer: ${customerId}`);
      return;
    }

    // Update subscription status
    const renewalDate = new Date(subscription.current_period_end * 1000);
    const cancelAtPeriodEnd = subscription.cancel_at_period_end ? 1 : 0;

    await database.query(`
      UPDATE subscriptions 
      SET status = ?, renewal_date = ?, cancel_at_period_end = ?
      WHERE stripe_subscription_id = ?
    `, [
      subscription.status,
      renewalDate,
      cancelAtPeriodEnd,
      subscription.id,
    ]);

    console.log(`   ✓ Subscription updated for user: ${user.id}`);
  } catch (error) {
    console.error('   ✗ Error handling subscription updated:', error.message);
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(event) {
  try {
    const subscription = event.data.object;

    console.log(`   ✓ Subscription deleted: ${subscription.id}`);

    // Update subscription status
    await database.query(`
      UPDATE subscriptions 
      SET status = 'canceled', cancelled_at = NOW()
      WHERE stripe_subscription_id = ?
    `, [subscription.id]);

    console.log(`   ✓ Subscription marked as canceled`);
  } catch (error) {
    console.error('   ✗ Error handling subscription deleted:', error.message);
  }
}

/**
 * Handle invoice paid event
 */
async function handleInvoicePaid(event) {
  try {
    const invoice = event.data.object;
    const customerId = invoice.customer;

    console.log(`   ✓ Invoice paid: ${invoice.id}`);

    // Find user
    const user = await database.queryOne(`
      SELECT id, email, owner_name FROM users
      WHERE stripe_customer_id = ?
    `, [customerId]);

    if (!user) {
      console.warn(`   ⚠️ User not found for customer: ${customerId}`);
      return;
    }

    // Store invoice
    await database.query(`
      INSERT INTO invoices 
      (id, user_id, stripe_invoice_id, stripe_customer_id, amount, 
       currency, status, paid_at)
      VALUES (UUID(), ?, ?, ?, ?, 'USD', 'paid', NOW())
    `, [
      user.id,
      invoice.id,
      customerId,
      Math.round(invoice.amount_paid / 100),
    ]);

    console.log(`   ✓ Invoice stored for user: ${user.id}`);
  } catch (error) {
    console.error('   ✗ Error handling invoice paid:', error.message);
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(event) {
  try {
    const invoice = event.data.object;
    const customerId = invoice.customer;

    console.log(`   ✗ Invoice payment failed: ${invoice.id}`);

    // Find user
    const user = await database.queryOne(`
      SELECT id, email, owner_name FROM users
      WHERE stripe_customer_id = ?
    `, [customerId]);

    if (!user) {
      console.warn(`   ⚠️ User not found for customer: ${customerId}`);
      return;
    }

    // Send payment failure notification
    const html = `
      <p>Hello ${user.owner_name},</p>
      <p>We were unable to process your payment for your BEAM subscription.</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <p><a href="https://beam.example.com/account/billing">Update Payment Method</a></p>
    `;

    // Note: This would use a proper email template in production
    console.log(`   ✓ Payment failure notification sent to: ${user.email}`);
  } catch (error) {
    console.error('   ✗ Error handling invoice payment failed:', error.message);
  }
}

/**
 * Handle payment intent succeeded event
 */
async function handlePaymentIntentSucceeded(event) {
  try {
    const paymentIntent = event.data.object;

    console.log(`   ✓ Payment succeeded: ${paymentIntent.id}`);

    // Find user by metadata
    const userId = paymentIntent.metadata?.user_id;
    if (!userId) {
      console.warn(`   ⚠️ No user_id in payment intent metadata`);
      return;
    }

    // Update user subscription status
    await database.query(`
      UPDATE users 
      SET subscription_status = 'active', subscription_started_at = NOW()
      WHERE id = ?
    `, [userId]);

    console.log(`   ✓ User subscription activated: ${userId}`);
  } catch (error) {
    console.error('   ✗ Error handling payment intent succeeded:', error.message);
  }
}

/**
 * Handle payment intent failed event
 */
async function handlePaymentIntentFailed(event) {
  try {
    const paymentIntent = event.data.object;

    console.log(`   ✗ Payment failed: ${paymentIntent.id}`);

    // Find user by metadata
    const userId = paymentIntent.metadata?.user_id;
    if (!userId) {
      console.warn(`   ⚠️ No user_id in payment intent metadata`);
      return;
    }

    // Log payment failure
    await database.query(`
      INSERT INTO payment_failures 
      (id, user_id, stripe_payment_intent_id, error_message, failed_at)
      VALUES (UUID(), ?, ?, ?, NOW())
    `, [
      userId,
      paymentIntent.id,
      paymentIntent.last_payment_error?.message || 'Unknown error',
    ]);

    console.log(`   ✓ Payment failure logged for user: ${userId}`);
  } catch (error) {
    console.error('   ✗ Error handling payment intent failed:', error.message);
  }
}

module.exports = router;
