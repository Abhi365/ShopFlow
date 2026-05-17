import Stripe from 'stripe';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2023-10-16' });

/**
 * Creates a Stripe Payment Intent for the cart total.
 * P95 latency target: <500ms (SFP-172, SFP-216)
 */
export async function createPaymentIntent(
  amountCents: number,
  currency: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

/**
 * Handles incoming Stripe webhook events.
 * Verifies signature using raw body (configured in index.ts).
 * SFP-175
 */
export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw Object.assign(new Error('Webhook signature verification failed'), { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'payment_confirmed', stripeChargeId: intent.latest_charge as string }
      );
      // Decrement inventory for each item
      // TODO [SFP-175]: fetch order items and decrement Product.stock atomically
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'cancelled' }
      );
      break;
    }
    default:
      break;
  }
}

/**
 * Issues a refund (partial or full) via Stripe Refunds API.
 * SFP-176
 */
export async function refundOrder(
  orderId: string,
  amountCents?: number,
  reason?: string
): Promise<void> {
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (!order.stripeChargeId) throw new Error('No charge associated with order');

  const refund = await stripe.refunds.create({
    charge: order.stripeChargeId,
    ...(amountCents !== undefined && { amount: amountCents }),
    reason: (reason as Stripe.RefundCreateParams.Reason) ?? 'requested_by_customer',
  });

  order.refunds.push({
    amount: refund.amount,
    reason: reason ?? 'requested_by_customer',
    stripeRefundId: refund.id,
    createdAt: new Date(),
  });
  order.status = amountCents !== undefined && amountCents < order.total ? 'partially_refunded' : 'refunded';
  await order.save();
}
