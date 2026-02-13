/**
 * BEAM for Individuals - Payment Controller
 * 
 * Handles subscription creation, management, and cancellation
 */

const database = require('../database');
const paymentService = require('../services/paymentService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Create subscription for user
 * POST /api/subscription/create
 */
async function createSubscription(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.owner_name;

    console.log(`\n💳 Creating subscription for user: ${userId}`);

    // Check if user already has active subscription
    const existingSubscription = await database.queryOne(`
      SELECT id, status FROM subscriptions
      WHERE user_id = ? AND status = 'active'
    `, [userId]);

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription',
      });
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = req.user.stripe_customer_id;

    if (!stripeCustomerId) {
      console.log(`   Creating Stripe customer for user: ${userId}`);
      const customer = await paymentService.createCustomer(userEmail, userName);
      stripeCustomerId = customer.id;

      // Store Stripe customer ID
      await database.query(`
        UPDATE users SET stripe_customer_id = ? WHERE id = ?
      `, [stripeCustomerId, userId]);
    }

    // Create subscription
    console.log(`   Creating subscription for customer: ${stripeCustomerId}`);
    const subscription = await paymentService.createSubscription(stripeCustomerId);

    // Get payment intent
    const paymentIntent = subscription.latest_invoice?.payment_intent;

    if (!paymentIntent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment intent',
      });
    }

    // Store subscription in database
    const renewalDate = new Date(subscription.current_period_end * 1000);

    await database.query(`
      INSERT INTO subscriptions 
      (id, user_id, stripe_subscription_id, stripe_customer_id, 
       stripe_payment_intent_id, status, plan, price, currency, renewal_date, created_at)
      VALUES (UUID(), ?, ?, ?, ?, 'incomplete', 'annual', ?, 'USD', ?, NOW())
    `, [
      userId,
      subscription.id,
      stripeCustomerId,
      paymentIntent.id,
      paymentService.SUBSCRIPTION_PRICE,
      renewalDate,
    ]);

    console.log(`   ✓ Subscription created: ${subscription.id}`);

    // Return client secret for payment confirmation
    res.json({
      success: true,
      subscription_id: subscription.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentService.SUBSCRIPTION_PRICE,
      currency: 'USD',
      plan: 'annual',
    });
  } catch (error) {
    console.error('✗ Failed to create subscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get subscription details
 * GET /api/subscription
 */
async function getSubscription(req, res) {
  try {
    const userId = req.user.id;

    console.log(`\n📋 Getting subscription for user: ${userId}`);

    // Get subscription from database
    const subscription = await database.queryOne(`
      SELECT 
        id,
        stripe_subscription_id,
        status,
        plan,
        price,
        currency,
        renewal_date,
        cancel_at_period_end,
        created_at,
        cancelled_at
      FROM subscriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        status: 'inactive',
      });
    }

    // Get payment history
    const invoices = await database.query(`
      SELECT 
        stripe_invoice_id,
        amount,
        currency,
        status,
        paid_at
      FROM invoices
      WHERE user_id = ?
      ORDER BY paid_at DESC
      LIMIT 12
    `, [userId]);

    console.log(`   ✓ Subscription retrieved: ${subscription.id}`);

    res.json({
      success: true,
      subscription: {
        ...subscription,
        renewal_date: subscription.renewal_date ? new Date(subscription.renewal_date) : null,
        created_at: subscription.created_at ? new Date(subscription.created_at) : null,
        cancelled_at: subscription.cancelled_at ? new Date(subscription.cancelled_at) : null,
      },
      invoices,
      status: paymentService.getSubscriptionStatus(subscription),
    });
  } catch (error) {
    console.error('✗ Failed to get subscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Cancel subscription
 * POST /api/subscription/cancel
 */
async function cancelSubscription(req, res) {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    console.log(`\n🚫 Cancelling subscription for user: ${userId}`);

    // Get subscription
    const subscription = await database.queryOne(`
      SELECT stripe_subscription_id, status FROM subscriptions
      WHERE user_id = ? AND status = 'active'
    `, [userId]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    // Cancel with Stripe (cancel at period end)
    console.log(`   Cancelling Stripe subscription: ${subscription.stripe_subscription_id}`);
    const cancelledSubscription = await paymentService.cancelSubscription(
      subscription.stripe_subscription_id,
      reason
    );

    // Update database
    await database.query(`
      UPDATE subscriptions 
      SET cancel_at_period_end = 1, cancellation_reason = ?
      WHERE stripe_subscription_id = ?
    `, [reason || 'User requested', subscription.stripe_subscription_id]);

    console.log(`   ✓ Subscription cancelled: ${subscription.stripe_subscription_id}`);

    // Calculate days remaining
    const renewalDate = new Date(cancelledSubscription.current_period_end * 1000);
    const daysRemaining = Math.ceil((renewalDate - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: 'Subscription cancelled',
      cancellation_details: {
        cancelled_at: new Date(),
        access_until: renewalDate,
        days_remaining: daysRemaining,
        refund_policy: 'No refunds for partial months. Access continues until renewal date.',
      },
    });
  } catch (error) {
    console.error('✗ Failed to cancel subscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Confirm payment
 * POST /api/subscription/confirm-payment
 */
async function confirmPayment(req, res) {
  try {
    const userId = req.user.id;
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id is required',
      });
    }

    console.log(`\n✅ Confirming payment: ${payment_intent_id}`);

    // Confirm payment with Stripe
    const paymentIntent = await paymentService.confirmPayment(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Update subscription status
      await database.query(`
        UPDATE subscriptions 
        SET status = 'active'
        WHERE stripe_payment_intent_id = ? AND user_id = ?
      `, [payment_intent_id, userId]);

      console.log(`   ✓ Payment confirmed and subscription activated`);

      res.json({
        success: true,
        message: 'Payment confirmed',
        status: 'active',
      });
    } else if (paymentIntent.status === 'requires_action') {
      res.json({
        success: false,
        message: 'Payment requires additional action',
        status: 'requires_action',
        client_secret: paymentIntent.client_secret,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    console.error('✗ Failed to confirm payment:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update payment method
 * POST /api/subscription/update-payment-method
 */
async function updatePaymentMethod(req, res) {
  try {
    const userId = req.user.id;
    const { payment_method_id } = req.body;

    if (!payment_method_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_method_id is required',
      });
    }

    console.log(`\n💳 Updating payment method for user: ${userId}`);

    // Get Stripe customer ID
    const user = await database.queryOne(`
      SELECT stripe_customer_id FROM users WHERE id = ?
    `, [userId]);

    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer found',
      });
    }

    // Update payment method with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    console.log(`   ✓ Payment method updated`);

    res.json({
      success: true,
      message: 'Payment method updated successfully',
    });
  } catch (error) {
    console.error('✗ Failed to update payment method:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get payment history
 * GET /api/subscription/invoices
 */
async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`\n📜 Getting payment history for user: ${userId}`);

    // Get invoices
    const invoices = await database.query(`
      SELECT 
        id,
        stripe_invoice_id,
        amount,
        currency,
        status,
        paid_at
      FROM invoices
      WHERE user_id = ?
      ORDER BY paid_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    // Get total count
    const countResult = await database.queryOne(`
      SELECT COUNT(*) as total FROM invoices WHERE user_id = ?
    `, [userId]);

    console.log(`   ✓ Retrieved ${invoices.length} invoices`);

    res.json({
      success: true,
      invoices,
      pagination: {
        total: countResult.total,
        limit,
        offset,
        pages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('✗ Failed to get payment history:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  createSubscription,
  getSubscription,
  cancelSubscription,
  confirmPayment,
  updatePaymentMethod,
  getPaymentHistory,
};
