import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildDashboard } from '../lib/dashboard.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId } = req.user;

    const [org, products] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { defaultLowStockThreshold: true },
      }),
      prisma.product.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, sku: true, quantityOnHand: true, lowStockThreshold: true },
      }),
    ]);

    res.json(buildDashboard(products, org.defaultLowStockThreshold));
  })
);

export default router;
