import api from './client';

export interface CartItem {
  productId: string;
  sku: string;
  title: string;
  price: number;
  quantity: number;
  stockSnapshot: number;
}

export interface Cart {
  _id?: string;
  userId?: string;
  guestToken?: string;
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
}

/**
 * Get current cart.
 * SFP-142, SFP-168
 */
export async function getCart(): Promise<Cart> {
  const { data } = await api.get('/cart');
  return data;
}

/**
 * Add item to cart.
 * SFP-142, SFP-169, SFP-170
 */
export async function addToCart(sku: string, quantity = 1): Promise<Cart> {
  const { data } = await api.post('/cart/items', { sku, quantity });
  return data;
}

/**
 * Update item quantity.
 * SFP-169, SFP-170
 */
export async function updateCartItem(sku: string, quantity: number): Promise<Cart> {
  const { data } = await api.patch(`/cart/items/${sku}`, { quantity });
  return data;
}

/**
 * Remove item from cart.
 * SFP-169
 */
export async function removeCartItem(sku: string): Promise<Cart> {
  const { data } = await api.delete(`/cart/items/${sku}`);
  return data;
}

/**
 * Apply coupon code.
 * SFP-169
 */
export async function applyCoupon(couponCode: string): Promise<{ cart: Cart; discountAmount: number }> {
  const { data } = await api.post('/cart/coupon', { couponCode });
  return data;
}

/**
 * Merge guest cart into authenticated user cart after login.
 * SFP-168
 */
export async function mergeGuestCart(guestToken: string): Promise<Cart> {
  const { data } = await api.post('/cart/merge', { guestToken });
  return data;
}
