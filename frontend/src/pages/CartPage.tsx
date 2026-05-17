import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem, applyCoupon, Cart } from '@/api/cart';

/**
 * Shopping cart page with persistent cart, stock validation, and coupon support.
 * SFP-142, SFP-168, SFP-169, SFP-170
 */
export default function CartPage(): React.ReactElement {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCart().then(setCart).finally(() => setLoading(false));
  }, []);

  async function handleQuantityChange(sku: string, quantity: number): Promise<void> {
    try {
      const updated = await updateCartItem(sku, quantity);
      setCart(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Could not update quantity');
    }
  }

  async function handleRemove(sku: string): Promise<void> {
    const updated = await removeCartItem(sku);
    setCart(updated);
  }

  async function handleApplyCoupon(): Promise<void> {
    try {
      const { cart: updated } = await applyCoupon(couponInput);
      setCart(updated);
      setError(null);
    } catch {
      setError('Invalid coupon code');
    }
  }

  if (loading) return <p>Loading cart…</p>;
  if (!cart || cart.items.length === 0) {
    return (
      <main className="cart-page">
        <h1>Your cart is empty</h1>
        <a href="/catalog">Browse products</a>
      </main>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - (cart.discountAmount ?? 0));

  return (
    <main className="cart-page">
      <h1>Shopping Cart</h1>
      {error && <p className="error">{error}</p>}

      <table className="cart-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.sku}>
              <td>{item.title}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={item.stockSnapshot}
                  value={item.quantity}
                  onChange={(e) => void handleQuantityChange(item.sku, Number(e.target.value))}
                />
              </td>
              <td>${(item.price * item.quantity).toFixed(2)}</td>
              <td>
                <button onClick={() => void handleRemove(item.sku)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cart-summary">
        <div className="coupon-row">
          <input
            type="text"
            placeholder="Coupon code"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
          />
          <button onClick={handleApplyCoupon}>Apply</button>
        </div>

        {cart.discountAmount > 0 && (
          <p>Discount: -${cart.discountAmount.toFixed(2)}</p>
        )}
        <p className="cart-total">Total: ${total.toFixed(2)}</p>

        <button className="checkout-button" onClick={() => navigate('/checkout')}>
          Proceed to Checkout
        </button>
      </div>
    </main>
  );
}
