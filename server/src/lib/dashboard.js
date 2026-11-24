import { withStockStatus } from './threshold.js';

// Pure function (no database access) so it is easy to test.
export function buildDashboard(products, orgDefault) {
  const lowStock = products
    .map((p) => withStockStatus(p, orgDefault))
    .filter((p) => p.isLowStock)
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand || a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantityOnHand: p.quantityOnHand,
      lowStockThreshold: p.effectiveThreshold,
    }));

  return {
    totalProducts: products.length,
    totalUnits: products.reduce((sum, p) => sum + p.quantityOnHand, 0),
    lowStockCount: lowStock.length,
    lowStock,
  };
}
