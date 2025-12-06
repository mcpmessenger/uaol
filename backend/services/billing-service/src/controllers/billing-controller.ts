import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel, SubscriptionTier } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { config } from '@uaol/shared/config';

const logger = createLogger('billing-service');
const userModel = new UserModel(getDatabasePool());

// Lazy load Stripe to avoid requiring it if not configured
let Stripe: any = null;
let stripe: any = null;

async function getStripe() {
  if (!Stripe) {
    try {
      Stripe = (await import('stripe')).default;
      if (config.stripe.secretKey) {
        stripe = new Stripe(config.stripe.secretKey);
        logger.info('Stripe initialized');
      } else {
        logger.warn('Stripe secret key not configured');
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        logger.warn('stripe package not installed. Install with: npm install stripe');
      } else {
        logger.error('Failed to initialize Stripe', { error: error.message });
      }
    }
  }
  return stripe;
}

export const billingController = {
  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { tier, paymentMethodId } = req.body;

      // TODO: Implement Stripe subscription creation
      logger.info('Creating subscription', { userId: user.user_id, tier });

      res.json({
        success: true,
        message: 'Subscription creation not yet fully implemented',
      });
    } catch (error) {
      next(error);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          tier: user.subscription_tier,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      // TODO: Implement Stripe subscription cancellation
      logger.info('Cancelling subscription', { userId: user.user_id });

      res.json({
        success: true,
        message: 'Subscription cancellation not yet fully implemented',
      });
    } catch (error) {
      next(error);
    }
  },

  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const stripe = await getStripe();
      if (!stripe) {
        return res.status(500).json({
          success: false,
          error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
        });
      }

      const signature = req.headers['stripe-signature'] as string;
      const webhookSecret = config.stripe.webhookSecret;

      if (!webhookSecret) {
        logger.error('Stripe webhook secret not configured');
        return res.status(500).json({
          success: false,
          error: { code: 'WEBHOOK_SECRET_MISSING', message: 'Webhook secret not configured' },
        });
      }

      let event: any;
      try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
      } catch (err: any) {
        logger.error('Webhook signature verification failed', { error: err.message });
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
        });
      }

      logger.info('Processing Stripe webhook event', { type: event.type, id: event.id });

      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          
          // Find user by Stripe customer ID (you may need to store this in the database)
          // For now, we'll try to find by email if customer object has email
          const customer = await stripe.customers.retrieve(customerId);
          const email = customer.email;

          if (email) {
            const user = await userModel.findByEmail(email);
            if (user) {
              // Map Stripe plan to subscription tier
              const planId = subscription.items?.data[0]?.price?.id || '';
              let tier = SubscriptionTier.FREE;
              
              if (planId.includes('pro') || planId.includes('Pro')) {
                tier = SubscriptionTier.PRO;
              } else if (planId.includes('enterprise') || planId.includes('Enterprise')) {
                tier = SubscriptionTier.ENTERPRISE;
              }

              await userModel.updateSubscriptionTier(user.user_id, tier);
              logger.info('Subscription updated', { userId: user.user_id, tier, subscriptionId: subscription.id });
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          const customer = await stripe.customers.retrieve(customerId);
          const email = customer.email;

          if (email) {
            const user = await userModel.findByEmail(email);
            if (user) {
              await userModel.updateSubscriptionTier(user.user_id, SubscriptionTier.FREE);
              logger.info('Subscription cancelled', { userId: user.user_id, subscriptionId: subscription.id });
            }
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          const customer = await stripe.customers.retrieve(customerId);
          const email = customer.email;

          if (email) {
            const user = await userModel.findByEmail(email);
            if (user) {
              // Add credits based on subscription tier
              const creditsToAdd = user.subscription_tier === SubscriptionTier.PRO ? 10000n : 1000n;
              const newCredits = user.current_credits + creditsToAdd;
              await userModel.updateCredits(user.user_id, newCredits);
              logger.info('Credits added after payment', { userId: user.user_id, creditsAdded: Number(creditsToAdd) });
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          logger.warn('Payment failed', { customerId, invoiceId: invoice.id });
          // Could send notification email here
          break;
        }

        default:
          logger.debug('Unhandled webhook event type', { type: event.type });
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Error processing Stripe webhook', { error: error.message, stack: error.stack });
      next(error);
    }
  },
};

