import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFrom } from '../api.js';
import { cardCls } from '../ui.js';

function StatCard({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className={`${cardCls} p-5`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/dashboard')
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(messageFrom(err)));
    return () => { cancelled = true; };
  }, []);

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
    </div>
  );
  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total products" value={data.totalProducts} />
        <StatCard label="Total units on hand" value={data.totalUnits} />
        <StatCard label="Low-stock items" value={data.lowStockCount} tone={data.lowStockCount > 0 ? 'text-amber-600' : 'text-green-600'} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Low stock items</h2>
      <p className="mt-1 text-sm text-slate-500">
        Products at or below their low-stock threshold. Change the default in{' '}
        <Link to="/settings" className="text-indigo-600 hover:underline">Settings</Link>.
      </p>

      <div className={`${cardCls} mt-4 overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Quantity on hand</th>
              <th className="px-4 py-3 text-right">Low stock threshold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.lowStock.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {data.totalProducts === 0 ? 'No products yet. Add one on the Products page.' : 'All products are above their low-stock thresholds.'}
                </td>
              </tr>
            )}
            {data.lowStock.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <Link to={`/products/${p.id}/edit`} className="hover:text-indigo-600 hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                <td className={`px-4 py-3 text-right font-medium tabular-nums ${p.quantityOnHand === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {p.quantityOnHand}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.lowStockThreshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
