import { Request, Response } from 'express';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';

function getCartKey(req: Request): { userId?: string; guestToken?: string } {
  if (req.user) return { userId: req.user.sub };
  const guestToken = req.headers['x-guest-token'] as string | undefined;
  return guestToken ? { guestToken } : {};
}

/**
 * GET /api/cart
 * Returns current cart. Authenticated users get their persistent cart.
 * SFP-142, SFP-168
 */
export async function getCart(req: Request, res: Response): Promise<void> {
  const key = getCartKey(req);
  const cart = await Cart.findOne(key).lean();
  res.json(cart ?? { items: [], discountAmount: 0 });
}

/**
 * POST /api/cart/items
 * Adds item to cart. Validates against current stock to prevent overselling.
 * SFP-142, SFP-169, SFP-170
 */
export async function addItem(req: Request, res: Response): Promise<void> {
  const { sku, quantity = 1 } = req.body as { sku: string; quantity?: number };
  const key = getCartKey(req);

  const product = await Product.findOne({ sku, status: 'published' }).lean();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Real-time stock check (SFP-170)
  if (product.stock < quantity) {
    res.status(409).json({ error: `Only ${product.stock} units available` });
    return;
  }

  let cart = await Cart.findOne(key);
  if (!cart) {
    cart = new Cart(key);
  }

  const existingIdx = cart.items.findIndex((i) => i.sku === sku);
  if (existingIdx >= 0) {
    const newQty = cart.items[existingIdx].quantity + quantity;
    if (newQty > product.stock) {
      res.status(409).json({ error: `Cart quantity would exceed available stock (${product.stock})` });
      return;
    }
    cart.items[existingIdx].quantity = newQty;
    cart.items[existingIdx].stockSnapshot = product.stock;
  } else {
    cart.items.push({
      productId: product._id,
      sku: product.sku,
      title: product.title,
      price: product.price,
      quantity,
      stockSnapshot: product.stock,
    });
  }

  await cart.save();
  res.json(cart);
}

/**
 * PATCH /api/cart/items/:sku
 * Updates quantity for an existing cart line.
 * SFP-169, SFP-170
 */
export async function updateItemQuantity(req: Request, res: Response): Promise<void> {
  const { sku } = req.params;
  const { quantity } = req.body as { quantity: number };
  const key = getCartKey(req);

  const cart = await Cart.findOne(key);
  if (!cart) {
    res.status(404).json({ error: 'Cart not found' });
    return;
  }

  const item = cart.items.find((i) => i.sku === sku);
  if (!item) {
    res.status(404).json({ error: 'Item not in cart' });
    return;
  }

  // Re-check live stock (SFP-170)
  const product = await Product.findOne({ sku }).lean();
  if (!product || product.stock < quantity) {
    res.status(409).json({ error: 'Insufficient stock' });
    return;
  }

  item.quantity = quantity;
  item.stockSnapshot = product.stock;
  await cart.save();
  res.json(cart);
}

/**
 * DELETE /api/cart/items/:sku
 * Removes an item from the cart.
 * SFP-169
 */
export async function removeItem(req: Request, res: Response): Promise<void> {
  const { sku } = req.params;
  const key = getCartKey(req);

  const cart = await Cart.findOne(key);
  if (!cart) {
    res.status(404).json({ error: 'Cart not found' });
    return;
  }

  cart.items = cart.items.filter((i) => i.sku !== sku);
  await cart.save();
  res.json(cart);
}

/**
 * POST /api/cart/coupon
 * Validates and applies a coupon code.
 * SFP-169
 * TODO [SFP-169]: implement real coupon validation against a Coupons collection
 */
export async function applyCoupon(req: Request, res: Response): Promise<void> {
  const { couponCode } = req.body as { couponCode: string };
  const key = getCartKey(req);

  const cart = await Cart.findOne(key);
  if (!cart) {
    res.status(404).json({ error: 'Cart not found' });
    return;
  }

  // Stub: flat 10% discount for demo
  cart.couponCode = couponCode;
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cart.discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
  await cart.save();
  res.json({ cart, discountAmount: cart.discountAmount });
}

/**
 * POST /api/cart/merge
 * Merges guest cart into authenticated user cart after login.
 * Guest cart is deleted after merge.
 * SFP-168
 */
export async function mergeGuestCart(req: Request, res: Response): Promise<void> {
  const { guestToken } = req.body as { guestToken: string };
  const userId = req.user!.sub;

  const guestCart = await Cart.findOne({ guestToken });
  if (!guestCart || guestCart.items.length === 0) {
    res.json({ message: 'Nothing to merge' });
    return;
  }

  let userCart = await Cart.findOne({ userId });
  if (!userCart) {
    userCart = new Cart({ userId });
  }

  for (const guestItem of guestCart.items) {
    const idx = userCart.items.findIndex((i) => i.sku === guestItem.sku);
    if (idx >= 0) {
      userCart.items[idx].quantity += guestItem.quantity;
    } else {
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();
  await guestCart.deleteOne();

  res.json(userCart);
}
