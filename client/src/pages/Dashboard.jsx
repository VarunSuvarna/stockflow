import { cardCls } from '../ui.js';

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className={`${cardCls} mt-6 p-6 text-sm text-slate-500`}>
        Summary cards and the low-stock list arrive in Phase 4. For now, head to Products.
      </div>
    </div>
  );
}
