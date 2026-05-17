import api from './client';

/**
 * Initiates OAuth login by redirecting to the provider.
 * Uses PKCE flow (SFP-185, SFP-207, SFP-177).
 */
export function initiateOAuthLogin(provider: 'github' | 'google'): void {
  // PKCE verifier generated on backend redirect endpoint
  window.location.href = `/api/auth/oauth/${provider}`;
}

/**
 * Validates TOTP or backup code during login.
 * SFP-138, SFP-147, SFP-155
 */
export async function validateMFA(params: {
  userId: string;
  token: string;
  trustDevice?: boolean;
}): Promise<{ mfaValid: boolean }> {
  const { data } = await api.post('/auth/mfa/validate', params);
  return data;
}

/**
 * Enrolls the authenticated user in TOTP MFA.
 * SFP-157, SFP-211, SFP-228
 */
export async function enrollMFA(): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
  const { data } = await api.post('/auth/mfa/enroll');
  return data;
}

/**
 * Confirms enrollment by verifying the first TOTP code.
 * Returns backup codes.
 * SFP-157, SFP-212, SFP-228, SFP-229
 */
export async function verifyMFAEnrollment(token: string): Promise<{ backupCodes: string[] }> {
  const { data } = await api.post('/auth/mfa/verify', { token });
  return data;
}

/**
 * Logs out and clears session cookies.
 * SFP-166, SFP-195, SFP-202
 */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
