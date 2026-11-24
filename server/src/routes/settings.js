import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const settingsSchema = z.object({
  defaultLowStockThreshold: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z
      .number({ invalid_type_error: 'Must be a number', required_error: 'Required' })
      .int('Must be a whole number')
      .min(0, 'Must be 0 or more')
      .max(1000000)
  ),
});

// GET /api/settings
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.orgId },
      select: { defaultLowStockThreshold: true },
    });
    res.json({ defaultLowStockThreshold: org.defaultLowStockThreshold });
  })
);

// PUT /api/settings   body: { defaultLowStockThreshold: 10 }
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { defaultLowStockThreshold } = settingsSchema.parse(req.body);

    const org = await prisma.organization.update({
      where: { id: req.user.orgId },
      data: { defaultLowStockThreshold },
      select: { defaultLowStockThreshold: true },
    });
    res.json({ defaultLowStockThreshold: org.defaultLowStockThreshold });
  })
);

export default router;
