import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';
import {
  oauthCallback,
  refreshToken,
  logout,
  mfaEnroll,
  mfaVerify,
  mfaValidate,
  mfaReset,
} from '../controllers/authController';

const router = Router();

/**
 * OAuth 2.0 callback — provider exchanges code for tokens.
 * Applies brute-force rate limiting (SFP-189, SFP-218, SFP-223).
 * SFP-135, SFP-145, SFP-151, SFP-177, SFP-185, SFP-207
 */
router.post('/oauth/callback', authRateLimiter, oauthCallback);

/**
 * Rotate refresh token (SFP-165, SFP-194, SFP-201).
 */
router.post('/refresh', refreshToken);

/**
 * Invalidate session / logout (SFP-166, SFP-195, SFP-202).
 */
router.post('/logout', authenticate, logout);

/**
 * MFA enrollment — returns TOTP secret + QR code (SFP-157, SFP-211, SFP-228).
 */
router.post('/mfa/enroll', authenticate, mfaEnroll);

/**
 * MFA activation — verify TOTP code to confirm enrollment (SFP-157, SFP-211, SFP-228).
 */
router.post('/mfa/verify', authenticate, mfaVerify);

/**
 * MFA validation during login (SFP-138, SFP-147, SFP-155).
 */
router.post('/mfa/validate', authRateLimiter, mfaValidate);

/**
 * Admin MFA reset via email verification (SFP-160, SFP-214, SFP-227).
 */
router.post('/mfa/reset', authenticate, mfaReset);

export default router;
