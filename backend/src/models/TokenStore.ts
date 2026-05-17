import { Schema, model, Document } from 'mongoose';

/**
 * Server-side token store — stores refresh token hashes so they can be
 * invalidated on logout without rotating the JWT secret.
 * SFP-164, SFP-188, SFP-193, SFP-204
 */
export interface ITokenRecord extends Document {
  userId: Schema.Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const TokenRecordSchema = new Schema<ITokenRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index — expired tokens are cleaned up automatically (SFP-167, SFP-196)
TokenRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenRecord = model<ITokenRecord>('TokenRecord', TokenRecordSchema);
