// Creates a demo account with sample products so the demo is never empty.
// Run:  npm run db:seed        (safe to re-run: it rebuilds the demo org each time)
//
// Login:  demo@stockflow.test  /  demo12345

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@stockflow.test';
const DEMO_PASSWORD = 'demo12345';

// threshold: null  -> uses the org default (5)
const products = [
  { name: 'Cotton T-Shirt',       sku: 'TSH-001', quantityOnHand: 120, costPrice: 4.5,  sellingPrice: 12.99, lowStockThreshold: null },
  { name: 'Denim Jeans',          sku: 'JNS-001', quantityOnHand: 45,  costPrice: 15,   sellingPrice: 39.99, lowStockThreshold: 10 },
  { name: 'Canvas Tote Bag',      sku: 'BAG-001', quantityOnHand: 3,   costPrice: 2.2,  sellingPrice: 9.5,   lowStockThreshold: null },
  { name: 'Stainless Bottle',     sku: 'BTL-001', quantityOnHand: 8,   costPrice: 6,    sellingPrice: 18,    lowStockThreshold: 10 },
  { name: 'Wireless Mouse',       sku: 'MSE-001', quantityOnHand: 0,   costPrice: 7,    sellingPrice: 19.99, lowStockThreshold: null },
  { name: 'USB-C Cable 1m',       sku: 'CBL-001', quantityOnHand: 60,  costPrice: 1.1,  sellingPrice: 6.99,  lowStockThreshold: 15 },
  { name: 'Notebook A5',          sku: 'NTB-001', quantityOnHand: 5,   costPrice: 0.9,  sellingPrice: 3.5,   lowStockThreshold: null },
  { name: 'Ballpoint Pen (Blue)', sku: 'PEN-001', quantityOnHand: 200, costPrice: 0.15, sellingPrice: 0.99,  lowStockThreshold: 50 },
  { name: 'Desk Lamp',            sku: 'LMP-001', quantityOnHand: 14,  costPrice: 9,    sellingPrice: 24.99, lowStockThreshold: null },
  { name: 'Phone Stand',          sku: 'STD-001', quantityOnHand: 22,  costPrice: 3,    sellingPrice: 11.99, lowStockThreshold: 20 },
];

async function main() {
  await prisma.organization.deleteMany({ where: { users: { some: { email: DEMO_EMAIL } } } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const org = await prisma.organization.create({
    data: {
      name: 'Demo Store',
      defaultLowStockThreshold: 5,
      users: { create: { email: DEMO_EMAIL, passwordHash } },
    },
    include: { users: true },
  });

  await prisma.product.createMany({
    data: products.map((p) => ({
      ...p,
      organizationId: org.id,
      lastUpdatedBy: org.users[0].id,
    })),
  });

  console.log(`Seeded "${org.name}" with ${products.length} products.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
