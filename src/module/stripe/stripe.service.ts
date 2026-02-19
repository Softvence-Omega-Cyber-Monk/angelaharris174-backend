// src/stripe/stripe.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Stripe from 'stripe'; // ✅ Correct import
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlanDto } from './dto/strpe.dto';

@Injectable()
export class StripeService {
  private stripeClient: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    this.stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }

  async createSubscriptionProductAndPrice(
    productName: string,
    amount: number,
    currency: string = 'usd',
    interval: 'month' | 'year' = 'month',
    description?: string,
    features: string[] = [],
    isPopular = false
  ) {
    try {
      // 1. Create Product in Stripe
      const product = await this.stripeClient.products.create({
        name: productName,
        description: description || undefined,
        metadata: {
          created_by: 'your-app',
          internal_plan_name: productName,
        },
      });

      // 2. Create Price in Stripe
      const unitAmount = Math.round(amount * 100);

      const price = await this.stripeClient.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency,
        recurring: { interval },
      });

      // 3. Save Plan in Database
      const plan = await this.prisma.client.plan.create({
        data: {
          name: productName,
          description: description || '',
          price: amount,
          currency,
          interval,
          features: features as any, // Prisma Json type accepts array/object
          isPopular,
          stripeProductId: product.id,
          stripePriceId: price.id,
        },
      });

      return {
        productId: product.id,
        priceId: price.id,
        planId: plan.id,
        plan,
      };
    } catch (error) {
      console.error('Error creating product/price/plan:', error);
      throw new Error('Failed to create plan and sync with Stripe');
    }
  }

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    // 1. Validate that the price exists in our database first
    const plan = await this.prisma.client.plan.findFirst({
      where: { stripePriceId: priceId },
    });

    if (!plan) {
      console.error(`Attempted checkout with invalid/unknown priceId: ${priceId}`);
      throw new HttpException(
        'The selected subscription plan is invalid or no longer available.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId, // Pass user ID to link session to user
      subscription_data: {
        metadata: {
          userId, // Also pass in subscription metadata to be safer
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Metadata can be useful for debugging
      metadata: {
        userId,
        planId: plan.id,
      },
    });

    return session;
  }

  // GET all plans
  async findAllPlans() {
    return this.prisma.client.plan.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
  // UPDATE plan
  async updatePlan(id: string, updateData: UpdatePlanDto) {
    // 1. Find existing plan
    const existingPlan = await this.prisma.client.plan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
    }

    // 2. Check if price or currency changed
    const priceChanged =
      (updateData.price !== undefined && updateData.price !== existingPlan.price) ||
      (updateData.currency !== undefined && updateData.currency !== existingPlan.currency);

    let newStripePriceId = existingPlan.stripePriceId;

    // 3. If price/currency changed → create new Stripe Price
    if (priceChanged) {
      if (!existingPlan.stripeProductId) {
        throw new Error('Cannot update price: missing stripeProductId');
      }

      const unitAmount = Math.round((updateData.price ?? existingPlan.price) * 100);

      const newPrice = await this.stripeClient.prices.create({
        product: existingPlan.stripeProductId,
        unit_amount: unitAmount,
        currency: updateData.currency ?? existingPlan.currency,
        recurring: {
          interval: existingPlan.interval as 'month' | 'year',
        },
      });

      // Optional: Archive old price (good practice)
      if (existingPlan.stripePriceId) {
        await this.stripeClient.prices.update(existingPlan.stripePriceId, {
          active: false,
        });
      }

      newStripePriceId = newPrice.id;
    }

    // 4. Update DB record
    const updatedPlan = await this.prisma.client.plan.update({
      where: { id },
      data: {
        name: updateData.name,
        description: updateData.description,
        price: updateData.price,
        currency: updateData.currency,
        features: updateData.features as any, // Prisma Json
        isPopular: updateData.isPopular,
        stripePriceId: newStripePriceId, // update only if changed
        updatedAt: new Date(),
      },
    });

    return updatedPlan;
  }

  async handleWebhookEvent(signature: string, payload: Buffer) {
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
      }

      event = this.stripeClient.webhooks.constructEvent(
        payload.toString(),
        signature,
        webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`🔔 Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as any);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const transactionId = session.payment_intent as string;

    if (!userId) {
      console.warn('No client_reference_id in session:', session.id);
      return;
    }

    console.log(`✅ Checkout completed for user: ${userId}, Stripe Customer: ${customerId}`);

    // 🔥 1. CRITICAL: Link user to Stripe Customer ID immediately
    // This ensures future webhooks (like invoice.payment_succeeded) can find this user
    // even if the rest of this handler fails.
    try {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: customerId,
        },
      });
      console.log(`🔗 User ${userId} linked to Stripe customer ${customerId}`);
    } catch (err) {
      console.error(`Failed to link user ${userId} to customer ${customerId}:`, err.message);
      // We continue anyway to try and process the subscription
    }

    // 2. Fetch the session with line_items expanded
    const fullSession = await this.stripeClient.checkout.sessions.retrieve(
      session.id,
      {
        expand: ['line_items'], // ← critical!
      }
    );

    const priceId = fullSession.line_items?.data[0]?.price?.id;
    if (!priceId) {
      console.error(`Price ID not found in session ${session.id}`);
      return;
    }

    console.log(`✅ Processing checkout for user: ${userId}, priceId: ${priceId}`);
    const plan = await this.prisma.client.plan.findFirst({
      where: { stripePriceId: priceId },
    });

    if (!plan) {
      console.error(`❌ Plan not found in database for Stripe Price ID: ${priceId}. Please ensure your database plans match Stripe.`);
      return;
    }

    const subStatus = plan.interval === 'year' ? 'ELITE' : 'PRO';

    // 3. Update User Status
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        subscribeStatus: subStatus,
      },
    });

    // 4. Create or Update Subscription record
    try {
      const existingSub = await this.prisma.client.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (existingSub) {
        await this.prisma.client.subscription.update({
          where: { id: existingSub.id },
          data: {
            transactionId: transactionId || session.id,
            status: 'active',
            planId: plan.id, // 🌟 Ensure plan is updated if switching
          },
        });
        console.log(`📝 Subscription ${subscriptionId} updated during checkout (synced plan: ${plan.name})`);
      } else {
        await this.prisma.client.subscription.create({
          data: {
            userId,
            transactionId: transactionId || session.id, // Fallback to session ID if PI is missing
            planId: plan.id,
            status: 'active',
            stripeSubscriptionId: subscriptionId,
            startedAt: new Date(),
          },
        });
        console.log(`📝 Subscription created for user ${userId} with plan ${plan.name}`);
      }
    } catch (err) {
      console.error(`Error saving subscription for user ${userId}:`, err.message);
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    console.log(`Processing invoice.payment_succeeded for customer: ${invoice.customer}`);
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;
    const paymentIntentId = invoice.payment_intent as string;
    const amountPaid = invoice.amount_paid;
    const currency = invoice.currency;
    const receiptUrl = invoice.hosted_invoice_url || invoice.receipt_url;

    // Use PaymentIntent ID if available, otherwise fallback to Invoice ID to ensure a unique transaction record
    const transactionId = paymentIntentId || invoice.id;

    if (!transactionId) {
      console.error('No valid transaction identifier (PaymentIntent or Invoice ID) found for invoice:', invoice.id);
      return;
    }

    let user = await this.prisma.client.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      console.warn(`User not found for Stripe customer: ${customerId}. Checking via subscription lookup...`);
      // FALLBACK: Lookup by stripeSubscriptionId if customer lookup fails (race condition)
      const sub = await this.prisma.client.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true }
      });

      if (sub?.user) {
        user = sub.user;
        console.log(`🔗 Recovery: Found user ${user.id} via subscription ${subscriptionId}`);

        // Link them now for future invoices
        if (!user.stripeCustomerId) {
          await this.prisma.client.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: customerId }
          });
        }
      }
    }

    if (!user) {
      console.error(`❌ CRITICAL: User not found for Stripe customer ${customerId} or subscription ${subscriptionId}. Cannot create transaction.`);
      return;
    }

    // 2. Find subscription with plan details
    const subscription = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { plan: true },
    });

    const subStatus = subscription?.plan?.interval === 'year' ? 'ELITE' : 'PRO';

    // 1. Update user fields
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        subscribeStatus: subStatus,
      },
    });

    // 3. Create or Update Transaction record
    await this.prisma.client.transaction.upsert({
      where: { transactionId: transactionId },
      update: {
        status: 'succeeded',
        receiptUrl,
        amount: amountPaid / 100,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        subscriptionId: subscription?.id,
        planId: subscription?.planId, // 🌟 Capture the current plan for this transaction specifically
        transactionId: transactionId,
        amount: amountPaid / 100,
        currency,
        status: 'succeeded',
        receiptUrl,
        billingDate: new Date(),
      },
    });

    console.log(`💰 Payment succeeded for user ${user.id}: ${amountPaid} ${currency} (Tx: ${transactionId})`);
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    const customerId = invoice.customer as string;
    const paymentIntentId = invoice.payment_intent as string;
    const transactionId = paymentIntentId || invoice.id;

    if (!transactionId) return;

    const user = await this.prisma.client.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Record failed transaction attempt
    await this.prisma.client.transaction.upsert({
      where: { transactionId: transactionId },
      update: { status: 'failed' },
      create: {
        userId: user.id,
        transactionId: transactionId,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        billingDate: new Date(),
      },
    });

    // Update user status to FREE on payment failure
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { subscribeStatus: 'FREE' },
    });

    console.log(`❌ Payment failed for user ${user.id} (Tx: ${transactionId})`);
  }

  private async handleSubscriptionEvent(subscription: Stripe.Subscription) {
    const stripeSubscriptionId = subscription.id;
    const status = subscription.status; // 'active', 'canceled', 'past_due', etc.
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      console.warn('No price ID in subscription:', stripeSubscriptionId);
      return;
    }

    // Find your internal Plan
    const plan = await this.prisma.client.plan.findFirst({
      where: { stripePriceId: priceId },
    });

    if (!plan) {
      console.warn('Plan not found for price:', priceId);
      return;
    }

    // Find existing subscription in your DB
    let dbSub = await this.prisma.client.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'active',
      past_due: 'past_due',
      unpaid: 'canceled',
      canceled: 'canceled',
      incomplete: 'canceled',
      incomplete_expired: 'canceled',
    };

    const mappedStatus = statusMap[status] || 'canceled';

    if (dbSub) {
      // Update existing
      await this.prisma.client.subscription.update({
        where: { id: dbSub.id },
        data: {
          status: mappedStatus,
          planId: plan.id, // 🌟 Update plan pointer just in case it was changed via Dashboard
          endedAt: status === 'canceled' ? new Date() : null,
        },
      });

      // Update user's subscription status based on current status
      if (mappedStatus === 'canceled') {
        await this.prisma.client.user.update({
          where: { id: dbSub.userId },
          data: { subscribeStatus: 'FREE' },
        });
      } else if (mappedStatus === 'active') {
        const subStatus = plan.interval === 'year' ? 'ELITE' : 'PRO';
        await this.prisma.client.user.update({
          where: { id: dbSub.userId },
          data: { subscribeStatus: subStatus },
        });
      }
    } else {
      // Rare: subscription created outside checkout (e.g., via dashboard)
      // OR: subscription record doesn't exist yet because the checkout event is slower

      // Double check if it exists now (to avoid race conditions within this method if called twice)
      const customerId = subscription.customer as string;
      const user = await this.prisma.client.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (user) {
        // One final check to see if handleCheckoutSessionCompleted finished just now
        const reCheck = await this.prisma.client.subscription.findFirst({
          where: { stripeSubscriptionId },
        });

        if (!reCheck) {
          await this.prisma.client.subscription.create({
            data: {
              transactionId: "",
              userId: user.id,
              planId: plan.id,
              status: mappedStatus,
              stripeSubscriptionId,
              startedAt: new Date(subscription.start_date * 1000),
              endedAt: status === 'canceled' ? new Date() : null,
            },
          });
          console.log(`📝 New subscription created from event: ${stripeSubscriptionId}`);
        } else {
          // It was created by someone else in the last few ms, so just update it
          await this.prisma.client.subscription.update({
            where: { id: reCheck.id },
            data: {
              status: mappedStatus,
              endedAt: status === 'canceled' ? new Date() : null,
            },
          });
        }
      }
    }

    console.log(`🔄 Subscription ${stripeSubscriptionId} updated to: ${mappedStatus}`);
  }

  async findAllSubscriptions() {
    return this.prisma.client.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            athleteFullName: true
          },
        },
      },
    });
  }

  // Optional: Get subscriptions for current user
  async findSubscriptionById(subscriptionId: string) {
    return this.prisma.client.subscription.findFirst({
      where: {
        id: subscriptionId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            athleteFullName: true,
          },
        },
      },
    });
  }

  async findTransactionsByUserId(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.client.transaction.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              athleteFullName: true,
              email: true,
            },
          },
          plan: true, // 🌟 Direct link
          subscription: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { billingDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.transaction.count({
        where: { userId },
      }),
    ]);

    return {
      data: transactions.map((tx) => {
        // Use plan directly from transaction if available, otherwise fallback to subscription's plan
        const plan = tx.plan || tx.subscription?.plan;
        return {
          username: tx.user?.athleteFullName || tx.user?.email || 'Unknown',
          transactionId: tx.transactionId,
          interval: plan?.interval || 'N/A', // 🌟 Much more accurate now!
          amount: tx.amount,
          status: tx.status === 'succeeded' ? 'Successfull' : tx.status,
          billingDate: tx.billingDate,
          receiptUrl: tx.receiptUrl,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async AdminSubscriptionStats() {
    const [freeCount, proCount, eliteCount, compedCount] = await Promise.all([
      this.prisma.client.user.count({ where: { subscribeStatus: 'FREE' } }),
      this.prisma.client.user.count({ where: { subscribeStatus: 'PRO' } }),
      this.prisma.client.user.count({ where: { subscribeStatus: 'ELITE' } }),
      this.prisma.client.user.count({ where: { subscribeStatus: 'COMPED' } }),
    ]);

    const recentTransactions = await this.prisma.client.transaction.findMany({
      take: 10,
      orderBy: { billingDate: 'desc' },
      include: {
        user: {
          select: {
            athleteFullName: true,
          },
        },
        plan: true, // 🌟 Direct link
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      stats: {
        free: freeCount,
        pro: proCount,
        elite: eliteCount,
        comped: compedCount,
      },
      transactions: recentTransactions.map((tx) => {
        const plan = tx.plan || tx.subscription?.plan;
        return {
          transactionId: tx.transactionId,
          customer: tx.user?.athleteFullName || 'Unknown',
          plan: plan?.name || 'N/A', // 🌟 Accurate plan name
          amount: tx.amount / 100, // Convert cents to dollars
          status: tx.status === 'succeeded' ? 'Successfull' : tx.status,
          billingDate: tx.billingDate,
        };
      }),
    };
  }
  async findAllTransactionsPaginated(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.client.transaction.findMany({
        include: {
          user: {
            select: {
              athleteFullName: true,
              email: true,
            },
          },
          plan: true, // 🌟 Direct link to the plan paid for
          subscription: {
            include: {
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { billingDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.transaction.count(),
    ]);

    return {
      data: transactions.map((tx) => {
        const plan = tx.plan || tx.subscription?.plan;
        return {
          id: tx.id,
          transactionId: tx.transactionId,
          user: tx.user?.athleteFullName || tx.user?.email || 'Unknown',
          plan: plan?.name || 'N/A', // 🌟 Accurate plan name
          amount: tx.amount / 100,
          currency: tx.currency,
          status: tx.status === 'succeeded' ? 'Successfull' : tx.status,
          billingDate: tx.billingDate,
          receiptUrl: tx.receiptUrl,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async getUserCurrentPlan(userId: string) {
    const subscription = await this.prisma.client.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        plan: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      subscriptionId: subscription.id,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      startedAt: subscription.startedAt,
      endedAt: subscription.endedAt,
      plan: subscription.plan,
    };
  }
}