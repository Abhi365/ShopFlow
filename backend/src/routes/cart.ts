import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  applyCoupon,
  mergeGuestCart,
} from '../controllers/cartController';

const router = Router();

/**
 * GET /api/cart
 * Returns current cart (by userId or guest token).
 * SFP-142, SFP-168
 */
router.get('/', getCart);

/**
 * POST /api/cart/items
 * Adds an item; checks real-time stock availability.
 * SFP-142, SFP-169, SFP-170
 */
router.post('/items', addItem);

/**
 * PATCH /api/cart/items/:sku
 * Updates item quantity (validates against live stock).
 * SFP-169, SFP-170
 */
router.patch('/items/:sku', updateItemQuantity);

/**
 * DELETE /api/cart/items/:sku
 * Removes item from cart.
 * SFP-169
 */
router.delete('/items/:sku', removeItem);

/**
 * POST /api/cart/coupon
 * Validates and applies a coupon code.
 * SFP-169
 */
router.post('/coupon', applyCoupon);

/**
 * POST /api/cart/merge
 * Merges guest cart into authenticated user cart on login.
 * SFP-168
 */
router.post('/merge', authenticate, mergeGuestCart);

export default router;
