import rateLimit from 'express-rate-limit';

/**
 * Brute-force protection for the login / OAuth callback endpoints.
 * SFP-189, SFP-218, SFP-223
 *
 * Limits to 10 requests per 15-minute window per IP.
 * Respects X-Forwarded-For when behind a reverse proxy (SFP-190, SFP-219, SFP-224).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Trust the first hop of X-Forwarded-For (set by your reverse proxy)
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  },
  message: { error: 'Too many login attempts. Please try again later.' },
});

/**
 * General API rate limiter — 200 req/min per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
