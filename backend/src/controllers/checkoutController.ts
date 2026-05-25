import { Request, Response } from 'express';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { createPaymentIntent } from '../services/stripeService';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { z } from 'zod';

const ShippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2).default('US'),
});

/**
 * POST /api/checkout
 * Validates cart, creates Stripe Payment Intent, returns clientSecret.
 * Target P95 latency: <500ms (SFP-172, SFP-216).
 * Single-page checkout stepwise flow (SFP-143, SFP-187).
 * Shipping address autocomplete handled on frontend via Google Places (SFP-171).
 * SFP-143, SFP-172, SFP-187, SFP-215, SFP-216
 */
export async function initiateCheckout(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  const parsed = ShippingAddressSchema.safeParse(req.body.shippingAddress);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten() });
    return;
  }

  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - cart.discountAmount);
  const amountCents = Math.round(total * 100);

  const { clientSecret, paymentIntentId } = await createPaymentIntent(amountCents, 'usd', {
    userId,
    cartId: cart.id as string,
  });

  // Persist a pending order record so the webhook can update it (SFP-175)
  // TODO [SFP-143]: determine merchantId from cart items
  await Order.create({
    merchantId: cart.items[0]?.productId, // placeholder
    userId,
    stripePaymentIntentId: paymentIntentId,
    items: cart.items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      title: i.title,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal,
    discountAmount: cart.discountAmount,
    total,
    currency: 'USD',
    status: 'pending_payment',
    shippingAddress: parsed.data,
  });

  res.json({ clientSecret, orderId: paymentIntentId, total });
}

/**
 * POST /api/checkout/confirm
 * Called from frontend after Stripe.confirmPayment() resolves.
 * Sends confirmation email and returns order summary.
 * SFP-173
 */
export async function confirmCheckout(req: Request, res: Response): Promise<void> {
  const { paymentIntentId } = req.body as { paymentIntentId: string };
  const userId = req.user!.sub;

  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId, userId });
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // SFP-173: send order confirmation email via SendGrid
  await sendOrderConfirmationEmail({
    orderId: order.id as string,
    userEmail: req.user!.email ?? req.user!.sub,
    total: order.total,
    currency: order.currency,
    items: order.items.map((i) => ({
      title: i.title,
      sku: i.sku,
      quantity: i.quantity,
      price: i.price,
    })),
    shippingAddress: order.shippingAddress as any,
  });

  res.json({
    message: 'Order confirmed',
    order: {
      id: order.id,
      status: order.status,
      total: order.total,
      items: order.items,
    },
  });
}
