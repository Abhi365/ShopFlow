import { Router } from 'express';
import { authenticate, requireMerchant } from '../middleware/authenticate';
import {
  searchProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  archiveProduct,
} from '../controllers/catalogController';

const router = Router();

/**
 * GET /api/catalog/products
 * Full-text search + faceted filtering for shoppers.
 * SFP-139, SFP-140, SFP-149, SFP-150, SFP-161, SFP-162, SFP-163, SFP-197, SFP-198, SFP-199, SFP-200
 */
router.get('/products', searchProducts);

/**
 * GET /api/catalog/products/:slug
 * Product detail page with structured data + related products.
 * SFP-141, SFP-154, SFP-182, SFP-183, SFP-184, SFP-191
 */
router.get('/products/:slug', getProductBySlug);

/**
 * POST /api/catalog/products
 * Merchant creates a product (draft or published).
 * SFP-139, SFP-149, SFP-181, SFP-205, SFP-206, SFP-217, SFP-220, SFP-221
 */
router.post('/products', authenticate, requireMerchant, createProduct);

/**
 * PATCH /api/catalog/products/:slug
 * Merchant updates product fields.
 * SFP-139, SFP-149, SFP-181, SFP-205, SFP-220
 */
router.patch('/products/:slug', authenticate, requireMerchant, updateProduct);

/**
 * DELETE /api/catalog/products/:slug
 * Soft-deletes product (sets status=archived).
 * References in orders are preserved (SFP-206, SFP-217).
 */
router.delete('/products/:slug', authenticate, requireMerchant, archiveProduct);

export default router;
