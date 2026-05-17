import crypto from 'crypto';
import { User } from '../models/User';
import { issueTokens } from './tokenService';

export type OAuthProvider = 'github' | 'google';

export interface OAuthProfile {
  id: string;
  email: string;
  displayName?: string;
}

/**
 * PKCE verifier/challenge generation utilities.
 * Used in the frontend OAuth flow.
 * SFP-177, SFP-185, SFP-207
 */
export function generatePKCEPair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return { codeVerifier, codeChallenge };
}

/**
 * Creates or upserts a user from an OAuth profile, then issues JWT + refresh token.
 * SFP-178, SFP-192, SFP-208
 */
export async function handleOAuthSuccess(
  provider: OAuthProvider,
  profile: OAuthProfile
): Promise<{ accessToken: string; refreshToken: string; isNew: boolean }> {
  let user = await User.findOne({ provider, providerId: profile.id });
  let isNew = false;

  if (!user) {
    // Also check if this email already exists under another provider
    user = await User.findOne({ email: profile.email });
    if (user) {
      // Link the new provider to the existing account
      user.provider = provider;
      user.providerId = profile.id;
      await user.save();
    } else {
      user = await User.create({
        email: profile.email,
        provider,
        providerId: profile.id,
        role: 'shopper',
      });
      isNew = true;
    }
  }

  const { accessToken, refreshToken } = await issueTokens(user.id as string, user.role);
  return { accessToken, refreshToken, isNew };
}

/**
 * Returns a safe redirect URL with an error message for failed OAuth flows.
 * SFP-179, SFP-186, SFP-209
 */
export function buildOAuthErrorRedirect(baseUrl: string, reason: string): string {
  const url = new URL('/login', baseUrl);
  url.searchParams.set('error', reason);
  return url.toString();
}
