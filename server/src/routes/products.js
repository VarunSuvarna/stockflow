import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { withStockStatus } from '../lib/threshold.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Every route below requires login, and every query below is scoped by
// req.user.orgId (taken from the verified JWT) -- this is the tenant isolation.
router.use(requireAuth);

// ---- validation helpers -------------------------------------------------

// Form inputs arrive as "" or strings; normalise to null / number before validating.
const toNumberOrNull = (v) => (v === '' || v == null ? null : typeof v === 'string' ? Number(v) : v);

const optionalMoney = z.preprocess(toNumberOrNull, z.number().min(0, 'Must be 0 or more').nullable());
const optionalInt = z.preprocess(
  toNumberOrNull,
  z.number().int('Must be a whole number').min(0, 'Must be 0 or more').nullable()
);
const quantity = z.preprocess(
  (v) => (v === '' || v == null ? 0 : typeof v === 'string' ? Number(v) : v),
  z.number().int('Must be a whole number').min(0, 'Cannot be negative')
);

const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  description: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().trim().max(1000).nullable().optional()
  ),
  quantityOnHand: quantity,
  costPrice: optionalMoney,
  sellingPrice: optionalMoney,
  lowStockThreshold: optionalInt,
});

const adjustSchema = z.object({
  delta: z.number().int('Must be a whole number').refine((n) => n !== 0, 'Cannot be 0'),
  // MVP has no movement history, so the note is validated but not stored.
  note: z.string().trim().max(200).optional(),
});

// ---- helpers --------------------------------------------------------------

async function getOrgDefault(orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { defaultLowStockThreshold: true },
  });
  return org.defaultLowStockThreshold;
}

// ---- routes ---------------------------------------------------------------

// GET /api/products?search=abc
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId } = req.user;
    const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    // NOTE: SQLite's `contains` is case-insensitive for ASCII. If you move to
    // PostgreSQL, add `mode: 'insensitive'` to each condition.
    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        ...(q && { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }),
      },
      orderBy: { name: 'asc' },
    });

    const orgDefault = await getOrgDefault(orgId);
    res.json({ products: products.map((p) => withStockStatus(p, orgDefault)) });
  })
);

// POST /api/products
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.user;
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: { ...data, organizationId: orgId, lastUpdatedBy: userId },
    });

    const orgDefault = await getOrgDefault(orgId);
    res.status(201).json({ product: withStockStatus(product, orgDefault) });
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.user;
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const orgDefault = await getOrgDefault(orgId);
    res.json({ product: withStockStatus(product, orgDefault) });
  })
);

// PUT /api/products/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.user;
    const data = productSchema.parse(req.body);

    // updateMany with { id, organizationId } means another org's product can
    // never match, even if someone guesses its id. (A bare update({where:{id}})
    // would NOT be safe.)
    const result = await prisma.product.updateMany({
      where: { id: req.params.id, organizationId: orgId },
      data: { ...data, lastUpdatedBy: userId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    const orgDefault = await getOrgDefault(orgId);
    res.json({ product: withStockStatus(product, orgDefault) });
  })
);

// DELETE /api/products/:id  (hard delete, allowed by the PRD for the MVP)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await prisma.product.deleteMany({
      where: { id: req.params.id, organizationId: req.user.orgId },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  })
);

// POST /api/products/:id/adjust   body: { delta: 5 | -3, note?: "..." }
router.post(
  '/:id/adjust',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.user;
    const { delta } = adjustSchema.parse(req.body);

    // Single atomic statement: only applies if the result would stay >= 0.
    // (quantity + delta >= 0  <=>  quantity >= -delta)
    const result = await prisma.product.updateMany({
      where: {
        id: req.params.id,
        organizationId: orgId,
        quantityOnHand: { gte: -delta },
      },
      data: { quantityOnHand: { increment: delta }, lastUpdatedBy: userId },
    });

    const product = await prisma.product.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (result.count === 0) {
      return res.status(400).json({
        error: 'Insufficient stock',
        details: { delta: [`Only ${product.quantityOnHand} units on hand`] },
      });
    }

    const orgDefault = await getOrgDefault(orgId);
    res.json({ product: withStockStatus(product, orgDefault) });
  })
);

export default router;
