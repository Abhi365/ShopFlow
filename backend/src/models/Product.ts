import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  merchantId: Schema.Types.ObjectId;
  title: string;
  description: string;
  slug: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
  category: string;
  tags: string[];
  images: string[];
  status: 'draft' | 'published' | 'archived';
  structuredData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    structuredData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound uniqueness: SKU must be unique per merchant (SFP-206, SFP-217)
ProductSchema.index({ merchantId: 1, sku: 1 }, { unique: true });

// Full-text search index (SFP-161, SFP-197)
ProductSchema.index({ title: 'text', description: 'text' });

export const Product = model<IProduct>('Product', ProductSchema);
