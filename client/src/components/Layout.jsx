import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/products', label: 'Products' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-bold text-indigo-600">StockFlow</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{org?.name}</div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                'block rounded-md px-3 py-2 text-sm font-medium ' +
                (isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="truncate text-xs text-slate-500">{user?.email}</div>
          <button onClick={handleLogout} className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
