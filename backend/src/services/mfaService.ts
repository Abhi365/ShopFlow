import { authenticator } from 'otplib';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { User } from '../models/User';

const BACKUP_CODE_COUNT = 8;
const TRUSTED_DEVICE_TTL_DAYS = 30;

/**
 * Generates a new TOTP secret and returns the otpauth URI + QR code.
 * RFC 6238 compliant via otplib.
 * SFP-157, SFP-211, SFP-228
 */
export async function enrollMFA(
  userId: string
): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, 'ShopFlow', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Store secret (not yet active until verified)
  user.mfaSecret = secret;
  await user.save();

  return { secret, otpauthUrl, qrDataUrl };
}

/**
 * Verifies the TOTP token and activates MFA on the account.
 * SFP-157, SFP-211, SFP-228
 */
export async function verifyAndActivateMFA(userId: string, token: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user?.mfaSecret) throw new Error('MFA enrollment not started');

  const isValid = authenticator.verify({ token, secret: user.mfaSecret });
  if (!isValid) throw Object.assign(new Error('Invalid TOTP code'), { status: 400 });

  user.mfaEnabled = true;
  user.mfaBackupCodes = generateBackupCodes();
  await user.save();
}

/**
 * Generates 8 single-use backup codes.
 * SFP-158, SFP-212, SFP-229
 */
function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString('hex').toUpperCase()
  );
}

/**
 * Validates a backup code (single-use — removes it after verification).
 * SFP-158, SFP-212, SFP-229
 */
export async function validateBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user) return false;

  const idx = user.mfaBackupCodes.indexOf(code.toUpperCase());
  if (idx === -1) return false;

  user.mfaBackupCodes.splice(idx, 1);
  await user.save();
  return true;
}

/**
 * Issues a 30-day trusted-device token stored as an HTTP-only cookie.
 * SFP-159, SFP-213, SFP-226
 */
export async function issueTrustedDeviceToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000);
  user.trustedDevices.push({ token, expiresAt });
  await user.save();
  return token;
}

/**
 * Checks if a device token is still valid.
 * SFP-159, SFP-213, SFP-226
 */
export async function isTrustedDevice(userId: string, deviceToken: string): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user) return false;
  const now = new Date();
  return user.trustedDevices.some(
    (d) => d.token === deviceToken && d.expiresAt > now
  );
}

/**
 * Initiates MFA reset by sending a verification email.
 * SFP-160, SFP-214, SFP-227
 */
export async function initiateAdminMFAReset(userId: string): Promise<{ resetToken: string }> {
  // TODO [SFP-160]: send email via SendGrid with reset link
  const resetToken = crypto.randomBytes(32).toString('hex');
  return { resetToken };
}
