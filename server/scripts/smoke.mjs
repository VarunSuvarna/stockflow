// End-to-end smoke test for Phase 1. Needs the server running on localhost:3000.
// Run:  npm run smoke
// Zero dependencies (uses Node's built-in fetch).

const BASE = process.env.API_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function call(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(cookie && { Cookie: cookie }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.()[0]?.split(';')[0];
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 204 etc. */
  }
  return { status: res.status, json, cookie: setCookie };
}

const stamp = Date.now();
const emailA = `a-${stamp}@test.com`;
const emailB = `b-${stamp}@test.com`;
const password = 'password123';

console.log('\nAuth');
let r = await call('/api/health');
check('health endpoint', r.status === 200 && r.json.ok === true);

r = await call('/api/auth/signup', {
  method: 'POST',
  body: { email: emailA, password, organizationName: 'Org A' },
});
check('signup A -> 201', r.status === 201, `got ${r.status}`);
const cookieA = r.cookie;
check('signup sets session cookie', !!cookieA);

r = await call('/api/auth/signup', {
  method: 'POST',
  body: { email: emailB, password, organizationName: 'Org B' },
});
const cookieB = r.cookie;
check('signup B -> 201', r.status === 201);

r = await call('/api/auth/signup', {
  method: 'POST',
  body: { email: emailA, password, organizationName: 'Dup' },
});
check('duplicate email -> 409', r.status === 409, `got ${r.status}`);

r = await call('/api/auth/signup', {
  method: 'POST',
  body: { email: 'bad', password: 'short', organizationName: '' },
});
check('invalid signup -> 400', r.status === 400);

r = await call('/api/auth/login', { method: 'POST', body: { email: emailA, password: 'wrongpass1' } });
check('wrong password -> 401', r.status === 401);

r = await call('/api/auth/login', { method: 'POST', body: { email: emailA, password } });
check('login -> 200', r.status === 200 && !!r.cookie);

r = await call('/api/auth/me', { cookie: cookieA });
check('/me returns the user and org', r.status === 200 && r.json.user.email === emailA);

r = await call('/api/products');
check('products without login -> 401', r.status === 401);

console.log('\nProducts (Org A)');
r = await call('/api/products', {
  method: 'POST',
  cookie: cookieA,
  body: { name: 'Widget', sku: 'SKU-1', quantityOnHand: 2, sellingPrice: '9.99', lowStockThreshold: '' },
});
check('create product -> 201', r.status === 201, JSON.stringify(r.json));
const productId = r.json?.product?.id;
check('blank threshold stored as null, falls back to org default', r.json?.product?.lowStockThreshold === null && r.json?.product?.effectiveThreshold === 5);
check('qty 2 <= default 5 -> isLowStock', r.json?.product?.isLowStock === true);

r = await call('/api/products', { method: 'POST', cookie: cookieA, body: { name: 'Other', sku: 'SKU-1' } });
check('duplicate SKU in same org -> 409', r.status === 409, `got ${r.status}`);

r = await call('/api/products', { method: 'POST', cookie: cookieA, body: { name: '', sku: 'X', quantityOnHand: -1 } });
check('empty name / negative qty -> 400', r.status === 400);

r = await call('/api/products', { method: 'POST', cookie: cookieB, body: { name: 'Widget', sku: 'SKU-1', quantityOnHand: 50 } });
check('same SKU in a DIFFERENT org is allowed -> 201', r.status === 201, `got ${r.status}`);

r = await call('/api/products', { cookie: cookieA });
check('Org A list contains only its own product', r.json.products.length === 1 && r.json.products[0].id === productId);

r = await call('/api/products?search=widg', { cookie: cookieA });
check('search by name', r.json.products.length === 1);
r = await call('/api/products?search=nomatch', { cookie: cookieA });
check('search with no match -> empty', r.json.products.length === 0);

console.log('\nTenant isolation (Org B attacking Org A product)');
r = await call(`/api/products/${productId}`, { cookie: cookieB });
check('B cannot GET A product -> 404', r.status === 404, `got ${r.status}`);
r = await call(`/api/products/${productId}`, {
  method: 'PUT', cookie: cookieB, body: { name: 'Hacked', sku: 'SKU-1', quantityOnHand: 0 },
});
check('B cannot PUT A product -> 404', r.status === 404, `got ${r.status}`);
r = await call(`/api/products/${productId}/adjust`, { method: 'POST', cookie: cookieB, body: { delta: 100 } });
check('B cannot adjust A product -> 404', r.status === 404, `got ${r.status}`);
r = await call(`/api/products/${productId}`, { method: 'DELETE', cookie: cookieB });
check('B cannot DELETE A product -> 404', r.status === 404, `got ${r.status}`);
r = await call(`/api/products/${productId}`, { cookie: cookieA });
check('A product is untouched', r.status === 200 && r.json.product.name === 'Widget' && r.json.product.quantityOnHand === 2);

console.log('\nUpdate, adjust, delete (Org A)');
r = await call(`/api/products/${productId}`, {
  method: 'PUT', cookie: cookieA, body: { name: 'Widget v2', sku: 'SKU-1', quantityOnHand: 20, lowStockThreshold: 3 },
});
check('update -> 200', r.status === 200 && r.json.product.name === 'Widget v2');
check('qty 20 > threshold 3 -> not low stock', r.json.product.isLowStock === false);

r = await call(`/api/products/${productId}/adjust`, { method: 'POST', cookie: cookieA, body: { delta: -17, note: 'sold' } });
check('adjust -17 -> qty 3', r.status === 200 && r.json.product.quantityOnHand === 3);
check('qty 3 <= threshold 3 -> low stock', r.json.product.isLowStock === true);

r = await call(`/api/products/${productId}/adjust`, { method: 'POST', cookie: cookieA, body: { delta: -10 } });
check('adjust below zero -> 400', r.status === 400, `got ${r.status}`);

r = await call(`/api/products/${productId}`, { method: 'DELETE', cookie: cookieA });
check('delete -> 204', r.status === 204, `got ${r.status}`);
r = await call(`/api/products/${productId}`, { cookie: cookieA });
check('deleted product -> 404', r.status === 404);

console.log('\nDashboard and settings');
r = await call('/api/dashboard');
check('dashboard without login -> 401', r.status === 401);
r = await call('/api/settings');
check('settings without login -> 401', r.status === 401);

r = await call('/api/dashboard', { cookie: cookieA });
check('empty org dashboard is zeros', r.status === 200 && r.json.totalProducts === 0 && r.json.totalUnits === 0 && r.json.lowStock.length === 0);

for (const p of [
  { name: 'Low default', sku: 'D-1', quantityOnHand: 2 },
  { name: 'Low own threshold', sku: 'D-2', quantityOnHand: 10, lowStockThreshold: 10 },
  { name: 'Healthy', sku: 'D-3', quantityOnHand: 11 },
]) {
  await call('/api/products', { method: 'POST', cookie: cookieA, body: p });
}
r = await call('/api/dashboard', { cookie: cookieA });
check('total products = 3', r.json.totalProducts === 3, JSON.stringify(r.json));
check('total units = 23', r.json.totalUnits === 23);
check('2 low-stock items (default + own threshold, boundary included)', r.json.lowStockCount === 2 && r.json.lowStock.length === 2);
check('low-stock sorted by quantity asc, has the 4 PRD columns',
  r.json.lowStock[0].sku === 'D-1' && r.json.lowStock[0].lowStockThreshold === 5 && r.json.lowStock[1].lowStockThreshold === 10 && 'name' in r.json.lowStock[0] && 'quantityOnHand' in r.json.lowStock[0]);

r = await call('/api/settings', { cookie: cookieA });
check('GET settings -> default 5', r.status === 200 && r.json.defaultLowStockThreshold === 5);
r = await call('/api/settings', { method: 'PUT', cookie: cookieA, body: { defaultLowStockThreshold: -1 } });
check('negative threshold -> 400', r.status === 400);
r = await call('/api/settings', { method: 'PUT', cookie: cookieA, body: { defaultLowStockThreshold: 'abc' } });
check('non-numeric threshold -> 400', r.status === 400);
r = await call('/api/settings', { method: 'PUT', cookie: cookieA, body: { defaultLowStockThreshold: 2.5 } });
check('decimal threshold -> 400', r.status === 400);
r = await call('/api/settings', { method: 'PUT', cookie: cookieA, body: { defaultLowStockThreshold: '20' } });
check('PUT settings (string "20" accepted) -> 20', r.status === 200 && r.json.defaultLowStockThreshold === 20);

r = await call('/api/dashboard', { cookie: cookieA });
check('raising default to 20 adds the qty-11 item (now 3 low)', r.json.lowStockCount === 3);
r = await call('/api/products', { cookie: cookieA });
check('product list isLowStock follows the same setting', r.json.products.filter((p) => p.isLowStock).length === 3);

r = await call('/api/settings', { cookie: cookieB });
check('Org B default threshold unaffected by A change', r.json.defaultLowStockThreshold === 5);
r = await call('/api/dashboard', { cookie: cookieB });
check('Org B dashboard only sees its own data (1 product, 50 units)', r.json.totalProducts === 1 && r.json.totalUnits === 50 && r.json.lowStockCount === 0);

r = await call('/api/auth/logout', { method: 'POST', cookie: cookieA });
check('logout -> 200', r.status === 200);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
