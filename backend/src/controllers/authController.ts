import { Request, Response } from 'express';
import { handleOAuthSuccess, buildOAuthErrorRedirect } from '../services/oauthService';
import { rotateRefreshToken, revokeRefreshToken } from '../services/tokenService';
import {
  enrollMFA,
  verifyAndActivateMFA,
  validateBackupCode,
  issueTrustedDeviceToken,
  isTrustedDevice,
  initiateAdminMFAReset,
} from '../services/mfaService';
import { authenticator } from 'otplib';
import { User } from '../models/User';

const REFRESH_COOKIE = 'sf_refresh';
const TRUSTED_DEVICE_COOKIE = 'sf_trusted';

/**
 * POST /api/auth/oauth/callback
 * Handles the OAuth authorization code exchange.
 * Returns JWT access token in body, refresh token as HTTP-only cookie.
 * SFP-135, SFP-145, SFP-151, SFP-177, SFP-178, SFP-185, SFP-192, SFP-207, SFP-208
 */
export async function oauthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { provider, profile } = req.body as {
      provider: 'github' | 'google';
      profile: { id: string; email: string };
    };

    if (!provider || !profile?.email) {
      res.status(400).json({ error: 'provider and profile.email are required' });
      return;
    }

    const { accessToken, refreshToken } = await handleOAuthSuccess(provider, profile);

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (err) {
    const redirectUrl = buildOAuthErrorRedirect(
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
      'oauth_failed'
    );
    // SFP-179, SFP-186, SFP-209 — redirect with error param
    res.status(302).redirect(redirectUrl);
  }
}

/**
 * POST /api/auth/refresh
 * Rotates refresh token and returns new access token.
 * SFP-165, SFP-194, SFP-201
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const { accessToken, refreshToken: newRefresh } = await rotateRefreshToken(raw);

    res.cookie(REFRESH_COOKIE, newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch {
    // Clear the stale cookie and redirect to login (SFP-165, SFP-194)
    res.clearCookie(REFRESH_COOKIE);
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

/**
 * POST /api/auth/logout
 * Invalidates the refresh token hash and clears cookies atomically.
 * SFP-166, SFP-195, SFP-202
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) {
    await revokeRefreshToken(raw);
  }
  res.clearCookie(REFRESH_COOKIE);
  res.clearCookie(TRUSTED_DEVICE_COOKIE);
  res.json({ message: 'Logged out successfully' });
}

/**
 * POST /api/auth/mfa/enroll
 * Returns TOTP secret and QR code data URL.
 * SFP-157, SFP-211, SFP-228
 */
export async function mfaEnroll(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { otpauthUrl, qrDataUrl } = await enrollMFA(userId);
  res.json({ otpauthUrl, qrDataUrl });
}

/**
 * POST /api/auth/mfa/verify
 * Confirms TOTP enrollment and activates MFA.
 * Returns backup codes.
 * SFP-157, SFP-211, SFP-228
 */
export async function mfaVerify(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token: string };
  await verifyAndActivateMFA(req.user!.sub, token);
  const user = await User.findById(req.user!.sub).lean();
  res.json({ backupCodes: user?.mfaBackupCodes ?? [] });
}

/**
 * POST /api/auth/mfa/validate
 * Called during login when MFA is required.
 * Supports TOTP codes and single-use backup codes.
 * Issues trusted-device cookie if requested.
 * SFP-138, SFP-147, SFP-155, SFP-158, SFP-159, SFP-212, SFP-213, SFP-229
 */
export async function mfaValidate(req: Request, res: Response): Promise<void> {
  const { userId, token, trustDevice } = req.body as {
    userId: string;
    token: string;
    trustDevice?: boolean;
  };

  const user = await User.findById(userId);
  if (!user?.mfaEnabled || !user.mfaSecret) {
    res.status(400).json({ error: 'MFA not enabled for this account' });
    return;
  }

  // Check trusted device bypass (SFP-159, SFP-213, SFP-226)
  const deviceToken = req.cookies?.[TRUSTED_DEVICE_COOKIE];
  if (deviceToken && (await isTrustedDevice(userId, deviceToken))) {
    res.json({ mfaSkipped: true });
    return;
  }

  const isValidTotp = authenticator.verify({ token, secret: user.mfaSecret });
  const isValidBackup = !isValidTotp && (await validateBackupCode(userId, token));

  if (!isValidTotp && !isValidBackup) {
    res.status(401).json({ error: 'Invalid MFA code' });
    return;
  }

  if (trustDevice) {
    const newDeviceToken = await issueTrustedDeviceToken(userId);
    res.cookie(TRUSTED_DEVICE_COOKIE, newDeviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  res.json({ mfaValid: true });
}

/**
 * POST /api/auth/mfa/reset
 * Initiates admin MFA reset by sending an email verification link.
 * SFP-160, SFP-214, SFP-227
 */
export async function mfaReset(req: Request, res: Response): Promise<void> {
  const { resetToken } = await initiateAdminMFAReset(req.user!.sub);
  // Don't return the reset token to the client — it's sent via email
  void resetToken;
  res.json({ message: 'MFA reset email sent' });
}
