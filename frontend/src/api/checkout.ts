import api from './client';

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Initiates checkout — creates Stripe Payment Intent.
 * Returns clientSecret for Stripe Elements.
 * SFP-143, SFP-172, SFP-187, SFP-215, SFP-216
 */
export async function initiateCheckout(shippingAddress: ShippingAddress): Promise<{
  clientSecret: string;
  orderId: string;
  total: number;
}> {
  const { data } = await api.post('/checkout', { shippingAddress });
  return data;
}

/**
 * Confirms order after Stripe payment resolves on frontend.
 * Returns order summary for confirmation screen.
 * SFP-143, SFP-173
 */
export async function confirmCheckout(paymentIntentId: string): Promise<{
  message: string;
  order: { id: string; status: string; total: number; items: unknown[] };
}> {
  const { data } = await api.post('/checkout/confirm', { paymentIntentId });
  return data;
}
