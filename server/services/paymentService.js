/**
 * BEAM for Individuals - Payment Service
 * 
 * Handles Stripe payment processing for $99/year subscriptions
 * Manages customer creation, subscription management, and billing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUBSCRIPTION_PRICE = 99.00;
const SUBSCRIPTION_INTERVAL = 'year';

/**
 * Create a Stripe customer
 */
async function createCustomer(email, name) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        created_at: new Date().toISOString(),
      },
    });

    console.log(`✓ Stripe customer created: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error('✗ Failed to create Stripe customer:', error.message);
    throw error;
  }
}

/**
 * Create a subscription
 */
async function createSubscription(customerId, priceId = null) {
  try {
    // If no price ID provided, create one dynamically
    let subscriptionPrice = priceId;
    
    if (!subscriptionPrice) {
      // Create a product if it doesn't exist
      const products = await stripe.products.list({ limit: 1 });
      let product = products.data.find(p => p.name === 'BEAM for Individuals Annual');
      
      if (!product) {
        product = await stripe.products.create({
          name: 'BEAM for Individuals Annual',
          description: 'Annual subscription to BEAM for Individuals - AI threat assessment and competitor discovery',
          type: 'service',
        });
      }

      // Create a price
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 1,
      });
      
      let price = prices.data.find(p => p.unit_amount === SUBSCRIPTION_PRICE * 100);
      
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(SUBSCRIPTION_PRICE * 100),
          currency: 'usd',
          recurring: {
            interval: SUBSCRIPTION_INTERVAL,
            interval_count: 1,
          },
        });
      }

      subscriptionPrice = price.id;
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: subscriptionPrice,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    console.log(`✓ Subscription created: ${subscription.id}`);
    return subscription;
  } catch (error) {
    console.error('✗ Failed to create subscription:', error.message);
    throw error;
  }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('✗ Failed to retrieve subscription:', error.message);
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, cancellationReason = null) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancellation_reason: cancellationReason || 'User requested',
        cancelled_at: new Date().toISOString(),
      },
    });

    console.log(`✓ Subscription cancelled: ${subscriptionId}`);
    return subscription;
  } catch (error) {
    console.error('✗ Failed to cancel subscription:', error.message);
    throw error;
  }
}

/**
 * Get customer subscriptions
 */
async function getCustomerSubscriptions(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    return subscriptions.data;
  } catch (error) {
    console.error('✗ Failed to retrieve customer subscriptions:', error.message);
    throw error;
  }
}

/**
 * Get payment intent
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('✗ Failed to retrieve payment intent:', error.message);
    throw error;
  }
}

/**
 * Confirm payment
 */
async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('✗ Failed to confirm payment:', error.message);
    throw error;
  }
}

/**
 * Handle webhook event
 */
async function handleWebhookEvent(event) {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        console.log(`✓ Subscription created: ${event.data.object.id}`);
        return { status: 'success', action: 'subscription_created' };

      case 'customer.subscription.updated':
        console.log(`✓ Subscription updated: ${event.data.object.id}`);
        return { status: 'success', action: 'subscription_updated' };

      case 'customer.subscription.deleted':
        console.log(`✓ Subscription deleted: ${event.data.object.id}`);
        return { status: 'success', action: 'subscription_deleted' };

      case 'invoice.paid':
        console.log(`✓ Invoice paid: ${event.data.object.id}`);
        return { status: 'success', action: 'invoice_paid' };

      case 'invoice.payment_failed':
        console.log(`✗ Invoice payment failed: ${event.data.object.id}`);
        return { status: 'error', action: 'invoice_payment_failed' };

      case 'payment_intent.succeeded':
        console.log(`✓ Payment succeeded: ${event.data.object.id}`);
        return { status: 'success', action: 'payment_succeeded' };

      case 'payment_intent.payment_failed':
        console.log(`✗ Payment failed: ${event.data.object.id}`);
        return { status: 'error', action: 'payment_failed' };

      default:
        console.log(`ℹ Unhandled event type: ${event.type}`);
        return { status: 'ignored', action: 'unhandled_event' };
    }
  } catch (error) {
    console.error('✗ Failed to handle webhook event:', error.message);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(body, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    return event;
  } catch (error) {
    console.error('✗ Webhook signature verification failed:', error.message);
    throw error;
  }
}

/**
 * Get subscription status
 */
function getSubscriptionStatus(subscription) {
  if (!subscription) {
    return 'inactive';
  }

  if (subscription.status === 'active') {
    return 'active';
  }

  if (subscription.status === 'past_due') {
    return 'past_due';
  }

  if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    return 'canceled';
  }

  return subscription.status;
}

/**
 * Get renewal date
 */
function getRenewalDate(subscription) {
  if (!subscription || !subscription.current_period_end) {
    return null;
  }

  return new Date(subscription.current_period_end * 1000);
}

/**
 * Check if subscription is active
 */
function isSubscriptionActive(subscription) {
  return subscription && subscription.status === 'active' && !subscription.cancel_at_period_end;
}

/**
 * Get subscription details for user
 */
async function getSubscriptionDetailsForUser(customerId) {
  try {
    const subscriptions = await getCustomerSubscriptions(customerId);
    
    if (subscriptions.length === 0) {
      return null;
    }

    const subscription = subscriptions[0];
    
    return {
      id: subscription.id,
      status: getSubscriptionStatus(subscription),
      plan: 'annual',
      price: SUBSCRIPTION_PRICE,
      currency: 'USD',
      created_at: new Date(subscription.created * 1000),
      renewal_date: getRenewalDate(subscription),
      is_active: isSubscriptionActive(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error('✗ Failed to get subscription details:', error.message);
    return null;
  }
}

module.exports = {
  createCustomer,
  createSubscription,
  getSubscription,
  cancelSubscription,
  getCustomerSubscriptions,
  getPaymentIntent,
  confirmPayment,
  handleWebhookEvent,
  verifyWebhookSignature,
  getSubscriptionStatus,
  getRenewalDate,
  isSubscriptionActive,
  getSubscriptionDetailsForUser,
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_INTERVAL,
};
