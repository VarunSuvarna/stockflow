import { cardCls } from '../ui.js';

export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className={`${cardCls} mt-6 p-6 text-sm text-slate-500`}>
        The default low-stock threshold setting arrives in Phase 4.
      </div>
    </div>
  );
}
