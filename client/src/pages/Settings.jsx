import { useEffect, useState } from 'react';
import { api, messageFrom } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { btnPrimary, cardCls, inputCls } from '../ui.js';

export default function Settings() {
  const { setOrg } = useAuth();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api('/settings')
      .then((s) => !cancelled && setValue(String(s.defaultLowStockThreshold)))
      .catch((err) => !cancelled && setError(messageFrom(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldError('');
    setSaved(false);
    setSaving(true);
    try {
      const s = await api('/settings', { method: 'PUT', body: { defaultLowStockThreshold: value } });
      setValue(String(s.defaultLowStockThreshold));
      setOrg((o) => (o ? { ...o, defaultLowStockThreshold: s.defaultLowStockThreshold } : o));
      setSaved(true);
    } catch (err) {
      const msg = err.fieldErrors?.defaultLowStockThreshold?.[0];
      if (msg) setFieldError(msg);
      else setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <form onSubmit={onSubmit} className={`${cardCls} mt-6 space-y-5 p-6`}>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {saved && <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved.</div>}

        <FormField
          label="Default low stock threshold"
          htmlFor="threshold"
          hint="Used for any product that doesn't have its own threshold. A product is low stock when its quantity is at or below this number."
          error={fieldError}
        >
          <input
            id="threshold"
            type="number"
            min="0"
            step="1"
            required
            className={inputCls}
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          />
        </FormField>

        <div className="flex justify-end">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
