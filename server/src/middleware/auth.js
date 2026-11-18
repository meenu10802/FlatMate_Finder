import { TOKEN_COOKIE, verifyToken } from '../services/authService.js';
import { HttpError } from './errorHandler.js';

/** Requires a valid JWT cookie; sets req.userId. */
export function requireAuth(req, res, next) {
  const userId = verifyToken(req.cookies?.[TOKEN_COOKIE]);
  if (!userId) return next(new HttpError(401, 'UNAUTHENTICATED', 'Please log in'));
  req.userId = userId;
  next();
}
