import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenRecord } from '../models/TokenStore';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Issues a short-lived JWT access token + long-lived refresh token.
 * Stores the refresh token hash server-side for invalidation.
 * SFP-164, SFP-178, SFP-192, SFP-193, SFP-208
 */
export async function issueTokens(
  userId: string,
  role: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });

  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await TokenRecord.create({ userId, refreshTokenHash, expiresAt });

  return { accessToken, refreshToken };
}

/**
 * Rotates refresh token: validates the old one, deletes its record,
 * and issues a fresh pair.
 * SFP-165, SFP-194
 */
export async function rotateRefreshToken(
  rawRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string; userId: string; role: string }> {
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const record = await TokenRecord.findOne({ refreshTokenHash: hash });
  if (!record) throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });

  // Decode userId+role from the stored record
  const userId = record.userId.toString();

  // Look up role from User model (not embedded in refresh token to avoid stale data)
  // TODO [SFP-194]: fetch user role from User model
  const role = 'shopper';

  await record.deleteOne();
  const tokens = await issueTokens(userId, role);
  return { ...tokens, userId, role };
}

/**
 * Revokes a refresh token by deleting its server-side record.
 * SFP-166, SFP-195, SFP-202
 */
export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  await TokenRecord.deleteOne({ refreshTokenHash: hash });
}
