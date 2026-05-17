import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Validates the JWT access token from the Authorization header.
 * Does NOT accept tokens from cookies to prevent CSRF.
 * SFP-135, SFP-145, SFP-151
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_ACCESS_SECRET ?? '';
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

/**
 * Guards merchant-only routes.
 * SFP-139, SFP-144, SFP-149
 */
export function requireMerchant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Merchant access required' });
    return;
  }
  next();
}
