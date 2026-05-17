import { Schema, model, Document } from 'mongoose';

export type OrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface IOrder extends Document {
  merchantId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  items: Array<{
    productId: Schema.Types.ObjectId;
    sku: string;
    title: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  refunds: Array<{ amount: number; reason: string; stripeRefundId: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    stripeChargeId: String,
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: String,
        title: String,
        price: Number,
        quantity: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'payment_confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
        'partially_refunded',
      ],
      default: 'pending_payment',
    },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    refunds: {
      type: [
        {
          amount: Number,
          reason: String,
          stripeRefundId: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', OrderSchema);
