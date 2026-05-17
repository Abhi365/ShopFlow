import { Schema, model, Document } from 'mongoose';

export interface CartItem {
  productId: Schema.Types.ObjectId;
  sku: string;
  title: string;
  price: number;
  quantity: number;
  stockSnapshot: number;
}

export interface ICart extends Document {
  userId?: Schema.Types.ObjectId;
  guestToken?: string;
  items: CartItem[];
  couponCode?: string;
  discountAmount: number;
  expiresAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    stockSnapshot: { type: Number, required: true },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    guestToken: { type: String, index: true, sparse: true },
    items: { type: [CartItemSchema], default: [] },
    couponCode: String,
    discountAmount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// TTL index — guest carts expire automatically (SFP-168)
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Cart = model<ICart>('Cart', CartSchema);
