import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFrom } from '../api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { btnPrimary, cardCls, inputCls } from '../ui.js';

const money = (n) => (n == null ? '—' : Number(n).toFixed(2));

function StockBadge({ product }) {
  if (product.quantityOnHand === 0)
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Out of stock</span>;
  if (product.isLowStock)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800" title={`Low when quantity is ${product.effectiveThreshold} or less`}>Low stock</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (q) => {
    setError('');
    try {
      const data = await api(`/products?search=${encodeURIComponent(q)}`);
      setProducts(data.products);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/products/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      await load(search.trim());
    } catch (err) {
      setError(messageFrom(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link to="/products/new" className={btnPrimary}>+ Add Product</Link>
      </div>

      <div className="mt-6 max-w-sm">
        <input type="search" placeholder="Search by name or SKU…" className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className={`${cardCls} mt-4 overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Selling Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                {search.trim() ? 'No products match your search.' : 'No products yet. Click "Add Product" to create your first one.'}
              </td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                <td className="px-4 py-3 text-right tabular-nums">{p.quantityOnHand}</td>
                <td className="px-4 py-3"><StockBadge product={p} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{money(p.sellingPrice)}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/products/${p.id}/edit`} className="font-medium text-indigo-600 hover:underline">Edit</Link>
                  <button onClick={() => setToDelete(p)} className="ml-4 font-medium text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete product?"
          message={`"${toDelete.name}" (${toDelete.sku}) will be permanently deleted. This cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
