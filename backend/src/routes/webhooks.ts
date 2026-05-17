import { Router, Request, Response } from 'express';
import { handleStripeWebhook } from '../services/stripeService';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Receives Stripe events — payment_intent.succeeded, .payment_failed, etc.
 * Signature verified against raw body (configured in index.ts).
 * SFP-175
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'Missing Stripe signature' });
    return;
  }

  try {
    await handleStripeWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    res.status(error.status ?? 500).json({ error: error.message ?? 'Webhook error' });
  }
});

export default router;
