import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { initiateCheckout, confirmCheckout, ShippingAddress } from '@/api/checkout';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK ?? '');

const AddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2).default('US'),
});

type AddressForm = z.infer<typeof AddressSchema>;

/**
 * Single-page checkout with stepwise progress: Address -> Payment -> Confirmation.
 * SFP-143, SFP-171, SFP-172, SFP-173, SFP-187, SFP-215, SFP-216
 */
export default function CheckoutPage(): React.ReactElement {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [step, setStep] = useState<'address' | 'payment' | 'confirmation'>('address');
  const [orderSummary, setOrderSummary] = useState<{
    id: string;
    total: number;
    status: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressForm>({ resolver: zodResolver(AddressSchema) });

  async function onAddressSubmit(data: AddressForm): Promise<void> {
    const result = await initiateCheckout(data as ShippingAddress);
    setClientSecret(result.clientSecret);
    setPaymentIntentId(result.orderId);
    setStep('payment');
  }

  return (
    <main className="checkout-page">
      {/* Stepwise progress indicator (SFP-187) */}
      <nav className="checkout-steps" aria-label="Checkout steps">
        <span className={step === 'address' ? 'active' : step !== 'address' ? 'done' : ''}>
          1. Shipping
        </span>
        <span className={step === 'payment' ? 'active' : step === 'confirmation' ? 'done' : ''}>
          2. Payment
        </span>
        <span className={step === 'confirmation' ? 'active' : ''}>3. Confirmation</span>
      </nav>

      {step === 'address' && (
        <section>
          <h1>Shipping Address</h1>
          {/* TODO [SFP-171]: integrate Google Places autocomplete for address fields */}
          <form onSubmit={handleSubmit(onAddressSubmit)} className="address-form">
            <label>
              Address line 1
              <input {...register('line1')} autoComplete="address-line1" />
              {errors.line1 && <span className="error">{errors.line1.message}</span>}
            </label>
            <label>
              Address line 2 (optional)
              <input {...register('line2')} autoComplete="address-line2" />
            </label>
            <label>
              City
              <input {...register('city')} autoComplete="address-level2" />
              {errors.city && <span className="error">{errors.city.message}</span>}
            </label>
            <label>
              State
              <input {...register('state')} autoComplete="address-level1" />
              {errors.state && <span className="error">{errors.state.message}</span>}
            </label>
            <label>
              Postal code
              <input {...register('postalCode')} autoComplete="postal-code" />
              {errors.postalCode && <span className="error">{errors.postalCode.message}</span>}
            </label>
            <button type="submit" disabled={isSubmitting}>
              Continue to Payment
            </button>
          </form>
        </section>
      )}

      {step === 'payment' && clientSecret && (
        <section>
          <h1>Payment</h1>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              paymentIntentId={paymentIntentId!}
              onSuccess={(summary) => {
                setOrderSummary(summary);
                setStep('confirmation');
              }}
            />
          </Elements>
        </section>
      )}

      {step === 'confirmation' && orderSummary && (
        <section className="order-confirmation">
          <h1>Order Confirmed!</h1>
          {/* On-screen order summary (SFP-173) */}
          <p>Order ID: <strong>{orderSummary.id}</strong></p>
          <p>Total: <strong>${orderSummary.total.toFixed(2)}</strong></p>
          <p>Status: <strong>{orderSummary.status}</strong></p>
          <p>A confirmation email has been sent to your address.</p>
          <a href="/catalog">Continue shopping</a>
        </section>
      )}
    </main>
  );
}

/**
 * Inner Stripe payment form — rendered inside Elements context.
 * SFP-172, SFP-216
 */
function PaymentForm({
  paymentIntentId,
  onSuccess,
}: {
  paymentIntentId: string;
  onSuccess: (summary: { id: string; total: number; status: string }) => void;
}): React.ReactElement {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handlePaymentSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setProcessing(false);
      return;
    }

    try {
      const { order } = await confirmCheckout(paymentIntentId);
      onSuccess({ id: order.id, total: order.total as number, status: order.status });
    } catch {
      setError('Payment succeeded but order confirmation failed. Please contact support.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handlePaymentSubmit}>
      <PaymentElement />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}
