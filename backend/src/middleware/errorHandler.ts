import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino();

/**
 * Central error handler.
 * IMPORTANT: never log session tokens or include them in error responses.
 * SFP-167, SFP-196, SFP-203
 */
export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Sanitize — strip any token-shaped values from the message before logging
  const safeMessage = (err.message ?? 'Internal error').replace(
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    '[REDACTED_JWT]'
  );

  logger.error({ err: { message: safeMessage, stack: err.stack } }, 'Unhandled error');

  const status = err.status ?? 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : safeMessage });
}
