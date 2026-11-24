// The single source of truth for low-stock logic (used by list now, dashboard next).
// Effective threshold = the product's own threshold, else the org default.

export function effectiveThreshold(product, orgDefault) {
  return product.lowStockThreshold ?? orgDefault;
}

export function isLowStock(product, orgDefault) {
  return product.quantityOnHand <= effectiveThreshold(product, orgDefault);
}

export function withStockStatus(product, orgDefault) {
  return {
    ...product,
    effectiveThreshold: effectiveThreshold(product, orgDefault),
    isLowStock: isLowStock(product, orgDefault),
  };
}
