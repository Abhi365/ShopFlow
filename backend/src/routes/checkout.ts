import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { initiateCheckout, confirmCheckout } from '../controllers/checkoutController';

const router = Router();

/**
 * POST /api/checkout
 * Creates a Stripe Payment Intent from the current cart.
 * P95 latency target: <500ms (SFP-172, SFP-216).
 * SFP-143, SFP-171, SFP-172, SFP-173, SFP-187, SFP-215, SFP-216
 */
router.post('/', authenticate, initiateCheckout);

/**
 * POST /api/checkout/confirm
 * Called after Stripe confirms payment on the frontend.
 * Creates the Order record and sends confirmation email (SFP-173).
 */
router.post('/confirm', authenticate, confirmCheckout);

export default router;
