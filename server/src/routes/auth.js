import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOptions = {
  httpOnly: true,
  sameSite: config.isProd ? 'none' : 'lax',
  secure: config.isProd,
  maxAge: COOKIE_MAX_AGE_MS,
};

function setSession(res, user) {
  const token = jwt.sign(
    { userId: user.id, orgId: user.organizationId },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, cookieOptions);
}

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().trim().min(1, 'Organization name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/signup
// Creates the Organization and its User in ONE nested write, which Prisma runs
// as a single transaction (both are created, or neither is).
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, organizationName } = signupSchema.parse(req.body);

    const passwordHash = await bcrypt.hash(password, 10);

    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        users: { create: { email, passwordHash } },
      },
      include: { users: true },
    });

    const user = org.users[0];
    setSession(res, user);

    res.status(201).json({
      user: { id: user.id, email: user.email },
      organization: {
        id: org.id,
        name: org.name,
        defaultLowStockThreshold: org.defaultLowStockThreshold,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    // Same message for "no such user" and "wrong password" so emails can't be probed.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    setSession(res, user);

    res.json({
      user: { id: user.id, email: user.email },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        defaultLowStockThreshold: user.organization.defaultLowStockThreshold,
      },
    });
  })
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me  (the frontend calls this on load to restore the session)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    res.json({
      user: { id: user.id, email: user.email },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        defaultLowStockThreshold: user.organization.defaultLowStockThreshold,
      },
    });
  })
);

export default router;
