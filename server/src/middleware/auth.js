import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// Verifies the session cookie and attaches { userId, orgId } to the request.
// orgId ALWAYS comes from here, never from the request body or URL.
export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { userId: payload.userId, orgId: payload.orgId };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
