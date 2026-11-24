import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, messageFrom } from '../api.js';
import FormField from '../components/FormField.jsx';
import { btnPrimary, btnSecondary, cardCls, inputCls } from '../ui.js';

const empty = { name: '', sku: '', description: '', quantityOnHand: '0', costPrice: '', sellingPrice: '', lowStockThreshold: '' };
const str = (v) => (v == null ? '' : String(v));

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api(`/products/${id}`)
      .then(({ product: p }) => {
        if (cancelled) return;
        setForm({ name: p.name, sku: p.sku, description: str(p.description), quantityOnHand: str(p.quantityOnHand), costPrice: str(p.costPrice), sellingPrice: str(p.sellingPrice), lowStockThreshold: str(p.lowStockThreshold) });
      })
      .catch((err) => !cancelled && setFormError(messageFrom(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (f) => errors[f]?.[0];

  async function onSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      await api(isEdit ? `/products/${id}` : '/products', { method: isEdit ? 'PUT' : 'POST', body: form });
      navigate('/products');
    } catch (e2) {
      setErrors(e2.fieldErrors || {});
      if (!e2.fieldErrors || Object.keys(e2.fieldErrors).length === 0) setFormError(messageFrom(e2));
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      <form onSubmit={onSubmit} className={`${cardCls} mt-6 space-y-5 p-6`}>
        {formError && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Name *" htmlFor="name" error={err('name')}>
            <input id="name" required className={inputCls} value={form.name} onChange={set('name')} />
          </FormField>
          <FormField label="SKU *" htmlFor="sku" hint="Unique within your organization" error={err('sku')}>
            <input id="sku" required className={inputCls} value={form.sku} onChange={set('sku')} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="description" error={err('description')}>
          <textarea id="description" rows={3} className={inputCls} value={form.description} onChange={set('description')} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Quantity on hand" htmlFor="qty" error={err('quantityOnHand')}>
            <input id="qty" type="number" min="0" step="1" className={inputCls} value={form.quantityOnHand} onChange={set('quantityOnHand')} />
          </FormField>
          <FormField label="Low stock threshold" htmlFor="threshold" hint="Leave blank to use the default from Settings" error={err('lowStockThreshold')}>
            <input id="threshold" type="number" min="0" step="1" className={inputCls} value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
          </FormField>
          <FormField label="Cost price" htmlFor="cost" error={err('costPrice')}>
            <input id="cost" type="number" min="0" step="0.01" className={inputCls} value={form.costPrice} onChange={set('costPrice')} />
          </FormField>
          <FormField label="Selling price" htmlFor="price" error={err('sellingPrice')}>
            <input id="price" type="number" min="0" step="0.01" className={inputCls} value={form.sellingPrice} onChange={set('sellingPrice')} />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to="/products" className={btnSecondary}>Cancel</Link>
          <button type="submit" className={btnPrimary} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}
