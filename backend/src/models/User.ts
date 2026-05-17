import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  provider: 'github' | 'google' | 'local';
  providerId?: string;
  role: 'shopper' | 'merchant' | 'admin';
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes: string[];
  trustedDevices: Array<{ token: string; expiresAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    provider: { type: String, enum: ['github', 'google', 'local'], required: true },
    providerId: String,
    role: { type: String, enum: ['shopper', 'merchant', 'admin'], default: 'shopper' },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: String,
    mfaBackupCodes: { type: [String], default: [] },
    trustedDevices: {
      type: [{ token: String, expiresAt: Date }],
      default: [],
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
