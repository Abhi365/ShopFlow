import { Router } from 'express';
import { authenticate, requireMerchant } from '../middleware/authenticate';
import { listOrders, updateOrderStatus, issueRefund } from '../controllers/orderController';

const router = Router();

/**
 * GET /api/orders
 * Returns paginated order list for the authenticated merchant.
 * SFP-144, SFP-174
 */
router.get('/', authenticate, requireMerchant, listOrders);

/**
 * PATCH /api/orders/:orderId/status
 * Merchant updates order lifecycle state.
 * SFP-144, SFP-174
 */
router.patch('/:orderId/status', authenticate, requireMerchant, updateOrderStatus);

/**
 * POST /api/orders/:orderId/refund
 * Merchant initiates partial or full refund via Stripe.
 * SFP-144, SFP-176
 */
router.post('/:orderId/refund', authenticate, requireMerchant, issueRefund);

export default router;
