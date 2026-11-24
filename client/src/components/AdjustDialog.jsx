import { useState } from 'react';
import { api, messageFrom } from '../api.js';
import FormField from './FormField.jsx';
import { btnPrimary, btnSecondary, inputCls } from '../ui.js';

export default function AdjustDialog({ product, onClose, onSaved }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const n = Number(delta);
  const newQty = Number.isInteger(n) && delta !== '' ? product.quantityOnHand + n : null;

  async function onSubmit(e) {
    e.preventDefault();
    if (!Number.isInteger(n) || n === 0) {
      setError('Enter a whole number other than 0 (for example 5 or -3).');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api(`/products/${product.id}/adjust`, { method: 'POST', body: { delta: n, note } });
      onSaved();
    } catch (err) {
      setError(messageFrom(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={busy ? undefined : onClose}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold">Adjust stock</h2>
          <p className="mt-1 text-sm text-slate-500">{product.name} · {product.quantityOnHand} on hand</p>
        </div>

        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <FormField
          label="Change (+/- units)"
          htmlFor="delta"
          hint={newQty !== null ? `New quantity: ${newQty}` : 'Use a negative number to remove stock'}
        >
          <input id="delta" type="number" step="1" autoFocus className={inputCls} value={delta} onChange={(e) => setDelta(e.target.value)} />
        </FormField>

        <FormField label="Note (optional)" htmlFor="note">
          <input id="note" maxLength={200} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>

        <div className="flex justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Apply'}</button>
        </div>
      </form>
    </div>
  );
}
