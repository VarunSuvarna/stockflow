import { cardCls } from '../ui.js';

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-indigo-600">StockFlow</div>
          <h1 className="mt-2 text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`${cardCls} p-6`}>{children}</div>
      </div>
    </div>
  );
}
